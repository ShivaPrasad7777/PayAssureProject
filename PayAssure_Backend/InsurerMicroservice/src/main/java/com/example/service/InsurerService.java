package com.example.service;

import com.example.dto.CustomerSummary;
import com.example.dto.PolicySummary;
import com.example.model.Customer;
import com.example.model.Invoice;
import com.example.model.Notification;
import com.example.model.Payment;
import com.example.model.Policy;
import com.example.model.TaxRate;
import com.example.repository.CustomerRepository;
import com.example.repository.InvoiceRepository;
import com.example.repository.NotificationRepository;
import com.example.repository.PaymentRepository;
import com.example.repository.PolicyRepository;
import com.example.repository.TaxRateRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.PaymentLink;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.Calendar;
import java.util.stream.Collectors;

@Service
public class InsurerService {

    private static final Logger log = LoggerFactory.getLogger(InsurerService.class);

    // Repositories for DB interactions
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private PolicyRepository policyRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private TaxRateRepository taxRateRepository;

    // Razorpay client for payment integration
    private final RazorpayClient razorpayClient;

    // Constructor initializes Razorpay client with keys from config
    public InsurerService(
            @Value("${razorpay.key-id}") String keyId,
            @Value("${razorpay.key-secret}") String keySecret) throws RazorpayException {
        this.razorpayClient = new RazorpayClient(keyId, keySecret);
    }

    /**
     * Create invoice for a customer with multiple policies.
     * - Validates customer and policies.
     * - Skips policies which are still valid (not expired).
     * - Calculates total premium including GST taxes.
     * - Creates Razorpay order and payment link.
     * - Saves invoice and updates customer's payment history.
     */
    public Invoice createInvoice(String customerId, List<String> policyIds, String insurerId, Date dueDate, int months) throws RazorpayException {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        Date currentDate = new Date();
        List<String> validPolicyIds = new ArrayList<>();
        List<Invoice.TaxDetails> taxDetailsList = new ArrayList<>();
        double totalAmount = 0.0;

        for (String policyId : policyIds) {
            Policy policy = policyRepository.findById(policyId)
                    .orElseThrow(() -> new RuntimeException("Policy not found"));

            // Check if policy is already valid (not expired)
            Optional<Customer.PaymentHistoryEntry> historyEntry = customer.getPaymentHistory().stream()
                    .filter(entry -> entry.getPolicyId().equals(policyId))
                    .findFirst();

            if (historyEntry.isPresent()) {
                Customer.PaymentHistoryEntry entry = historyEntry.get();
                if (!currentDate.after(entry.getValidUpto())) {
                    // Skip policies that are not expired yet
                    log.warn("Skipping policy {}: Valid until {}", policyId, entry.getValidUpto());
                    continue;
                }
            } else {
                log.info("No payment history for policy {}; including in invoice", policyId);
            }

            // Fetch applicable tax rate for policy type
            String taxRateId = policy.getPolicyType();
            TaxRate taxRate = taxRateRepository.findById(taxRateId)
                    .orElseThrow(() -> new RuntimeException("TaxRate not found for ID: " + taxRateId));

            // Calculate base premium * months + GST tax
            double baseAmount = policy.getMonthlyPremium() * months;
            double gstAmount = baseAmount * taxRate.getGstRate();
            double policyTotal = baseAmount + gstAmount;

            // Add policy's tax details for transparency
            Invoice.TaxDetails taxDetails = new Invoice.TaxDetails();
            taxDetails.setPolicyId(policyId);
            taxDetails.setGstRate(taxRate.getGstRate());
            taxDetails.setTaxAmount(gstAmount);
            taxDetails.setTotalAmount(policyTotal);
            taxDetailsList.add(taxDetails);

            totalAmount += policyTotal;
            validPolicyIds.add(policyId);
        }

        if (validPolicyIds.isEmpty()) {
            throw new RuntimeException("No valid policies to generate invoice");
        }

        // Create Razorpay order for payment
        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", (int) (totalAmount * 100)); // paise
        orderRequest.put("currency", "INR");
        orderRequest.put("receipt", "receipt_multi_" + customerId);
        Order razorpayOrder = razorpayClient.orders.create(orderRequest);
        String generatedOrderId = razorpayOrder.get("id");
        log.info("Generated Razorpay Order ID: {}", generatedOrderId);

        // Create a payment link for the customer (with SMS/email notification)
        JSONObject linkRequest = new JSONObject();
        linkRequest.put("amount", (int) (totalAmount * 100));
        linkRequest.put("currency", "INR");
        linkRequest.put("accept_partial", false);
        linkRequest.put("reference_id", customerId + "_" + System.currentTimeMillis());
        linkRequest.put("description", "Payment for multiple policies");
        linkRequest.put("customer", new JSONObject()
                .put("name", customer.getName())
                .put("email", customer.getEmail())
                .put("contact", customer.getPhone()));
        linkRequest.put("notify", new JSONObject().put("sms", true).put("email", true));
        linkRequest.put("reminder_enable", true);
        linkRequest.put("notes", new JSONObject()
                .put("customerId", customerId)
                .put("order_id", generatedOrderId));
        PaymentLink paymentLink = razorpayClient.paymentLink.create(linkRequest);
        String linkUrl = paymentLink.get("short_url");
        log.info("Generated Payment Link: {}", linkUrl);

        // Assemble invoice entity with all details and save
        Invoice invoice = new Invoice();
        invoice.setCustomerId(customerId);
        invoice.setInsurerId(insurerId);
        invoice.setPolicyIds(validPolicyIds);
        invoice.setAmount(totalAmount);
        invoice.setStatus("unpaid");
        invoice.setValidUpto(dueDate != null ? dueDate : calculateDueDate(currentDate, months));
        invoice.setRazorpayOrderId(generatedOrderId);
        invoice.setCreatedAt(new Date());
        invoice.setPaymentLink(linkUrl);
        invoice.setMonths(months);
        invoice.setTaxDetailsList(taxDetailsList);

        Invoice savedInvoice = invoiceRepository.save(invoice);
        log.info("Saved invoice ID: {} with razorpayOrderId: {}", savedInvoice.getId(), generatedOrderId);

        // Update each policy's payment history for this customer to mark validity expiry accordingly
        for (String policyId : validPolicyIds) {
            updatePaymentHistory(customer, policyId, savedInvoice.getValidUpto());
        }
        customerRepository.save(customer);

        return savedInvoice;
    }

