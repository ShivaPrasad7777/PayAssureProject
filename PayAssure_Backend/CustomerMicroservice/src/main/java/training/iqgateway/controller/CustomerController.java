package training.iqgateway.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import training.iqgateway.entity.Customer;
import training.iqgateway.entity.Invoice;
import training.iqgateway.entity.NotificationRequest;
import training.iqgateway.entity.Payment;
import training.iqgateway.entity.Policy;
import training.iqgateway.repository.CustomerRepository;
import training.iqgateway.service.CustomerService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.json.JSONArray;
import org.json.JSONObject; // For JSON parsing
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/customer")
public class CustomerController {

    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);

    @Autowired
    private CustomerService customerService;
    

  @Autowired
  private CustomerRepository customerRepository;

    // Get unpaid invoices for logged-in customer
    @GetMapping("/invoices/unpaid/{customerId}")
    public ResponseEntity<List<Invoice>> getUnpaidInvoices(@PathVariable String customerId) {
        log.info("Fetching unpaid invoices for customerId: {}", customerId);
        List<Invoice> invoices = customerService.getUnpaidInvoices(customerId);
        return ResponseEntity.ok(invoices);
    }




 
//     Webhook endpoint for Razorpay (updates after payment or subscription events)
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(@RequestBody String payload) {
        try {
            JSONObject json = new JSONObject(payload);
            String event = json.optString("event");

            JSONObject payloadObj = json.optJSONObject("payload");
            if (payloadObj == null) {
                return ResponseEntity.badRequest().body("Invalid payload");
            }

            if ("subscription.charged".equals(event)) {
                // Existing subscription charged handler
                JSONObject subscriptionEntity = payloadObj.optJSONObject("subscription") != null
                        ? payloadObj.optJSONObject("subscription").optJSONObject("entity") : null;
                JSONObject paymentEntity = payloadObj.optJSONObject("payment") != null
                        ? payloadObj.optJSONObject("payment").optJSONObject("entity") : null;

                if (subscriptionEntity == null || paymentEntity == null) {
                    return ResponseEntity.badRequest().body("Missing subscription or payment entity");
                }

                String subscriptionId = subscriptionEntity.optString("id");
                String razorpayOrderId = subscriptionEntity.optString("order_id");
                String razorpayPaymentId = paymentEntity.optString("id");

                JSONObject notes = subscriptionEntity.optJSONObject("notes");
                String customerId = notes.optString("customerId");
                JSONArray policyIdsJson = notes.optJSONArray("policyIds");
                JSONArray policyNamesJson = notes.optJSONArray("policyNames");

                List<String> policyIds = new ArrayList<>();
                if (policyIdsJson != null) {
                    for (int i = 0; i < policyIdsJson.length(); i++) {
                        policyIds.add(policyIdsJson.getString(i));
                    }
                }
                System.out.println("hi");
                System.out.println("hi");
                List<String> policyNames = new ArrayList<>();
                if (policyNamesJson != null) {
                    for (int i = 0; i < policyNamesJson.length(); i++) {
                        policyNames.add(policyNamesJson.getString(i));
                    }
                }

                customerService.recordAutopayPayment(
                    customerId,
                    subscriptionId,
                    razorpayOrderId,
                    razorpayPaymentId,
                    policyIds,
                    policyNames
                );
                

                return ResponseEntity.ok("Subscription charged event processed");
            }
            else if ("payment.captured".equals(event)) {
                // New handler for payment captured (invoice, payment link, etc.)

                JSONObject paymentEntity = payloadObj.optJSONObject("payment") != null
                        ? payloadObj.optJSONObject("payment").optJSONObject("entity") : null;

                if (paymentEntity == null) {
                    return ResponseEntity.badRequest().body("Missing payment entity");
                }

                String razorpayPaymentId = paymentEntity.optString("id");
                String razorpayOrderId = paymentEntity.optString("order_id");
                String customerId = paymentEntity.optString("customer_id"); // optional, may not be present
                String invoiceId = paymentEntity.optString("invoice_id"); // may be empty

                List<String> policyIds = new ArrayList<>();
                List<String> policyNames = new ArrayList<>();

                if (invoiceId != null && !invoiceId.isEmpty()) {
                    Optional<Invoice> optInvoice = customerService.getInvoiceById(invoiceId);
                    if (optInvoice.isPresent()) {
                        Invoice invoice = optInvoice.get();
                        if (invoice.getPolicyIds() != null) {
                            policyIds.addAll(invoice.getPolicyIds());
                            policyNames.addAll(customerService.getPolicyNamesByIds(invoice.getPolicyIds()));
                        }
                    }
                }

                // You may call your existing processPayment here if designed accordingly
                // For example, calling with subscriptionId as null since this is a direct payment:
                customerService.processPayment(razorpayOrderId, razorpayPaymentId, "paid", null);

                // Or if you want to store these details explicitly, you can introduce a separate method:
                // customerService.recordPayment(customerId, razorpayPaymentId, razorpayOrderId, policyIds, policyNames);

                return ResponseEntity.ok("Payment captured event processed");
            }

            // Ignore other events or handle as needed
            return ResponseEntity.ok("Event ignored");

        } catch (Exception e) {
            // Log and respond with error
            log.error("Webhook handling failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook: " + e.getMessage());
        }
    }


    // Fetch payment history for a customer
    @GetMapping("/payments/history/{customerId}")
    public ResponseEntity<List<Payment>> getPaymentHistory(@PathVariable String customerId) {
        log.info("Fetching payment history for customerId: {}", customerId);
        List<Payment> payments = customerService.getPaymentHistory(customerId);
        if (payments.isEmpty()) {
            log.warn("No payments found for customerId: {}", customerId);
        }
        return ResponseEntity.ok(payments);
    }

    // Fetch a single invoice by ID
    @GetMapping("/invoices/{invoiceId}")
    public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
        Optional<Invoice> invoice = customerService.getInvoiceById(invoiceId);
        return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Fetch policy names by IDs
    @PostMapping("/policies/names")
    public ResponseEntity<List<String>> getPolicyNamesByIds(@RequestBody List<String> policyIds) {
        List<String> names = customerService.getPolicyNamesByIds(policyIds);
        return ResponseEntity.ok(names);
    }

    // Enable autopay for an invoice (legacy method)
    @PostMapping("/autopay/enable/{invoiceId}")
    public ResponseEntity<String> enableAutoPay(@PathVariable String invoiceId, @RequestBody Map<String, Object> body) {
        String customerId = (String) body.get("customerId");
        int months = (int) body.get("months");
        double amount = ((Number) body.get("amount")).doubleValue();
        String subscriptionId = customerService.enableAutoPay(customerId, invoiceId, months, amount);
        return ResponseEntity.ok("Autopay enabled. Subscription ID: " + subscriptionId);
    }

    // Enable autopay per policy (NEW)
    @PostMapping("/autopay/enable/policy/{policyId}")
    public ResponseEntity<String> enableAutoPayPolicy(@PathVariable String policyId, @RequestBody Map<String, Object> body) {
        String customerId = (String) body.get("customerId");
        int months = (int) body.get("months");
        double amount = ((Number) body.get("amount")).doubleValue();
        String subscriptionId = customerService.enableAutoPayPolicy(customerId, policyId, months, amount);
        return ResponseEntity.ok("Autopay enabled for policy. Subscription ID: " + subscriptionId);
    }

    // Disable autopay with policyId
    @PostMapping("/autopay/disable")
    public ResponseEntity<String> disableAutoPay(@RequestBody Map<String, String> body) {
        String customerId = body.get("customerId");
        String subscriptionId = body.get("subscriptionId");
        String policyId = body.get("policyId");
        customerService.disableAutoPay(customerId, subscriptionId, policyId);
        return ResponseEntity.ok("Autopay disabled");
    }

    // Fetch owned policies of customer
    @GetMapping("/policies/owned/{customerId}")
    public ResponseEntity<List<Policy>> getOwnedPolicies(@PathVariable String customerId) {
        log.info("Fetching owned policies for customerId: {}", customerId);
        List<Policy> policies = customerService.getOwnedPolicies(customerId);
        return ResponseEntity.ok(policies);
    }
    @GetMapping("/customers/expiring-policies/by-days")
    public ResponseEntity<List<Customer>> getCustomersWithExpiringPoliciesByDays(@RequestParam int days) {
        List<Customer> customers = customerService.getCustomersWithExpiringPoliciesByDays(days);
        return ResponseEntity.ok(customers);
    }

    @PostMapping("/customers/expiring-policies/notify")
    public ResponseEntity<String> notifyExpiringPolicies(@RequestBody List<NotificationRequest> requests) {
        for (NotificationRequest req : requests) {
            try {
                customerService.sendPolicyExpiryNotification(req.getCustomerId(), req.getPolicyId());
            } catch (Exception e) {
                log.error("Failed to send notification to customerId: {}, policyId: {}", req.getCustomerId(), req.getPolicyId(), e);
            }
        }
        return ResponseEntity.ok("Notifications triggered.");
    }
    
    @GetMapping("/{customerId}")
    public ResponseEntity<?> getCustomerById(@PathVariable String customerId) {
        try {
            Optional<Customer> customerOpt = customerRepository.findById(customerId);
            if (customerOpt.isPresent()) {
                return ResponseEntity.ok(customerOpt.get());
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Customer not found with id " + customerId));
            }
        } catch (Exception ex) {
            log.error("Error fetching customer with id {}: {}", customerId, ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Internal server error"));
        }
    }

 }













