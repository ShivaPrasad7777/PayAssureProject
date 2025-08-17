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
    
 // Add import org.springframework.data.domain.Page;
 // Add import org.springframework.data.domain.Pageable;

 @GetMapping("/invoices/history/{customerId}")
 public ResponseEntity<List<Invoice>> getInvoiceHistory(@PathVariable String customerId) {
     List<Invoice> invoices = customerService.getInvoiceHistory(customerId);
     return ResponseEntity.ok(invoices);
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