    /**
     * Helper: Calculate the due date by adding given months to the current date.
     */
    private Date calculateDueDate(Date currentDate, int months) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(currentDate);
        cal.add(Calendar.MONTH, months);
        return cal.getTime();
    }

    /**
     * Helper: Update or create payment history entry for a customer's policy with new validUntil date.
     */
    private void updatePaymentHistory(Customer customer, String policyId, Date newValidUpto) {
        Optional<Customer.PaymentHistoryEntry> historyEntry = customer.getPaymentHistory().stream()
                .filter(entry -> entry.getPolicyId().equals(policyId))
                .findFirst();

        if (historyEntry.isPresent()) {
            Customer.PaymentHistoryEntry entry = historyEntry.get();
            entry.setStatus("pending invoice");
            entry.setValidUpto(newValidUpto);
        } else {
            Customer.PaymentHistoryEntry newEntry = new Customer.PaymentHistoryEntry();
            newEntry.setPolicyId(policyId);
            newEntry.setStatus("pending invoice");
            newEntry.setValidUpto(newValidUpto);
            customer.getPaymentHistory().add(newEntry);
        }
    }

    /**
     * Update invoice status as "paid", record payment, and send notification.
     * Called after payment confirmation from Razorpay webhook.
     */
    public void verifyPayment(String razorpayPaymentId, String razorpayOrderId, String status) {
        try {
            Optional<Invoice> optionalInvoice = invoiceRepository.findByRazorpayOrderId(razorpayOrderId);
            Invoice invoice = optionalInvoice.orElseThrow(() -> new RuntimeException("Invoice not found"));

            log.info("Invoice loaded with policyIds: {}", invoice.getPolicyIds());

            // Mark invoice as paid
            invoice.setStatus("paid");
            invoiceRepository.save(invoice);

            // Create payment record
            Payment payment = new Payment();
            payment.setInvoiceId(invoice.getId());
            payment.setCustomerId(invoice.getCustomerId());
            payment.setInsurerId(invoice.getInsurerId());
            payment.setAmount(invoice.getAmount());
            payment.setStatus(status);
            payment.setRazorpayPaymentId(razorpayPaymentId);
            payment.setMethod("razorpay");
            payment.setIsAutoPay(false);
            payment.setPaidAt(new Date());

            // Attach policy names to payment for reporting
            List<String> policyIds = invoice.getPolicyIds();
            if (policyIds != null && !policyIds.isEmpty()) {
                payment.setPolicyIds(policyIds);
                List<String> policyNames = policyRepository.findAllById(policyIds)
                        .stream()
                        .map(Policy::getName)
                        .collect(Collectors.toList());
                log.info("Policy Names: {}", policyNames);
                payment.setPolicyNames(policyNames);
            } else {
                log.warn("No policy IDs found for invoice: {}", invoice.getId());
            }

            paymentRepository.save(payment);
            log.info("Saved payment with ID: {} and policies: {}", payment.getId(), payment.getPolicyIds());

            sendNotification(invoice.getId(), invoice.getCustomerId(), invoice.getInsurerId());
        } catch (Exception e) {
            log.error("Payment verification failed", e);
            throw new RuntimeException("Payment verification failed: " + e.getMessage());
        }
    }

    /**
     * Create and save a notification about successful payment.
     * Future: integrate with email, SMS providers like Twilio or SendGrid.
     */
    private void sendNotification(String invoiceId, String customerId, String insurerId) {
        Notification notification = new Notification();
        notification.setCustomerId(customerId);
        notification.setInvoiceId(invoiceId);
        notification.setInsurerId(insurerId);
        notification.setType("email");
        notification.setMessage("Payment successful for invoice " + invoiceId);
        notificationRepository.save(notification);
        // TODO: Integrate external notification services for actual delivery
    }

    /**
     * Retrieve customers who have any payment history entries that are expired (unpaid).
     */
    public List<CustomerSummary> getUnpaidCustomers() {
        Date currentDate = new Date();
        List<Customer> allCustomers = customerRepository.findAll();
        return allCustomers.stream()
                .filter(customer -> customer.getPaymentHistory().stream()
                        .anyMatch(entry -> currentDate.after(entry.getValidUpto())))
                .map(customer -> new CustomerSummary(customer.getId(), customer.getName()))
                .collect(Collectors.toList());
    }

    /**
     * Retrieve unpaid policies for a specific customer based on expired payment validity.
     */
    public List<PolicySummary> getUnpaidPoliciesForCustomer(String customerId) {
        Date currentDate = new Date();
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        List<String> unpaidPolicyIds = customer.getPaymentHistory().stream()
                .filter(entry -> currentDate.after(entry.getValidUpto()))
                .map(Customer.PaymentHistoryEntry::getPolicyId)
                .collect(Collectors.toList());

        List<Policy> unpaidPolicies = policyRepository.findAllById(unpaidPolicyIds);

        return unpaidPolicies.stream()
                .map(policy -> new PolicySummary(policy.getId(), policy.getName()))
                .collect(Collectors.toList());
    }

    /**
     * Retrieve unpaid or failed invoices for a given customer.
     */
    public List<Invoice> getUnpaidFailedInvoicesForCustomer(String customerId) {
        log.info("Fetching unpaid/failed invoices for customer: {}", customerId);
        return invoiceRepository.findByCustomerIdAndStatusIn(customerId, List.of("unpaid", "failed"));
    }

    /**
     * Process cash payment for multiple invoices by calling processCashPayment on each.
     */
    public void processCashPaymentMultiple(List<String> invoiceIds) {
        log.info("Processing cash payment for multiple invoices: {}", invoiceIds);
        for (String invoiceId : invoiceIds) {
            processCashPayment(invoiceId);
        }
    }

    /**
     * Process a cash payment for a single invoice:
     * - Validates invoice is unpaid,
     * - Marks invoice paidByCash,
     * - Creates payment record with method "cash",
     * - Updates customer's payment history accordingly.
     */
    private void processCashPayment(String invoiceId) {
        log.info("Processing cash payment for invoiceId: {}", invoiceId);

        Optional<Invoice> optionalInvoice = invoiceRepository.findById(invoiceId);
        if (optionalInvoice.isEmpty()) {
            log.error("Invoice not found for ID: {}", invoiceId);
            throw new RuntimeException("Invoice not found");
        }
        Invoice invoice = optionalInvoice.get();

        if (!"unpaid".equals(invoice.getStatus())) {
            log.warn("Invoice {} is not unpaid, status: {}", invoiceId, invoice.getStatus());
            throw new RuntimeException("Invoice is not eligible for payment");
        }

        // Mark invoice as paid by cash
        invoice.setStatus("paidByCash");
        invoiceRepository.save(invoice);
        log.info("Updated invoice {} status to paidByCash", invoiceId);

        // Create payment record for cash payment
        Payment payment = new Payment();
        payment.setInvoiceId(invoice.getId());
        payment.setCustomerId(invoice.getCustomerId());
        payment.setInsurerId(invoice.getInsurerId());
        payment.setAmount(invoice.getAmount());
        payment.setStatus("paidByCash");
        payment.setRazorpayPaymentId(null);  // No electronic payment ID for cash
        payment.setRazorpaySubscriptionId(null);
        payment.setMethod("cash");
        payment.setIsAutoPay(false);
        payment.setPaidAt(new Date());

        // Add tax details copying from invoice if any
        if (!invoice.getTaxDetailsList().isEmpty()) {
            Invoice.TaxDetails invoiceTax = invoice.getTaxDetailsList().get(0);
            Payment.TaxDetails taxDetails = new Payment.TaxDetails();
            taxDetails.setTaxType("GST");
            taxDetails.setTaxRate(invoiceTax.getGstRate());
            taxDetails.setTaxAmount(invoiceTax.getTaxAmount());
            taxDetails.setTotalAmount(invoiceTax.getTotalAmount());
            payment.setTaxDetails(taxDetails);
        }

        payment.setPolicyIds(invoice.getPolicyIds());
        List<String> policyNames = policyRepository.findAllById(invoice.getPolicyIds())
                .stream()
                .map(Policy::getName)
                .collect(Collectors.toList());
        payment.setPolicyNames(policyNames);

        paymentRepository.save(payment);
        log.info("Created payment record for invoice {}", invoiceId);

        // Update payment history for each policy in customer record
        Optional<Customer> optionalCustomer = customerRepository.findById(invoice.getCustomerId());
        if (optionalCustomer.isEmpty()) {
            log.error("Customer not found for ID: {}", invoice.getCustomerId());
            throw new RuntimeException("Customer not found");
        }
        Customer customer = optionalCustomer.get();

        Date paymentDate = new Date();
        for (String policyId : invoice.getPolicyIds()) {
            Optional<Customer.PaymentHistoryEntry> optionalEntry = customer.getPaymentHistory().stream()
                    .filter(entry -> entry.getPolicyId().equals(policyId))
                    .findFirst();

            Customer.PaymentHistoryEntry entry = optionalEntry.orElseGet(() -> {
                Customer.PaymentHistoryEntry newEntry = new Customer.PaymentHistoryEntry();
                newEntry.setPolicyId(policyId);
                customer.getPaymentHistory().add(newEntry);
                log.info("Created new history entry for policy {}", policyId);
                return newEntry;
            });

            entry.setStatus("paidByCash");
            entry.setLastPaidDate(paymentDate);
            Calendar cal = Calendar.getInstance();
            cal.setTime(paymentDate);
            cal.add(Calendar.MONTH, invoice.getMonths());
            entry.setValidUpto(cal.getTime());
            log.info("Updated policy {} validUpto to {}", policyId, entry.getValidUpto());
        }

        customerRepository.save(customer);
        log.info("Updated customer payment history for ID: {}", customer.getId());
    }

    /**
     * Fetch all payment records system-wide sorted by payment date descending.
     */
    public List<Payment> getAllPaymentHistory() {
        log.info("Fetching all payment history system-wide");
        Sort sort = Sort.by(Sort.Direction.DESC, "paidAt");
        return paymentRepository.findAll(sort);
    }

    /**
     * Fetch single customer by ID.
     */
    public Optional<Customer> getCustomerById(String customerId) {
        return customerRepository.findById(customerId);
    }

    /**
     * Fetch single invoice by ID.
     */
    public Optional<Invoice> getInvoiceById(String invoiceId) {
        return invoiceRepository.findById(invoiceId);
    }

    /**
     * Fetch policies by a list of IDs.
     */
    public List<Policy> getPoliciesByIds(List<String> policyIds) {
        return policyRepository.findAllById(policyIds);
    }

    /**
     * Fetch all invoices sorted by creation date descending.
     */
    public List<Invoice> getAllInvoiceHistory() {
        log.info("Fetching all invoice history system-wide");
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        return invoiceRepository.findAll(sort);
    }

    /**
     * Search customers by name (case insensitive, partial match).
     */
    public List<CustomerSummary> searchCustomersByName(String name) {
        log.info("Searching customers with name containing: {}", name);
        List<Customer> matchingCustomers = customerRepository.findByNameContainingIgnoreCase(name);
        return matchingCustomers.stream()
                .map(customer -> new CustomerSummary(customer.getId(), customer.getName()))
                .collect(Collectors.toList());
    }
}