//working
//package training.iqgateway.controller;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import training.iqgateway.entity.Customer;
//import training.iqgateway.entity.Invoice;
//import training.iqgateway.entity.NotificationRequest;
//import training.iqgateway.entity.Payment;
//import training.iqgateway.entity.Policy;
//import training.iqgateway.repository.CustomerRepository;
//import training.iqgateway.service.CustomerService;
//
//import java.util.ArrayList;
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//
//import org.json.JSONArray;
//import org.json.JSONObject; // For JSON parsing
//import org.springframework.http.HttpStatus;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//
//@RestController
//@RequestMapping("/api/customer")
//public class CustomerController {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
//
//    @Autowired
//    private CustomerService customerService;
//    
//
//  @Autowired
//  private CustomerRepository customerRepository;
//
//    // Get unpaid invoices for logged-in customer
//    @GetMapping("/invoices/unpaid/{customerId}")
//    public ResponseEntity<List<Invoice>> getUnpaidInvoices(@PathVariable String customerId) {
//        log.info("Fetching unpaid invoices for customerId: {}", customerId);
//        List<Invoice> invoices = customerService.getUnpaidInvoices(customerId);
//        return ResponseEntity.ok(invoices);
//    }
//
//
//
//
// 
////     Webhook endpoint for Razorpay (updates after payment or subscription events)
//    @PostMapping("/webhook")
//    public ResponseEntity<String> handleWebhook(@RequestBody String payload,
//                                               @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
//        log.info("Webhook received. Raw payload: {}", payload);
//        // Signature verification logic (if present) omitted for brevity
//        try {
//            // Assuming you verify signature here correctly...
//
//            JSONObject jsonPayload = new JSONObject(payload);
//            String event = jsonPayload.optString("event", "unknown");
//            log.info("Parsed event: {}", event);
//
//            String subscriptionId = "";
//            String razorpayPaymentId = "";
//            String razorpayOrderId = "";
//            String status = "";
//
//            JSONObject payloadObj = jsonPayload.optJSONObject("payload");
//            if (payloadObj != null) {
//                JSONObject subEntity = payloadObj.optJSONObject("subscription");
//                if (subEntity != null) {
//                    subEntity = subEntity.optJSONObject("entity");
//                    if (subEntity != null) {
//                        subscriptionId = subEntity.optString("id", "").trim();
//                        razorpayOrderId = subEntity.optString("order_id", "").trim();
//                        razorpayPaymentId = subEntity.optString("latest_payment_id", "").trim();
//                        status = "subscription.charged".equals(event) ? "paid" : "cancelled";
//                    }
//                }
//
//                JSONObject paymentEntity = payloadObj.optJSONObject("payment");
//                if (paymentEntity != null) {
//                    paymentEntity = paymentEntity.optJSONObject("entity");
//                    if (paymentEntity != null) {
//                        razorpayPaymentId = paymentEntity.optString("id", razorpayPaymentId).trim();
//                        razorpayOrderId = paymentEntity.optString("order_id", razorpayOrderId).trim();
//                        status = "payment.captured".equals(event) ? "paid" : "failed";
//                        if (subscriptionId.isEmpty()) {
//                            subscriptionId = paymentEntity.optString("subscription_id", "").trim();
//                        }
//                    }
//                }
//            }
//
//            log.info("Extracted: SubscriptionID={}, OrderID={}, PaymentID={}, Status={}", subscriptionId, razorpayOrderId, razorpayPaymentId, status);
//
//            if (!subscriptionId.isEmpty()) {
//                log.info("Processing as auto-pay/subscription event (subscriptionId detected)");
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status, subscriptionId);
//                return ResponseEntity.ok("Subscription event processed");
//            } else if (!razorpayOrderId.isEmpty()) {
//                log.info("Processing as one-time invoice payment event (no subscriptionId)");
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status, null);
//                return ResponseEntity.ok("Payment event processed");
//            } else {
//                log.warn("No valid IDs found in payload");
//                return ResponseEntity.badRequest().body("Invalid payload - missing IDs");
//            }
//        } catch (Exception e) {
//            log.error("Error processing webhook: {}", e.getMessage(), e);
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook: " + e.getMessage());
//        }
//    }
//
//    // Fetch payment history for a customer
//    @GetMapping("/payments/history/{customerId}")
//    public ResponseEntity<List<Payment>> getPaymentHistory(@PathVariable String customerId) {
//        log.info("Fetching payment history for customerId: {}", customerId);
//        List<Payment> payments = customerService.getPaymentHistory(customerId);
//        if (payments.isEmpty()) {
//            log.warn("No payments found for customerId: {}", customerId);
//        }
//        return ResponseEntity.ok(payments);
//    }
//
//    // Fetch a single invoice by ID
//    @GetMapping("/invoices/{invoiceId}")
//    public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
//        Optional<Invoice> invoice = customerService.getInvoiceById(invoiceId);
//        return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//
//    // Fetch policy names by IDs
//    @PostMapping("/policies/names")
//    public ResponseEntity<List<String>> getPolicyNamesByIds(@RequestBody List<String> policyIds) {
//        List<String> names = customerService.getPolicyNamesByIds(policyIds);
//        return ResponseEntity.ok(names);
//    }
//
//    // Enable autopay for an invoice (legacy method)
//    @PostMapping("/autopay/enable/{invoiceId}")
//    public ResponseEntity<String> enableAutoPay(@PathVariable String invoiceId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPay(customerId, invoiceId, months, amount);
//        return ResponseEntity.ok("Autopay enabled. Subscription ID: " + subscriptionId);
//    }
//
//    // Enable autopay per policy (NEW)
//    @PostMapping("/autopay/enable/policy/{policyId}")
//    public ResponseEntity<String> enableAutoPayPolicy(@PathVariable String policyId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPayPolicy(customerId, policyId, months, amount);
//        return ResponseEntity.ok("Autopay enabled for policy. Subscription ID: " + subscriptionId);
//    }
//
//    // Disable autopay with policyId
//    @PostMapping("/autopay/disable")
//    public ResponseEntity<String> disableAutoPay(@RequestBody Map<String, String> body) {
//        String customerId = body.get("customerId");
//        String subscriptionId = body.get("subscriptionId");
//        String policyId = body.get("policyId");
//        customerService.disableAutoPay(customerId, subscriptionId, policyId);
//        return ResponseEntity.ok("Autopay disabled");
//    }
//
//    // Fetch owned policies of customer
//    @GetMapping("/policies/owned/{customerId}")
//    public ResponseEntity<List<Policy>> getOwnedPolicies(@PathVariable String customerId) {
//        log.info("Fetching owned policies for customerId: {}", customerId);
//        List<Policy> policies = customerService.getOwnedPolicies(customerId);
//        return ResponseEntity.ok(policies);
//    }
//    @GetMapping("/customers/expiring-policies/by-days")
//    public ResponseEntity<List<Customer>> getCustomersWithExpiringPoliciesByDays(@RequestParam int days) {
//        List<Customer> customers = customerService.getCustomersWithExpiringPoliciesByDays(days);
//        return ResponseEntity.ok(customers);
//    }
//
//    @PostMapping("/customers/expiring-policies/notify")
//    public ResponseEntity<String> notifyExpiringPolicies(@RequestBody List<NotificationRequest> requests) {
//        for (NotificationRequest req : requests) {
//            try {
//                customerService.sendPolicyExpiryNotification(req.getCustomerId(), req.getPolicyId());
//            } catch (Exception e) {
//                log.error("Failed to send notification to customerId: {}, policyId: {}", req.getCustomerId(), req.getPolicyId(), e);
//            }
//        }
//        return ResponseEntity.ok("Notifications triggered.");
//    }
//    
//    @GetMapping("/{customerId}")
//    public ResponseEntity<?> getCustomerById(@PathVariable String customerId) {
//        try {
//            Optional<Customer> customerOpt = customerRepository.findById(customerId);
//            if (customerOpt.isPresent()) {
//                return ResponseEntity.ok(customerOpt.get());
//            } else {
//                return ResponseEntity.status(HttpStatus.NOT_FOUND)
//                        .body(Map.of("message", "Customer not found with id " + customerId));
//            }
//        } catch (Exception ex) {
//            log.error("Error fetching customer with id {}: {}", customerId, ex.getMessage(), ex);
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                    .body(Map.of("message", "Internal server error"));
//        }
//    }
//
// }
//







//package training.iqgateway.controller;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import training.iqgateway.entity.Customer;
//import training.iqgateway.entity.Invoice;
//import training.iqgateway.entity.Payment;
//import training.iqgateway.entity.Policy;
//import training.iqgateway.repository.CustomerRepository;
//import training.iqgateway.service.CustomerService;
//
//import java.util.ArrayList;
//import java.util.Arrays;
//import java.util.Collections;
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//import java.util.stream.Collectors;
//
//import org.json.JSONObject;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import org.springframework.http.HttpStatus;
//
//@RestController
//@RequestMapping("/api/customer")
//public class CustomerController {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
//
//    @Autowired
//    private CustomerService customerService;
//
//    @Autowired
//    private CustomerRepository customerRepository;
//
//    @GetMapping("/invoices/unpaid/{customerId}")
//    public ResponseEntity<List<Invoice>> getUnpaidInvoices(@PathVariable String customerId) {
//        log.info("Fetching unpaid invoices for customerId: {}", customerId);
//        List<Invoice> invoices = customerService.getUnpaidInvoices(customerId);
//        return ResponseEntity.ok(invoices);
//    }
//
//    @PostMapping("/webhook")
//    public ResponseEntity<String> handleWebhook(@RequestBody String payload,
//                                               @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
//        log.info("Webhook received. Raw payload: {}", payload);
//        try {
//            // Parse JSON payload
//            JSONObject jsonPayload = new JSONObject(payload);
//            String event = jsonPayload.optString("event", "unknown");
//            log.info("Parsed event: {}", event);
//
//            String subscriptionId = "";
//            String razorpayPaymentId = "";
//            String razorpayOrderId = "";
//            String status = "";
//            Double amount = null;
//            List<String> policyIds = null;
//            List<String> policyNames = null;
//            String customerId = null;
//
//            JSONObject payloadObj = jsonPayload.optJSONObject("payload");
//            if (payloadObj != null) {
//                JSONObject subEntity = payloadObj.optJSONObject("subscription");
//                JSONObject notes = null;
//                if (subEntity != null) {
//                    subEntity = subEntity.optJSONObject("entity");
//                    if (subEntity != null) {
//                        subscriptionId = subEntity.optString("id", "").trim();
//                        razorpayOrderId = subEntity.optString("order_id", "").trim();
//                        razorpayPaymentId = subEntity.optString("latest_payment_id", "").trim();
//                        notes = subEntity.optJSONObject("notes");
//                    }
//                }
//                if (notes != null) {
//                    policyIds = parseToList(notes.opt("policyIds"));
//                    policyNames = parseToList(notes.opt("policyNames"));
//                    customerId = notes.optString("customerId", null);
//                }
//                JSONObject paymentEntity = payloadObj.optJSONObject("payment");
//                if (paymentEntity != null) {
//                    paymentEntity = paymentEntity.optJSONObject("entity");
//                    if (paymentEntity != null) {
//                        razorpayPaymentId = paymentEntity.optString("id", razorpayPaymentId).trim();
//                        razorpayOrderId = paymentEntity.optString("order_id", razorpayOrderId).trim();
//                        amount = paymentEntity.has("amount") ? paymentEntity.getDouble("amount") / 100.0 : null; // amount in Rupees assuming payment amount is in paise
//                        if (subscriptionId.isEmpty()) {
//                            subscriptionId = paymentEntity.optString("subscription_id", "").trim();
//                        }
//                        status = "payment.captured".equals(event) || "subscription.charged".equals(event) ? "paid" : "failed";
//                    }
//                }
//            }
//
//            log.info("Extracted SubscriptionID={}, OrderID={}, PaymentID={}, Status={}, Amount={}, PolicyIDs={}, PolicyNames={}, CustomerID={}",
//                    subscriptionId, razorpayOrderId, razorpayPaymentId, status, amount, policyIds, policyNames, customerId);
//
//            if (customerId == null) {
//                log.warn("Missing customerId in webhook notes!");
//                return ResponseEntity.badRequest().body("Missing customerId in notes");
//            }
//
//            // Pass amount or 0 if null to avoid null pointer in service
//            customerService.processPayment(razorpayOrderId,
//                                           razorpayPaymentId,
//                                           status,
//                                           subscriptionId,
//                                           customerId,
//                                           policyIds != null ? policyIds : Collections.emptyList(),
//                                           policyNames != null ? policyNames : Collections.emptyList(),
//                                           amount != null ? amount : 0.0);
//
//            return ResponseEntity.ok("Event processed");
//        } catch (Exception e) {
//            log.error("Error processing webhook: {}", e.getMessage(), e);
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook: " + e.getMessage());
//        }
//    }
//
//   
//
//    private List<String> parseToList(Object val) {
//        if (val == null) return Collections.emptyList();
//        if (val instanceof String) {
//            String s = (String) val;
//            if (s.trim().isEmpty()) return Collections.emptyList();
//            return Arrays.stream(s.split(","))
//                         .map(String::trim)
//                         .filter(str -> !str.isEmpty())
//                         .collect(Collectors.toList());
//        }
//        if (val instanceof org.json.JSONArray) {
//            org.json.JSONArray arr = (org.json.JSONArray) val;
//            List<String> list = new ArrayList<>();
//            for (int i = 0; i < arr.length(); i++) {
//                list.add(arr.getString(i));
//            }
//            return list;
//        }
//        // fallback
//        return Collections.emptyList();
//    }
//
//    @GetMapping("/payments/history/{customerId}")
//    public ResponseEntity<List<Payment>> getPaymentHistory(@PathVariable String customerId) {
//        log.info("Fetching payment history for customerId: {}", customerId);
//        List<Payment> payments = customerService.getPaymentHistory(customerId);
//        if (payments.isEmpty()) {
//            log.warn("No payments found for customerId: {}", customerId);
//        }
//        return ResponseEntity.ok(payments);
//    }
//
//    @GetMapping("/invoices/{invoiceId}")
//    public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
//        Optional<Invoice> invoice = customerService.getInvoiceById(invoiceId);
//        return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//
//    @PostMapping("/policies/names")
//    public ResponseEntity<List<String>> getPolicyNamesByIds(@RequestBody List<String> policyIds) {
//        List<String> names = customerService.getPolicyNamesByIds(policyIds);
//        return ResponseEntity.ok(names);
//    }
//
//    @PostMapping("/autopay/enable/{invoiceId}")
//    public ResponseEntity<String> enableAutoPay(@PathVariable String invoiceId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPay(customerId, invoiceId, months, amount);
//        return ResponseEntity.ok("Autopay enabled. Subscription ID: " + subscriptionId);
//    }
//
//    @PostMapping("/autopay/enable/policy/{policyId}")
//    public ResponseEntity<String> enableAutoPayPolicy(@PathVariable String policyId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPayPolicy(customerId, policyId, months, amount);
//        return ResponseEntity.ok("Autopay enabled for policy. Subscription ID: " + subscriptionId);
//    }
//
//    @PostMapping("/autopay/disable")
//    public ResponseEntity<String> disableAutoPay(@RequestBody Map<String, String> body) {
//        String customerId = body.get("customerId");
//        String subscriptionId = body.get("subscriptionId");
//        String policyId = body.get("policyId");
//        customerService.disableAutoPay(customerId, subscriptionId, policyId);
//        return ResponseEntity.ok("Autopay disabled");
//    }
//
//    @GetMapping("/policies/owned/{customerId}")
//    public ResponseEntity<List<Policy>> getOwnedPolicies(@PathVariable String customerId) {
//        log.info("Fetching owned policies for customerId: {}", customerId);
//        List<Policy> policies = customerService.getOwnedPolicies(customerId);
//        return ResponseEntity.ok(policies);
//    }
//
//    @GetMapping("/{customerId}")
//    public ResponseEntity<Customer> getCustomerById(@PathVariable String customerId) {
//        Optional<Customer> customer = customerRepository.findById(customerId);
//        return customer.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//}