//// BillingService.java
//package com.example.service;
//
//import com.example.dto.CustomerSummary;
//import com.example.dto.PolicySummary;
//import com.example.model.Customer;
//import com.example.model.Invoice;
//import com.example.model.Notification;
//import com.example.model.Payment;
//import com.example.model.Policy;
//import com.example.model.TaxRate;
//import com.example.repository.CustomerRepository;
//import com.example.repository.InvoiceRepository;
//import com.example.repository.NotificationRepository;
//import com.example.repository.PaymentRepository;
//import com.example.repository.PolicyRepository;
//import com.example.repository.TaxRateRepository;
//import com.razorpay.Order;
//import com.razorpay.RazorpayClient;
//import com.razorpay.RazorpayException;
//import com.razorpay.PaymentLink;
//import org.json.JSONObject;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.data.domain.Sort;
//import org.springframework.stereotype.Service;
//
//import java.util.ArrayList;
//import java.util.Date;
//import java.util.List;
//import java.util.Optional;
//import java.util.Calendar;
//import java.util.stream.Collectors;
//
//@Service
//public class InsurerService {
//
//    private static final Logger log = LoggerFactory.getLogger(InsurerService.class);
//
//    @Autowired
//    private InvoiceRepository invoiceRepository;
//
//    @Autowired
//    private PolicyRepository policyRepository;
//
//    @Autowired
//    private PaymentRepository paymentRepository;
//
//    @Autowired
//    private NotificationRepository notificationRepository;
//
//    @Autowired
//    private CustomerRepository customerRepository;
//
//    @Autowired
//    private TaxRateRepository taxRateRepository;
//
//    private final RazorpayClient razorpayClient;
//
//    public InsurerService(
//            @Value("${razorpay.key-id}") String keyId,
//            @Value("${razorpay.key-secret}") String keySecret) throws RazorpayException {
//        this.razorpayClient = new RazorpayClient(keyId, keySecret);
//    }
//
//    public Invoice createInvoice(String customerId, List<String> policyIds, String insurerId, Date dueDate, int months) throws RazorpayException {
//        Customer customer = customerRepository.findById(customerId)
//                .orElseThrow(() -> new RuntimeException("Customer not found"));
//
//        Date currentDate = new Date();
//        List<String> validPolicyIds = new ArrayList<>();
//        List<Invoice.TaxDetails> taxDetailsList = new ArrayList<>();
//        double totalAmount = 0.0;
//
//        // Loop to validate policies and calculate dynamic amounts/taxes
//        for (String policyId : policyIds) {
//            Policy policy = policyRepository.findById(policyId)
//                    .orElseThrow(() -> new RuntimeException("Policy not found"));
//
//            // Constraint check (skip if not expired - no status check)
//            Optional<Customer.PaymentHistoryEntry> historyEntry = customer.getPaymentHistory().stream()
//                    .filter(entry -> entry.getPolicyId().equals(policyId))
//                    .findFirst();
//
//            if (historyEntry.isPresent()) {
//                Customer.PaymentHistoryEntry entry = historyEntry.get();
//                if (!currentDate.after(entry.getValidUpto())) {
//                    log.warn("Skipping policy {}: Valid until {}", policyId, entry.getValidUpto());
//                    continue;
//                }
//            } else {
//                log.info("No payment history for policy {}; including in invoice", policyId);
//            }
//
//            // Fetch tax rate dynamically from collection
//            String taxRateId = policy.getPolicyType();
//            TaxRate taxRate = taxRateRepository.findById(taxRateId)
//                    .orElseThrow(() -> new RuntimeException("TaxRate not found for ID: " + taxRateId));
//
//            // Calculate per-policy
//            double baseAmount = policy.getMonthlyPremium() * months;
//            double gstAmount = baseAmount * taxRate.getGstRate();
//            double policyTotal = baseAmount + gstAmount;
//            totalAmount += policyTotal;
//
//            // Add per-policy tax details
//            Invoice.TaxDetails taxDetails = new Invoice.TaxDetails();
//            taxDetails.setPolicyId(policyId);  // Associate with policy
//            taxDetails.setGstRate(taxRate.getGstRate());
//            taxDetails.setTaxAmount(gstAmount);
//            taxDetails.setTotalAmount(policyTotal);
//            taxDetailsList.add(taxDetails);
//
//            validPolicyIds.add(policyId);
//        }
//
//        if (validPolicyIds.isEmpty()) {
//            throw new RuntimeException("No valid policies to generate invoice");
//        }
//
//        // Correct way to generate order ID: Create order first
//        JSONObject orderRequest = new JSONObject();
//        orderRequest.put("amount", (int) (totalAmount * 100)); // In paise
//        orderRequest.put("currency", "INR");
//        orderRequest.put("receipt", "receipt_multi_" + customerId);
//        Order razorpayOrder = razorpayClient.orders.create(orderRequest);
//        String generatedOrderId = razorpayOrder.get("id");
//        log.info("Generated Razorpay Order ID: {}", generatedOrderId);
//
//        // Generate payment link (cannot directly tie 'order_id' due to API limitation, but add to notes for reference)
//        JSONObject linkRequest = new JSONObject();
//        linkRequest.put("amount", (int) (totalAmount * 100));
//        linkRequest.put("currency", "INR");
//        linkRequest.put("accept_partial", false);
//        linkRequest.put("reference_id", customerId + "_" + System.currentTimeMillis());
//        linkRequest.put("description", "Payment for multiple policies");
//        linkRequest.put("customer", new JSONObject()
//                .put("name", customer.getName())
//                .put("email", customer.getEmail())
//                .put("contact", customer.getPhone()));
//        linkRequest.put("notify", new JSONObject().put("sms", true).put("email", true));
//        linkRequest.put("reminder_enable", true);
//        linkRequest.put("notes", new JSONObject()
//                .put("customerId", customerId)
//                .put("order_id", generatedOrderId)); // Add order_id to notes for webhook reference
//        PaymentLink paymentLink = razorpayClient.paymentLink.create(linkRequest);
//        String linkUrl = paymentLink.get("short_url");
//        log.info("Generated Payment Link: {}", linkUrl);
//
//        // Create single invoice
//        Invoice invoice = new Invoice();
//        invoice.setCustomerId(customerId);
//        invoice.setInsurerId(insurerId);
//        invoice.setPolicyIds(validPolicyIds);  // List of included policies
//        invoice.setAmount(totalAmount);
//        invoice.setStatus("unpaid");
//        invoice.setValidUpto(dueDate != null ? dueDate : calculateDueDate(currentDate, months));
//        invoice.setRazorpayOrderId(generatedOrderId);
//        invoice.setCreatedAt(new Date());
//        invoice.setPaymentLink(linkUrl);
//        invoice.setMonths(months);
//        invoice.setTaxDetailsList(taxDetailsList);  // Per-policy tax details
//
//        // Save invoice
//        Invoice savedInvoice = invoiceRepository.save(invoice);
//        log.info("Saved invoice ID: {} with razorpayOrderId: {}", savedInvoice.getId(), generatedOrderId);
//
//        // Update customer's paymentHistory for each policy
//        for (String policyId : validPolicyIds) {
//            updatePaymentHistory(customer, policyId, savedInvoice.getValidUpto());
//        }
//        customerRepository.save(customer);
//
//        return savedInvoice;
//    }
//
//    // Helper method for due date
//    private Date calculateDueDate(Date currentDate, int months) {
//        Calendar cal = Calendar.getInstance();
//        cal.setTime(currentDate);
//        cal.add(Calendar.MONTH, months);
//        return cal.getTime();
//    }
//
//    // Helper method to update paymentHistory for a policy
//    private void updatePaymentHistory(Customer customer, String policyId, Date newValidUpto) {
//        Optional<Customer.PaymentHistoryEntry> historyEntry = customer.getPaymentHistory().stream()
//                .filter(entry -> entry.getPolicyId().equals(policyId))
//                .findFirst();
//
//        if (historyEntry.isPresent()) {
//            Customer.PaymentHistoryEntry entry = historyEntry.get();
//            entry.setStatus("pending invoice");
//            entry.setValidUpto(newValidUpto);
//        } else {
//            Customer.PaymentHistoryEntry newEntry = new Customer.PaymentHistoryEntry();
//            newEntry.setPolicyId(policyId);
//            newEntry.setStatus("pending invoice");
//            newEntry.setValidUpto(newValidUpto);
//            customer.getPaymentHistory().add(newEntry);
//        }
//    }
//
//
//    public String initiatePayment(String invoiceId, String customerId) throws RazorpayException {
//        Invoice invoice = invoiceRepository.findById(invoiceId)
//                .orElseThrow(() -> new RuntimeException("Invoice not found"));
//
//        if (!invoice.getCustomerId().equals(customerId)) {
//            throw new RuntimeException("Unauthorized");
//        }
//
//        if (!"unpaid".equals(invoice.getStatus())) {
//            throw new RuntimeException("Invoice already paid");
//        }
//
//        return invoice.getRazorpayOrderId();
//    }
//    
//    public void verifyPayment(String razorpayPaymentId, String razorpayOrderId, String status) {
//        try {
//            Optional<Invoice> optionalInvoice = invoiceRepository.findByRazorpayOrderId(razorpayOrderId);
//            Invoice invoice = optionalInvoice.orElseThrow(() -> new RuntimeException("Invoice not found"));
//
//            log.info("Invoice loaded with policyIds: {}", invoice.getPolicyIds());
//
//            invoice.setStatus("paid");
//            invoiceRepository.save(invoice);
//
//            Payment payment = new Payment();
//            payment.setInvoiceId(invoice.getId());
//            payment.setCustomerId(invoice.getCustomerId());
//            payment.setInsurerId(invoice.getInsurerId());
//            payment.setAmount(invoice.getAmount());
//            payment.setStatus(status);
//            payment.setRazorpayPaymentId(razorpayPaymentId);
//            payment.setMethod("razorpay");          // <--- Add this line
//            payment.setIsAutoPay(false);             // <--- Add this line
//            payment.setPaidAt(new Date());           // <--- Add this line
//
//            List<String> policyIds = invoice.getPolicyIds();
//            if (policyIds != null && !policyIds.isEmpty()) {
//                payment.setPolicyIds(policyIds);
//                List<String> policyNames = policyRepository.findAllById(policyIds)
//                    .stream()
//                    .map(Policy::getName)
//                    .collect(Collectors.toList());
//                log.info("Policy Names: {}", policyNames);
//                payment.setPolicyNames(policyNames);
//            } else {
//                log.warn("No policy IDs found for invoice: {}", invoice.getId());
//            }
//
//            Payment savedPayment = paymentRepository.save(payment);
//            log.info("Saved payment with ID: {} and policyIds: {} and policyNames: {}",
//                    savedPayment.getId(), savedPayment.getPolicyIds(), savedPayment.getPolicyNames());
//
//            sendNotification(invoice.getId(), invoice.getCustomerId(), invoice.getInsurerId());
//        } catch (Exception e) {
//            log.error("Payment verification failed", e);
//            throw new RuntimeException("Payment verification failed: " + e.getMessage());
//        }
//    }
//
//
//    private void sendNotification(String invoiceId, String customerId, String insurerId) throws RazorpayException {
//        Notification notification = new Notification();
//        notification.setCustomerId(customerId);
//        notification.setInvoiceId(invoiceId);
//        notification.setInsurerId(insurerId);
//        notification.setType("email");
//        notification.setMessage("Payment successful for invoice " + invoiceId);
//        notificationRepository.save(notification);
//        // Add external sending logic (e.g., Twilio or SendGrid)
//    }
//
//    // NEW METHOD: Get unpaid customers
//    public List<CustomerSummary> getUnpaidCustomers() {
//        Date currentDate = new Date();
//        List<Customer> allCustomers = customerRepository.findAll();
//        return allCustomers.stream()
//                .filter(customer -> customer.getPaymentHistory().stream()
//                        .anyMatch(entry -> currentDate.after(entry.getValidUpto())))
//                .map(customer -> new CustomerSummary(customer.getId(), customer.getName()))
//                .collect(Collectors.toList());
//    }
//
//    // NEW METHOD: Get unpaid policies for a customer
//    public List<PolicySummary> getUnpaidPoliciesForCustomer(String customerId) {
//        Date currentDate = new Date();
//        Customer customer = customerRepository.findById(customerId)
//                .orElseThrow(() -> new RuntimeException("Customer not found"));
//
//        List<String> unpaidPolicyIds = customer.getPaymentHistory().stream()
//                .filter(entry -> currentDate.after(entry.getValidUpto()))
//                .map(Customer.PaymentHistoryEntry::getPolicyId)
//                .collect(Collectors.toList());
//
//        List<Policy> unpaidPolicies = policyRepository.findAllById(unpaidPolicyIds);
//
//        return unpaidPolicies.stream()
//                .map(policy -> new PolicySummary(policy.getId(), policy.getName()))  // FIXED: Use policy.getName() for display
//                .collect(Collectors.toList());
//    }
//    
//    public void processCashPayment(String invoiceId) {
//        log.info("Processing cash payment for invoiceId: {}", invoiceId);
//
//        // Find the invoice
//        Optional<Invoice> optionalInvoice = invoiceRepository.findById(invoiceId);
//        if (optionalInvoice.isEmpty()) {
//            log.error("Invoice not found for ID: {}", invoiceId);
//            throw new RuntimeException("Invoice not found");
//        }
//        Invoice invoice = optionalInvoice.get();
//
//        // Check if already paid
//        if (!"unpaid".equals(invoice.getStatus())) {
//            log.warn("Invoice {} is not unpaid, current status: {}", invoiceId, invoice.getStatus());
//            throw new RuntimeException("Invoice is not eligible for payment");
//        }
//
//        // Update invoice status to "paidByCash"
//        invoice.setStatus("paidByCash");
//        invoiceRepository.save(invoice);
//        log.info("Updated invoice {} status to paidByCash", invoiceId);
//
//        // Create and save payment record
//        Payment payment = new Payment();
//        payment.setInvoiceId(invoice.getId());
//        payment.setCustomerId(invoice.getCustomerId());
//        payment.setInsurerId(invoice.getInsurerId());
//        payment.setAmount(invoice.getAmount());
//        payment.setStatus("paidByCash");  // Updated to match invoice status
//        payment.setRazorpayPaymentId(null); // No Razorpay for cash
//        payment.setRazorpaySubscriptionId(null);
//        payment.setMethod("cash");
//        payment.setIsAutoPay(false);
//        payment.setPaidAt(new Date());
//
//        // Assuming you need to add taxDetails to Payment (based on sample data)
//        // If your Payment entity doesn't have it, add a field: private TaxDetails taxDetails; (or List<TaxDetails> if multi-policy)
//        // For simplicity, copying from invoice (adjust if needed)
//        if (!invoice.getTaxDetailsList().isEmpty()) {
//            // Example: Take the first one or aggregate; here assuming single for demo
//            Invoice.TaxDetails invoiceTax = invoice.getTaxDetailsList().get(0);
//            Payment.TaxDetails taxDetails = new Payment.TaxDetails();
//            taxDetails.setTaxType("GST"); // Assuming based on sample
//            taxDetails.setTaxRate(invoiceTax.getGstRate());
//            taxDetails.setTaxAmount(invoiceTax.getTaxAmount());
//            taxDetails.setTotalAmount(invoiceTax.getTotalAmount());
//            payment.setTaxDetails(taxDetails); // Add this field to your Payment entity if not present
//        }
//        payment.setPolicyIds(invoice.getPolicyIds());
//        List<String> policyNames = policyRepository.findAllById(invoice.getPolicyIds())
//                                     .stream()
//                                     .map(Policy::getName)
//                                     .collect(Collectors.toList());
//        payment.setPolicyNames(policyNames);
//
//        paymentRepository.save(payment);
//        log.info("Created payment record for invoice {}", invoiceId);
//
//        // Update customer payment history
//        Optional<Customer> optionalCustomer = customerRepository.findById(invoice.getCustomerId());
//        if (optionalCustomer.isEmpty()) {
//            log.error("Customer not found for ID: {}", invoice.getCustomerId());
//            throw new RuntimeException("Customer not found");
//        }
//        Customer customer = optionalCustomer.get();
//
//        Date paymentDate = new Date();
//        for (String policyId : invoice.getPolicyIds()) {
//            // Find or create payment history entry for the policy
//            Optional<Customer.PaymentHistoryEntry> optionalEntry = customer.getPaymentHistory().stream()
//                    .filter(entry -> entry.getPolicyId().equals(policyId))
//                    .findFirst();
//
//            Customer.PaymentHistoryEntry entry = optionalEntry.orElseGet(() -> {
//                Customer.PaymentHistoryEntry newEntry = new Customer.PaymentHistoryEntry();
//                newEntry.setPolicyId(policyId);
//                customer.getPaymentHistory().add(newEntry);
//                log.info("Created new history entry for policy {}", policyId);
//                return newEntry;
//            });
//
//            // Update entry
//            entry.setStatus("paidByCash");  // Updated to match invoice status
//            entry.setLastPaidDate(paymentDate);
//            Calendar cal = Calendar.getInstance();
//            cal.setTime(paymentDate);
//            cal.add(Calendar.MONTH, invoice.getMonths());
//            entry.setValidUpto(cal.getTime());
//            log.info("Updated policy {} validUpto to {}", policyId, entry.getValidUpto());
//        }
//
//        customerRepository.save(customer);
//        log.info("Updated customer payment history for ID: {}", customer.getId());
//    }
//    
// // Update BillingService: Add or modify methods to fetch all payments (without insurerId filter)
//    public List<Payment> getAllPaymentHistory() {
//        log.info("Fetching all payment history system-wide");
//        Sort sort = Sort.by(Sort.Direction.DESC, "paidAt"); // Newest to oldest
//        return paymentRepository.findAll(sort);
//    }
//    
// // NEW: Get customer by ID
//    public Optional<Customer> getCustomerById(String customerId) {
//        return customerRepository.findById(customerId);
//    }
//
//    // NEW: Get invoice by ID
//    public Optional<Invoice> getInvoiceById(String invoiceId) {
//        return invoiceRepository.findById(invoiceId);
//    }
//
//    // NEW: Get policies by IDs (returns full Policy objects; you can map to summaries if needed)
//    public List<Policy> getPoliciesByIds(List<String> policyIds) {
//        return policyRepository.findAllById(policyIds);
//    }
//    public List<Invoice> getAllInvoiceHistory() {
//        log.info("Fetching all invoice history system-wide");
//        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt"); // Newest to oldest
//        return invoiceRepository.findAll(sort);
//    }
//    
// // Add to BillingService.java
//
// // NEW: Search customers by name (case-insensitive partial match)
// public List<CustomerSummary> searchCustomersByName(String name) {
//     log.info("Searching customers with name containing: {}", name);
//     List<Customer> matchingCustomers = customerRepository.findByNameContainingIgnoreCase(name);
//     return matchingCustomers.stream()
//             .map(customer -> new CustomerSummary(customer.getId(), customer.getName()))
//             .collect(Collectors.toList());
// }
//
////NEW: Get unpaid and failed invoices for a customer
//public List<Invoice> getUnpaidFailedInvoicesForCustomer(String customerId) {
//  log.info("Fetching unpaid/failed invoices for customer: {}", customerId);
//  return invoiceRepository.findByCustomerIdAndStatusIn(customerId, List.of("unpaid", "failed"));  // Assumes status can be "unpaid" or "failed"; adjust as needed
//}
//
////NEW: Process cash payment for multiple invoices
//public void processCashPaymentMultiple(List<String> invoiceIds) {
//  log.info("Processing cash payment for multiple invoices: {}", invoiceIds);
//  for (String invoiceId : invoiceIds) {
//      processCashPayment(invoiceId);  // Reuse your existing single-invoice method for each
//  }
//}
//}