//display policy name in payment history
//package training.iqgateway.controller;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import training.iqgateway.entity.Customer;
//import training.iqgateway.entity.Invoice;
//import training.iqgateway.entity.Payment;
//import training.iqgateway.entity.Policy;
//import training.iqgateway.repository.CustomerRepository;
//import training.iqgateway.service.CustomerService;
//
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//
//import org.json.JSONObject; // For JSON parsing
//import org.springframework.http.HttpStatus;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//
//@RestController
//@RequestMapping("/api/customer")
//public class CustomerController {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
//
//    @Autowired
//    private CustomerService customerService;
//
//    @Autowired
//    private CustomerRepository customerRepository; // Inject the repository
//
//    // Get unpaid invoices for logged-in customer
//    @GetMapping("/invoices/unpaid/{customerId}")
//    public ResponseEntity<List<Invoice>> getUnpaidInvoices(@PathVariable String customerId) {
//        log.info("Fetching unpaid invoices for customerId: {}", customerId);
//        List<Invoice> invoices = customerService.getUnpaidInvoices(customerId);
//        return ResponseEntity.ok(invoices);
//    }
//
//    // Webhook endpoint for Razorpay (updates after payment or subscription events)
//    @PostMapping("/webhook")
//    public ResponseEntity<String> handleWebhook(@RequestBody String payload,
//                                               @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
//        log.info("Webhook received. Raw payload: {}", payload);
//        // Signature verification logic (if present) omitted for brevity
//        try {
//            // Assuming you verify signature here correctly...
//
//            JSONObject jsonPayload = new JSONObject(payload);
//            String event = jsonPayload.optString("event", "unknown");
//            log.info("Parsed event: {}", event);
//
//            String subscriptionId = "";
//            String razorpayPaymentId = "";
//            String razorpayOrderId = "";
//            String status = "";
//
//            JSONObject payloadObj = jsonPayload.optJSONObject("payload");
//            if (payloadObj != null) {
//                JSONObject subEntity = payloadObj.optJSONObject("subscription");
//                if (subEntity != null) {
//                    subEntity = subEntity.optJSONObject("entity");
//                    if (subEntity != null) {
//                        subscriptionId = subEntity.optString("id", "").trim();
//                        razorpayOrderId = subEntity.optString("order_id", "").trim();
//                        razorpayPaymentId = subEntity.optString("latest_payment_id", "").trim();
//                        status = "subscription.charged".equals(event) ? "paid" : "cancelled";
//                    }
//                }
//
//                JSONObject paymentEntity = payloadObj.optJSONObject("payment");
//                if (paymentEntity != null) {
//                    paymentEntity = paymentEntity.optJSONObject("entity");
//                    if (paymentEntity != null) {
//                        razorpayPaymentId = paymentEntity.optString("id", razorpayPaymentId).trim();
//                        razorpayOrderId = paymentEntity.optString("order_id", razorpayOrderId).trim();
//                        status = "payment.captured".equals(event) ? "paid" : "failed";
//                        if (subscriptionId.isEmpty()) {
//                            subscriptionId = paymentEntity.optString("subscription_id", "").trim();
//                        }
//                    }
//                }
//            }
//
//            log.info("Extracted: SubscriptionID={}, OrderID={}, PaymentID={}, Status={}", subscriptionId, razorpayOrderId, razorpayPaymentId, status);
//
//            if (!subscriptionId.isEmpty()) {
//                log.info("Processing as auto-pay/subscription event (subscriptionId detected)");
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status, subscriptionId);
//                return ResponseEntity.ok("Subscription event processed");
//            } else if (!razorpayOrderId.isEmpty()) {
//                log.info("Processing as one-time invoice payment event (no subscriptionId)");
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status, null);
//                return ResponseEntity.ok("Payment event processed");
//            } else {
//                log.warn("No valid IDs found in payload");
//                return ResponseEntity.badRequest().body("Invalid payload - missing IDs");
//            }
//        } catch (Exception e) {
//            log.error("Error processing webhook: {}", e.getMessage(), e);
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook: " + e.getMessage());
//        }
//    }
//
//    // Fetch payment history for a customer
//    @GetMapping("/payments/history/{customerId}")
//    public ResponseEntity<List<Payment>> getPaymentHistory(@PathVariable String customerId) {
//        log.info("Fetching payment history for customerId: {}", customerId);
//        List<Payment> payments = customerService.getPaymentHistory(customerId);
//        if (payments.isEmpty()) {
//            log.warn("No payments found for customerId: {}", customerId);
//        }
//        return ResponseEntity.ok(payments);
//    }
//
//    // Fetch a single invoice by ID
//    @GetMapping("/invoices/{invoiceId}")
//    public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
//        Optional<Invoice> invoice = customerService.getInvoiceById(invoiceId);
//        return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//
//    // Fetch policy names by IDs
//    @PostMapping("/policies/names")
//    public ResponseEntity<List<String>> getPolicyNamesByIds(@RequestBody List<String> policyIds) {
//        List<String> names = customerService.getPolicyNamesByIds(policyIds);
//        return ResponseEntity.ok(names);
//    }
//
//    // Enable autopay for an invoice (legacy method)
//    @PostMapping("/autopay/enable/{invoiceId}")
//    public ResponseEntity<String> enableAutoPay(@PathVariable String invoiceId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPay(customerId, invoiceId, months, amount);
//        return ResponseEntity.ok("Autopay enabled. Subscription ID: " + subscriptionId);
//    }
//
//    // Enable autopay per policy (NEW)
//    @PostMapping("/autopay/enable/policy/{policyId}")
//    public ResponseEntity<String> enableAutoPayPolicy(@PathVariable String policyId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPayPolicy(customerId, policyId, months, amount);
//        return ResponseEntity.ok("Autopay enabled for policy. Subscription ID: " + subscriptionId);
//    }
//
//    // Disable autopay with policyId
//    @PostMapping("/autopay/disable")
//    public ResponseEntity<String> disableAutoPay(@RequestBody Map<String, String> body) {
//        String customerId = body.get("customerId");
//        String subscriptionId = body.get("subscriptionId");
//        String policyId = body.get("policyId");
//        customerService.disableAutoPay(customerId, subscriptionId, policyId);
//        return ResponseEntity.ok("Autopay disabled");
//    }
//
//    // Fetch owned policies of customer
//    @GetMapping("/policies/owned/{customerId}")
//    public ResponseEntity<List<Policy>> getOwnedPolicies(@PathVariable String customerId) {
//        log.info("Fetching owned policies for customerId: {}", customerId);
//        List<Policy> policies = customerService.getOwnedPolicies(customerId);
//        return ResponseEntity.ok(policies);
//    }
//    
//    @GetMapping("/{customerId}")
//    public ResponseEntity<Customer> getCustomerById(@PathVariable String customerId) {
//        Optional<Customer> customer = customerRepository.findById(customerId);
//        return customer.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//}








//package training.iqgateway.controller;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import training.iqgateway.entity.Invoice;
//import training.iqgateway.entity.Payment;
//import training.iqgateway.entity.Policy;
//import training.iqgateway.service.CustomerService;
//
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//
//import org.json.JSONObject; // For JSON parsing
//import org.springframework.http.HttpStatus;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//
//@RestController
//@RequestMapping("/api/customer")
//public class CustomerController {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
//
//    @Autowired
//    private CustomerService customerService;
//
//    // Get unpaid invoices for logged-in customer
//    @GetMapping("/invoices/unpaid/{customerId}")
//    public ResponseEntity<List<Invoice>> getUnpaidInvoices(@PathVariable String customerId) {
//        log.info("Fetching unpaid invoices for customerId: {}", customerId);
//        List<Invoice> invoices = customerService.getUnpaidInvoices(customerId);
//        return ResponseEntity.ok(invoices);
//    }
//
//    // Webhook endpoint for Razorpay (updates after payment or subscription events)
//    @PostMapping("/webhook")
//    public ResponseEntity<String> handleWebhook(@RequestBody String payload,
//                                               @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
//        log.info("Webhook received. Raw payload: {}", payload);
//        // Signature verification logic (if present) omitted for brevity
//        try {
//            // Assuming you verify signature here correctly...
//
//            JSONObject jsonPayload = new JSONObject(payload);
//            String event = jsonPayload.optString("event", "unknown");
//            log.info("Parsed event: {}", event);
//
//            String subscriptionId = "";
//            String razorpayPaymentId = "";
//            String razorpayOrderId = "";
//            String status = "";
//
//            JSONObject payloadObj = jsonPayload.optJSONObject("payload");
//            if (payloadObj != null) {
//                JSONObject subEntity = payloadObj.optJSONObject("subscription");
//                if (subEntity != null) {
//                    subEntity = subEntity.optJSONObject("entity");
//                    if (subEntity != null) {
//                        subscriptionId = subEntity.optString("id", "").trim();
//                        razorpayOrderId = subEntity.optString("order_id", "").trim();
//                        razorpayPaymentId = subEntity.optString("latest_payment_id", "").trim();
//                        status = "subscription.charged".equals(event) ? "paid" : "cancelled";
//                    }
//                }
//
//                JSONObject paymentEntity = payloadObj.optJSONObject("payment");
//                if (paymentEntity != null) {
//                    paymentEntity = paymentEntity.optJSONObject("entity");
//                    if (paymentEntity != null) {
//                        razorpayPaymentId = paymentEntity.optString("id", razorpayPaymentId).trim();
//                        razorpayOrderId = paymentEntity.optString("order_id", razorpayOrderId).trim();
//                        status = "payment.captured".equals(event) ? "paid" : "failed";
//                        if (subscriptionId.isEmpty()) {
//                            subscriptionId = paymentEntity.optString("subscription_id", "").trim();
//                        }
//                    }
//                }
//            }
//
//            log.info("Extracted: SubscriptionID={}, OrderID={}, PaymentID={}, Status={}", subscriptionId, razorpayOrderId, razorpayPaymentId, status);
//
//            if (!subscriptionId.isEmpty()) {
//                log.info("Processing as auto-pay/subscription event (subscriptionId detected)");
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status, subscriptionId);
//                return ResponseEntity.ok("Subscription event processed");
//            } else if (!razorpayOrderId.isEmpty()) {
//                log.info("Processing as one-time invoice payment event (no subscriptionId)");
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status, null);
//                return ResponseEntity.ok("Payment event processed");
//            } else {
//                log.warn("No valid IDs found in payload");
//                return ResponseEntity.badRequest().body("Invalid payload - missing IDs");
//            }
//        } catch (Exception e) {
//            log.error("Error processing webhook: {}", e.getMessage(), e);
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook: " + e.getMessage());
//        }
//    }
//
//    // Fetch payment history for a customer
//    @GetMapping("/payments/history/{customerId}")
//    public ResponseEntity<List<Payment>> getPaymentHistory(@PathVariable String customerId) {
//        log.info("Fetching payment history for customerId: {}", customerId);
//        List<Payment> payments = customerService.getPaymentHistory(customerId);
//        if (payments.isEmpty()) {
//            log.warn("No payments found for customerId: {}", customerId);
//        }
//        return ResponseEntity.ok(payments);
//    }
//
//    // Fetch a single invoice by ID
//    @GetMapping("/invoices/{invoiceId}")
//    public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
//        Optional<Invoice> invoice = customerService.getInvoiceById(invoiceId);
//        return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//
//    // Fetch policy names by IDs
//    @PostMapping("/policies/names")
//    public ResponseEntity<List<String>> getPolicyNamesByIds(@RequestBody List<String> policyIds) {
//        List<String> names = customerService.getPolicyNamesByIds(policyIds);
//        return ResponseEntity.ok(names);
//    }
//
//    // Enable autopay for an invoice (legacy method)
//    @PostMapping("/autopay/enable/{invoiceId}")
//    public ResponseEntity<String> enableAutoPay(@PathVariable String invoiceId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPay(customerId, invoiceId, months, amount);
//        return ResponseEntity.ok("Autopay enabled. Subscription ID: " + subscriptionId);
//    }
//
//    // Enable autopay per policy (NEW)
//    @PostMapping("/autopay/enable/policy/{policyId}")
//    public ResponseEntity<String> enableAutoPayPolicy(@PathVariable String policyId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPayPolicy(customerId, policyId, months, amount);
//        return ResponseEntity.ok("Autopay enabled for policy. Subscription ID: " + subscriptionId);
//    }
//
//    // Disable autopay with policyId
//    @PostMapping("/autopay/disable")
//    public ResponseEntity<String> disableAutoPay(@RequestBody Map<String, String> body) {
//        String customerId = body.get("customerId");
//        String subscriptionId = body.get("subscriptionId");
//        String policyId = body.get("policyId");
//        customerService.disableAutoPay(customerId, subscriptionId, policyId);
//        return ResponseEntity.ok("Autopay disabled");
//    }
//
//    // Fetch owned policies of customer
//    @GetMapping("/policies/owned/{customerId}")
//    public ResponseEntity<List<Policy>> getOwnedPolicies(@PathVariable String customerId) {
//        log.info("Fetching owned policies for customerId: {}", customerId);
//        List<Policy> policies = customerService.getOwnedPolicies(customerId);
//        return ResponseEntity.ok(policies);
//    }
//}
//


//// src/main/java/training/iqgateway/controller/CustomerController.java
//// Unified code that works for BOTH one-time invoice payments and auto-pay (subscription) events
//// FIX: Forces auto-pay branch if subscriptionId is present (even if orderId is in payload), avoiding "Invoice not found"
// // Null-safe parsing, extra logging for debugging
//
//package training.iqgateway.controller;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import training.iqgateway.entity.Invoice;
//import training.iqgateway.entity.Payment;
//import training.iqgateway.entity.Policy;
//import training.iqgateway.service.CustomerService;
//
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//
//import org.json.JSONObject; // For JSON parsing
//import org.springframework.http.HttpStatus;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import com.razorpay.Utils;
//
//@RestController
//@RequestMapping("/api/customer")
//public class CustomerController {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
//
//    @Autowired
//    private CustomerService customerService;
//    
//    @Value("${razorpay.webhook_secret}")
//    private String webhookSecret;
//
//    // Get unpaid invoices for logged-in customer
//    @GetMapping("/invoices/unpaid/{customerId}")
//    public ResponseEntity<List<Invoice>> getUnpaidInvoices(@PathVariable String customerId) {
//        log.info("Fetching unpaid invoices for customerId: {}", customerId);
//        List<Invoice> invoices = customerService.getUnpaidInvoices(customerId);
//        return ResponseEntity.ok(invoices);
//    }
//
//    // Webhook endpoint for Razorpay (updates after payment or subscription events)
//    @PostMapping("/webhook")
//    public ResponseEntity<String> handleWebhook(@RequestBody String payload, 
//                                               @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
//        log.info("Webhook received. Raw payload: {}", payload);
//        if (signature != null) {
//            try {
//                Utils.verifyWebhookSignature(payload, signature, webhookSecret);
//                log.info("Webhook signature verified successfully");
//            } catch (Exception e) {
//                log.error("Webhook signature verification failed", e);
//                return ResponseEntity.badRequest().body("Invalid signature");
//            }
//        } else {
//            log.warn("Signature not provided - skipping verification for test");
//        }
//
//        try {
//            // Parse payload
//            JSONObject jsonPayload = new JSONObject(payload);
//            String event = jsonPayload.optString("event", "unknown");
//            log.info("Parsed event: {}", event);
//
//            // Extract fields with null-safe defaults
//            String subscriptionId = "";
//            String razorpayPaymentId = "";
//            String razorpayOrderId = "";
//            String status = "";
//
//            JSONObject payloadObj = jsonPayload.optJSONObject("payload");
//            if (payloadObj != null) {
//                // Extract from subscription if present
//                JSONObject subEntity = payloadObj.optJSONObject("subscription");
//                if (subEntity != null) {
//                    subEntity = subEntity.optJSONObject("entity");
//                    if (subEntity != null) {
//                        subscriptionId = subEntity.optString("id", "").trim();
//                        razorpayOrderId = subEntity.optString("order_id", "").trim();
//                        razorpayPaymentId = subEntity.optString("latest_payment_id", "").trim();
//                        status = "subscription.charged".equals(event) ? "paid" : "cancelled";
//                    }
//                }
//
//                // Extract from payment if present (supplement or fallback)
//                JSONObject paymentEntity = payloadObj.optJSONObject("payment");
//                if (paymentEntity != null) {
//                    paymentEntity = paymentEntity.optJSONObject("entity");
//                    if (paymentEntity != null) {
//                        razorpayPaymentId = paymentEntity.optString("id", razorpayPaymentId).trim();
//                        razorpayOrderId = paymentEntity.optString("order_id", razorpayOrderId).trim();
//                        status = "payment.captured".equals(event) ? "paid" : "failed";
//                        if (subscriptionId.isEmpty()) {
//                            subscriptionId = paymentEntity.optString("subscription_id", "").trim();
//                        }
//                    }
//                }
//            }
//
//            log.info("Extracted: SubscriptionID={}, OrderID={}, PaymentID={}, Status={}", subscriptionId, razorpayOrderId, razorpayPaymentId, status);
//            
//            // Process: If subscriptionId is present, always use auto-pay logic (skip invoice)
//            if (!subscriptionId.isEmpty()) {
//                log.info("Processing as auto-pay/subscription event (subscriptionId detected)");
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status, subscriptionId);
//                return ResponseEntity.ok("Subscription event processed");
//            } else if (!razorpayOrderId.isEmpty()) {
//                log.info("Processing as one-time invoice payment event (no subscriptionId)");
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status, null);
//                return ResponseEntity.ok("Payment event processed");
//            } else {
//                log.warn("No valid IDs found in payload");
//                return ResponseEntity.badRequest().body("Invalid payload - missing IDs");
//            }
//            
//            
//            
//        } catch (Exception e) {
//            log.error("Error processing webhook: {}", e.getMessage(), e);
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook: " + e.getMessage());
//        }
//    }
//
//    // Fetch payment history for a customer
//    @GetMapping("/payments/history/{customerId}")
//    public ResponseEntity<List<Payment>> getPaymentHistory(@PathVariable String customerId) {
//        log.info("Fetching payment history for customerId: {}", customerId);
//        List<Payment> payments = customerService.getPaymentHistory(customerId);
//        if (payments.isEmpty()) {
//            log.warn("No payments found for customerId: {}", customerId);
//        }
//        return ResponseEntity.ok(payments);
//    }
//
//    // Fetch a single invoice by ID (for policyIds)
//    @GetMapping("/invoices/{invoiceId}")
//    public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
//      Optional<Invoice> invoice = customerService.getInvoiceById(invoiceId);
//      return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//
//    // Fetch policy names by IDs
//    @PostMapping("/policies/names")
//    public ResponseEntity<List<String>> getPolicyNamesByIds(@RequestBody List<String> policyIds) {
//      List<String> names = customerService.getPolicyNamesByIds(policyIds);
//      return ResponseEntity.ok(names);
//    }
//
//    // Existing: Enable autopay for an invoice (kept for compatibility)
//    @PostMapping("/autopay/enable/{invoiceId}")
//    public ResponseEntity<String> enableAutoPay(@PathVariable String invoiceId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPay(customerId, invoiceId, months, amount);
//        return ResponseEntity.ok("Autopay enabled. Subscription ID: " + subscriptionId);
//    }
//
//    // NEW: Enable autopay per policy
//    @PostMapping("/autopay/enable/policy/{policyId}")
//    public ResponseEntity<String> enableAutoPayPolicy(@PathVariable String policyId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPayPolicy(customerId, policyId, months, amount); // Calls new service method
//        return ResponseEntity.ok("Autopay enabled for policy. Subscription ID: " + subscriptionId);
//    }
//
//    // Updated: Disable autopay with policyId
//    @PostMapping("/autopay/disable")
//    public ResponseEntity<String> disableAutoPay(@RequestBody Map<String, String> body) {
//        String customerId = body.get("customerId");
//        String subscriptionId = body.get("subscriptionId");
//        String policyId = body.get("policyId"); // NEW
//        customerService.disableAutoPay(customerId, subscriptionId, policyId);
//        return ResponseEntity.ok("Autopay disabled");
//    }
//
//    // NEW: Fetch customer's owned policies
//    @GetMapping("/policies/owned/{customerId}")
//    public ResponseEntity<List<Policy>> getOwnedPolicies(@PathVariable String customerId) {
//        log.info("Fetching owned policies for customerId: {}", customerId);
//        List<Policy> policies = customerService.getOwnedPolicies(customerId);
//        return ResponseEntity.ok(policies);
//    }
//}
//


//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import training.iqgateway.entity.Invoice;
//import training.iqgateway.entity.Payment;
//import training.iqgateway.entity.Policy;
//import training.iqgateway.service.CustomerService;
//
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//
//import org.json.JSONObject; // For JSON parsing
//import org.springframework.http.HttpStatus;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import com.razorpay.Utils;
//
//@RestController
//@RequestMapping("/api/customer")
//public class CustomerController {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
//
//    @Autowired
//    private CustomerService customerService;
//    
//    @Value("${razorpay.webhook_secret}")
//    private String webhookSecret;
//
//
//    // Get unpaid invoices for logged-in customer
//    @GetMapping("/invoices/unpaid/{customerId}")
//    public ResponseEntity<List<Invoice>> getUnpaidInvoices(@PathVariable String customerId) {
//        log.info("Fetching unpaid invoices for customerId: {}", customerId);
//        List<Invoice> invoices = customerService.getUnpaidInvoices(customerId);
//        return ResponseEntity.ok(invoices);
//    }
//
//    // Webhook endpoint for Razorpay (updates after payment or subscription events)
//    @PostMapping("/webhook")
//    public ResponseEntity<String> handleWebhook(@RequestBody String payload, 
//                                               @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
//        log.info("Webhook received. Raw payload: {}", payload);
//        // TODO: Verify signature if present (for production)
//        if (signature != null) {
//        	  try {
//        	    Utils.verifyWebhookSignature(payload, signature, webhookSecret);  // Use the injected secret here
//        	    log.info("Webhook signature verified successfully");
//        	  } catch (Exception e) {
//        	    log.error("Webhook signature verification failed", e);
//        	    return ResponseEntity.badRequest().body("Invalid signature");
//        	  }
//        	} else {
//        	  log.warn("Signature not provided - skipping verification for test");
//        	}
//
////        if (signature != null) {
////          try {
////            Utils.verifyWebhookSignature(payload, signature, "My_Secret_Key"); // Use your webhook secret
////            log.info("Webhook signature verified successfully");
////          } catch (Exception e) {
////            log.error("Webhook signature verification failed", e);
////            return ResponseEntity.badRequest().body("Invalid signature");
////          }
////        } else {
////          log.warn("Signature not provided - skipping verification for test");
////        }
//
//        try {
//            // Parse payload
//            JSONObject jsonPayload = new JSONObject(payload);
//            String event = jsonPayload.getString("event");
//            log.info("Parsed event: {}", event);
//
//            if ("payment.captured".equals(event) || "payment.failed".equals(event)) {
//                JSONObject paymentEntity = jsonPayload.getJSONObject("payload").getJSONObject("payment").getJSONObject("entity");
//                String razorpayPaymentId = paymentEntity.getString("id").trim(); // Trim to avoid spacing issues
//                String razorpayOrderId = paymentEntity.getString("order_id").trim(); // Trim to avoid spacing issues
//                String status = "payment.captured".equals(event) ? "paid" : "failed";
//                log.info("Processing payment: ID={}, Order={}, Status={}", razorpayPaymentId, razorpayOrderId, status);
//
//                // Call service with extracted values (no subscription for one-time payments)
//                log.info("Looking up invoice for order_id: {}", razorpayOrderId);
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status, null);
//                return ResponseEntity.ok(event.equals("payment.captured") ? "Payment processed successfully" : "Payment failure processed");
//            } else if ("subscription.charged".equals(event) || "subscription.cancelled".equals(event)) {
//                JSONObject subEntity = jsonPayload.getJSONObject("payload").getJSONObject("subscription").getJSONObject("entity");
//                String subscriptionId = subEntity.getString("id").trim();
//                String orderId = subEntity.optString("order_id", "").trim(); // May be optional
//                String paymentId = subEntity.optString("latest_payment_id", "").trim(); // Adjust based on actual payload
//                String subStatus = "subscription.charged".equals(event) ? "paid" : "cancelled";
//                log.info("Processing subscription: ID={}, Order={}, PaymentID={}, Status={}", subscriptionId, orderId, paymentId, subStatus);
//
//                customerService.processPayment(orderId, paymentId, subStatus, subscriptionId);
//                return ResponseEntity.ok("Subscription event processed");
//            }
//
//            log.info("Webhook event received but not processed: {}", event);
//            return ResponseEntity.ok("Webhook event received but not processed");
//        } catch (Exception e) {
//            log.error("Error processing webhook: {}", e.getMessage(), e);
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook: " + e.getMessage());
//        }
//    }
//
//    // Fetch payment history for a customer
//    @GetMapping("/payments/history/{customerId}")
//    public ResponseEntity<List<Payment>> getPaymentHistory(@PathVariable String customerId) {
//        log.info("Fetching payment history for customerId: {}", customerId);
//        List<Payment> payments = customerService.getPaymentHistory(customerId);
//        if (payments.isEmpty()) {
//            log.warn("No payments found for customerId: {}", customerId);
//        }
//        return ResponseEntity.ok(payments);
//    }
//
//    // Fetch a single invoice by ID (for policyIds)
//    @GetMapping("/invoices/{invoiceId}")
//    public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
//      Optional<Invoice> invoice = customerService.getInvoiceById(invoiceId);
//      return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//
//    // Fetch policy names by IDs
//    @PostMapping("/policies/names")
//    public ResponseEntity<List<String>> getPolicyNamesByIds(@RequestBody List<String> policyIds) {
//      List<String> names = customerService.getPolicyNamesByIds(policyIds);
//      return ResponseEntity.ok(names);
//    }
//
//    // Existing: Enable autopay for an invoice (kept for compatibility)
//    @PostMapping("/autopay/enable/{invoiceId}")
//    public ResponseEntity<String> enableAutoPay(@PathVariable String invoiceId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPay(customerId, invoiceId, months, amount);
//        return ResponseEntity.ok("Autopay enabled. Subscription ID: " + subscriptionId);
//    }
//
//    // NEW: Enable autopay per policy
//    @PostMapping("/autopay/enable/policy/{policyId}")
//    public ResponseEntity<String> enableAutoPayPolicy(@PathVariable String policyId, @RequestBody Map<String, Object> body) {
//        String customerId = (String) body.get("customerId");
//        int months = (int) body.get("months");
//        double amount = ((Number) body.get("amount")).doubleValue();
//        String subscriptionId = customerService.enableAutoPayPolicy(customerId, policyId, months, amount); // Calls new service method
//        return ResponseEntity.ok("Autopay enabled for policy. Subscription ID: " + subscriptionId);
//    }
//
//    // Updated: Disable autopay with policyId
//    @PostMapping("/autopay/disable")
//    public ResponseEntity<String> disableAutoPay(@RequestBody Map<String, String> body) {
//        String customerId = body.get("customerId");
//        String subscriptionId = body.get("subscriptionId");
//        String policyId = body.get("policyId"); // NEW
//        customerService.disableAutoPay(customerId, subscriptionId, policyId);
//        return ResponseEntity.ok("Autopay disabled");
//    }
//
//    // NEW: Fetch customer's owned policies
//    @GetMapping("/policies/owned/{customerId}")
//    public ResponseEntity<List<Policy>> getOwnedPolicies(@PathVariable String customerId) {
//        log.info("Fetching owned policies for customerId: {}", customerId);
//        List<Policy> policies = customerService.getOwnedPolicies(customerId);
//        return ResponseEntity.ok(policies);
//    }
//}
//










//// src/main/java/training/iqgateway/controller/CustomerController.java
//// Updated with additional logging for raw payload and error handling
//package training.iqgateway.controller;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import training.iqgateway.entity.Invoice;
//import training.iqgateway.entity.Payment;
//import training.iqgateway.service.CustomerService;
//
//import java.util.List;
//import java.util.Optional;
//
//import org.json.JSONObject; // For JSON parsing
//import org.springframework.http.HttpStatus;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import com.razorpay.Utils;
//
//@RestController
//@RequestMapping("/api/customer")
//public class CustomerController {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
//
//    @Autowired
//    private CustomerService customerService;
//
//    // Get unpaid invoices for logged-in customer
//    @GetMapping("/invoices/unpaid/{customerId}")
//    public ResponseEntity<List<Invoice>> getUnpaidInvoices(@PathVariable String customerId) {
//        log.info("Fetching unpaid invoices for customerId: {}", customerId);
//        List<Invoice> invoices = customerService.getUnpaidInvoices(customerId);
//        return ResponseEntity.ok(invoices);
//    }
//
//    // Webhook endpoint for Razorpay (updates after payment)
//    @PostMapping("/webhook")
//    public ResponseEntity<String> handleWebhook(@RequestBody String payload, 
//                                               @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
//        log.info("Webhook received. Raw payload: {}", payload); // Added logging for raw payload as requested
//        log.info("Webhook received. Raw payload: {}", payload);
//        // TODO: Verify signature if present (for production)
//        if (signature != null) {
//          try {
//            Utils.verifyWebhookSignature(payload, signature, "My_Secret_Key"); // Use your webhook secret
//            log.info("Webhook signature verified successfully");
//          } catch (Exception e) {
//            log.error("Webhook signature verification failed", e);
//            return ResponseEntity.badRequest().body("Invalid signature");
//          }
//        } else {
//          log.warn("Signature not provided - skipping verification for test");
//        }
//
//        try {
//            // Parse payload
//            JSONObject jsonPayload = new JSONObject(payload);
//            String event = jsonPayload.getString("event");
//            log.info("Parsed event: {}", event);
//
//            if ("payment.captured".equals(event) || "payment.failed".equals(event)) {
//                JSONObject paymentEntity = jsonPayload.getJSONObject("payload").getJSONObject("payment").getJSONObject("entity");
//                String razorpayPaymentId = paymentEntity.getString("id").trim(); // Trim to avoid spacing issues
//                String razorpayOrderId = paymentEntity.getString("order_id").trim(); // Trim to avoid spacing issues
//                String status = "payment.captured".equals(event) ? "paid" : "failed";
//                log.info("Processing payment: ID={}, Order={}, Status={}", razorpayPaymentId, razorpayOrderId, status);
//
//                // Call service with extracted values
//                log.info("Looking up invoice for order_id: {}", razorpayOrderId);
//
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status);
//                return ResponseEntity.ok(event.equals("payment.captured") ? "Payment processed successfully" : "Payment failure processed");
//            }
//
//            log.info("Webhook event received but not processed: {}", event);
//            return ResponseEntity.ok("Webhook event received but not processed");
//        } catch (Exception e) {
//            log.error("Error processing webhook: {}", e.getMessage(), e);
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook: " + e.getMessage());
//        }
//    }
//
//    // Fetch payment history for a customer
//    @GetMapping("/payments/history/{customerId}")
//    public ResponseEntity<List<Payment>> getPaymentHistory(@PathVariable String customerId) {
//        log.info("Fetching payment history for customerId: {}", customerId);
//        List<Payment> payments = customerService.getPaymentHistory(customerId);
//        if (payments.isEmpty()) {
//            log.warn("No payments found for customerId: {}", customerId);
//        }
//        return ResponseEntity.ok(payments);
//    }
//
//    // Fetch a single invoice by ID (for policyIds)
//    @GetMapping("/invoices/{invoiceId}")
//    public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
//      Optional<Invoice> invoice = customerService.getInvoiceById(invoiceId);
//      return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//
//    // Fetch policy names by IDs
//    @PostMapping("/policies/names")
//    public ResponseEntity<List<String>> getPolicyNamesByIds(@RequestBody List<String> policyIds) {
//      List<String> names = customerService.getPolicyNamesByIds(policyIds);
//      return ResponseEntity.ok(names);
//    }
//}
//
//




//// src/main/java/training/iqgateway/controller/CustomerController.java
//// Updated with additional logging for raw payload and error handling
//package training.iqgateway.controller;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import training.iqgateway.entity.Invoice;
//import training.iqgateway.entity.Payment;
//import training.iqgateway.service.CustomerService;
//
//import java.util.List;
//import java.util.Optional;
//
//import org.json.JSONObject; // For JSON parsing
//import org.springframework.http.HttpStatus;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import com.razorpay.Utils;
//
//@RestController
//@RequestMapping("/api/customer")
//public class CustomerController {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
//
//    @Autowired
//    private CustomerService customerService;
//
//    // Get unpaid invoices for logged-in customer
//    @GetMapping("/invoices/unpaid/{customerId}")
//    public ResponseEntity<List<Invoice>> getUnpaidInvoices(@PathVariable String customerId) {
//        log.info("Fetching unpaid invoices for customerId: {}", customerId);
//        List<Invoice> invoices = customerService.getUnpaidInvoices(customerId);
//        return ResponseEntity.ok(invoices);
//    }
//
//    // Webhook endpoint for Razorpay (updates after payment)
//    @PostMapping("/webhook")
//    public ResponseEntity<String> handleWebhook(@RequestBody String payload, 
//                                               @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
//        log.info("Webhook received. Raw payload: {}", payload); // Added logging for raw payload as requested
//        log.info("Webhook received. Raw payload: {}", payload);
//        // TODO: Verify signature if present (for production)
//        if (signature != null) {
//        	  try {
//        	    Utils.verifyWebhookSignature(payload, signature, "My_Secret_Key"); // Use your webhook secret
//        	    log.info("Webhook signature verified successfully");
//        	  } catch (Exception e) {
//        	    log.error("Webhook signature verification failed", e);
//        	    return ResponseEntity.badRequest().body("Invalid signature");
//        	  }
//        	} else {
//        	  log.warn("Signature not provided - skipping verification for test");
//        	}
//
//        try {
//            // Parse payload
//            JSONObject jsonPayload = new JSONObject(payload);
//            String event = jsonPayload.getString("event");
//            log.info("Parsed event: {}", event);
//
//            if ("payment.captured".equals(event) || "payment.failed".equals(event)) {
//                JSONObject paymentEntity = jsonPayload.getJSONObject("payload").getJSONObject("payment").getJSONObject("entity");
//                String razorpayPaymentId = paymentEntity.getString("id").trim(); // Trim to avoid spacing issues
//                String razorpayOrderId = paymentEntity.getString("order_id").trim(); // Trim to avoid spacing issues
//                String status = "payment.captured".equals(event) ? "paid" : "failed";
//                log.info("Processing payment: ID={}, Order={}, Status={}", razorpayPaymentId, razorpayOrderId, status);
//
//                // Call service with extracted values
//                log.info("Looking up invoice for order_id: {}", razorpayOrderId);
//
//                customerService.processPayment(razorpayOrderId, razorpayPaymentId, status);
//                return ResponseEntity.ok(event.equals("payment.captured") ? "Payment processed successfully" : "Payment failure processed");
//            }
//
//            log.info("Webhook event received but not processed: {}", event);
//            return ResponseEntity.ok("Webhook event received but not processed");
//        } catch (Exception e) {
//            log.error("Error processing webhook: {}", e.getMessage(), e);
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook: " + e.getMessage());
//        }
//    }
// // Add or update this in CustomerController.java
//    @GetMapping("/payments/history/{customerId}")
//    public ResponseEntity<List<Payment>> getPaymentHistory(@PathVariable String customerId) {
//        log.info("Fetching payment history for customerId: {}", customerId);
//        List<Payment> payments = customerService.getPaymentHistory(customerId);
//        if (payments.isEmpty()) {
//            log.warn("No payments found for customerId: {}", customerId);
//        }
//        return ResponseEntity.ok(payments);
//    }
//    
// //// Fetch a single invoice by ID (for policyIds)
//    @GetMapping("/invoices/{invoiceId}")
//    public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
//      Optional<Invoice> invoice = customerService.getInvoiceById(invoiceId);
//      return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//
//    // Fetch policy names by IDs (new endpoint)
//    @PostMapping("/policies/names")
//    public ResponseEntity<List<String>> getPolicyNamesByIds(@RequestBody List<String> policyIds) {
//      List<String> names = customerService.getPolicyNamesByIds(policyIds);
//      return ResponseEntity.ok(names);
//    }
//
//
//
//}
