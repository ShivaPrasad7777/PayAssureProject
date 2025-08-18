package com.example.controller;

import com.example.dto.CustomerSummary;
import com.example.dto.PolicySummary;
import com.example.model.Customer;
import com.example.model.Invoice;
import com.example.model.InvoiceRequest;
import com.example.model.Payment;
import com.example.model.Policy;
import com.example.service.InsurerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.razorpay.RazorpayException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/insurer")
public class InsurerController {

    @Autowired
    private InsurerService billingService;

    // Create invoice (multi-policy support)
    @PostMapping("/invoices")
    public ResponseEntity<Invoice> createInvoice(@RequestBody InvoiceRequest request) {
        try {
            Invoice invoice = billingService.createInvoice(
                    request.getCustomerId(),
                    request.getPolicyIds(),
                    request.getInsurerId(),
                    request.getValidUpto(),
                    request.getMonths()
            );
            return new ResponseEntity<>(invoice, HttpStatus.CREATED);
        } catch (RazorpayException e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
        }
    }

    // Razorpay webhook endpoint - keep necessary for payment confirmation.
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(@RequestBody String payload, @RequestHeader("X-Razorpay-Signature") String signature) {
        // TODO: Implement signature verification using Razorpay utils.
        JSONObject jsonPayload = new JSONObject(payload);
        String event = jsonPayload.getString("event");

        if ("payment.captured".equals(event)) {
            JSONObject paymentEntity = jsonPayload.getJSONObject("payload").getJSONObject("payment").getJSONObject("entity");
            String razorpayPaymentId = paymentEntity.getString("id");
            String razorpayOrderId = paymentEntity.getString("order_id");
            String status = "success";
            billingService.verifyPayment(razorpayPaymentId, razorpayOrderId, status);
            return new ResponseEntity<>("Payment verified and processed", HttpStatus.OK);
        }
        return new ResponseEntity<>("Webhook event received but not processed", HttpStatus.OK);
    }

    // Fetch unpaid customers
    @GetMapping("/customers/unpaid")
    public ResponseEntity<List<CustomerSummary>> getUnpaidCustomers() {
        List<CustomerSummary> customers = billingService.getUnpaidCustomers();
        return ResponseEntity.ok(customers);
    }

    // Fetch unpaid/failed invoices for a customer
    @GetMapping("/customers/{customerId}/unpaid-failed-invoices")
    public ResponseEntity<List<Invoice>> getUnpaidFailedInvoicesForCustomer(@PathVariable String customerId) {
        List<Invoice> invoices = billingService.getUnpaidFailedInvoicesForCustomer(customerId);
        return ResponseEntity.ok(invoices);
    }

    // Fetch unpaid policies for a customer
    @GetMapping("/customers/{customerId}/unpaid-policies")
    public ResponseEntity<List<PolicySummary>> getUnpaidPoliciesForCustomer(@PathVariable String customerId) {
        List<PolicySummary> policies = billingService.getUnpaidPoliciesForCustomer(customerId);
        return ResponseEntity.ok(policies);
    }

    // Bulk pay by cash endpoint for multiple invoices
    @PostMapping("/invoices/pay-by-cash")
    public ResponseEntity<String> payByCashMultiple(@RequestBody Map<String, List<String>> body) {
        List<String> invoiceIds = body.getOrDefault("invoiceIds", new ArrayList<>());
        if (invoiceIds.isEmpty()) {
            return ResponseEntity.badRequest().body("No invoiceIds provided");
        }
        try {
            billingService.processCashPaymentMultiple(invoiceIds);
            return ResponseEntity.ok("Cash payment processed successfully for selected invoices");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Fetch all payment history (system-wide)
    @GetMapping("/payments/history")
    public ResponseEntity<List<Payment>> getAllPaymentHistory() {
        List<Payment> payments = billingService.getAllPaymentHistory();
        return ResponseEntity.ok(payments);
    }

    // Fetch customer by ID
    @GetMapping("/customers/{customerId}")
    public ResponseEntity<Customer> getCustomerById(@PathVariable String customerId) {
        Optional<Customer> customer = billingService.getCustomerById(customerId);
        return customer.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Fetch invoice by ID
    @GetMapping("/invoices/{invoiceId}")
    public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
        Optional<Invoice> invoice = billingService.getInvoiceById(invoiceId);
        return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Fetch policies by list of IDs
    @PostMapping("/policies/names")
    public ResponseEntity<List<Policy>> getPoliciesByIds(@RequestBody List<String> policyIds) {
        List<Policy> policies = billingService.getPoliciesByIds(policyIds);
        return ResponseEntity.ok(policies);
    }

    // Fetch all invoice history
    @GetMapping("/invoices/history")
    public ResponseEntity<List<Invoice>> getAllInvoiceHistory() {
        List<Invoice> invoices = billingService.getAllInvoiceHistory();
        return ResponseEntity.ok(invoices);
    }

    // Search customers by name (partial case-insensitive match)
    @GetMapping("/customers/search")
    public ResponseEntity<List<CustomerSummary>> searchCustomersByName(@RequestParam String name) {
        List<CustomerSummary> customers = billingService.searchCustomersByName(name);
        return ResponseEntity.ok(customers);
    }
}





















//// BillingController.java
//package com.example.controller;
//
//import com.example.dto.CustomerSummary;
//import com.example.dto.PolicySummary;
//import com.example.model.Customer;
//import com.example.model.Invoice;
//import com.example.model.InvoiceRequest;
//import com.example.model.Payment;
//import com.example.model.PaymentInitiateRequest;
//import com.example.model.Policy;
//import com.example.service.InsurerService;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import com.razorpay.RazorpayException;
//import org.json.JSONObject;
//
//import java.util.ArrayList;
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//
//@RestController // Class-level (kept for all methods)
//@RequestMapping("/api/insurer")
//public class InsurerController {
//
//    @Autowired
//    private InsurerService billingService;
//
//    // Create invoice (handles multi-policy and returns list)
//    @PostMapping("/invoices")
//    public ResponseEntity<Invoice> createInvoice(@RequestBody InvoiceRequest request) {
//        try {
//            Invoice invoice = billingService.createInvoice(
//                    request.getCustomerId(),
//                    request.getPolicyIds(),
//                    request.getInsurerId(),
//                    request.getValidUpto(),
//                    request.getMonths()
//            );
//            return new ResponseEntity<>(invoice, HttpStatus.CREATED);
//        } catch (RazorpayException e) {
//            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
//        } catch (RuntimeException e) {
//            return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
//        }
//    }
//
//    // Initiate payment
//    @PostMapping("/payments/initiate")
//    public ResponseEntity<String> initiatePayment(@RequestBody PaymentInitiateRequest request) {
//        try {
//            String orderId = billingService.initiatePayment(request.getInvoiceId(), request.getCustomerId());
//            return new ResponseEntity<>(orderId, HttpStatus.OK);
//        } catch (RazorpayException e) {
//            return new ResponseEntity<>("Error initiating payment: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
//        } catch (RuntimeException e) {
//            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
//        }
//    }
//
//    // Webhook endpoint
//    @PostMapping("/webhook")
//    public ResponseEntity<String> handleWebhook(@RequestBody String payload, @RequestHeader("X-Razorpay-Signature") String signature) {
//        // TODO: Verify signature using Razorpay utils
//        JSONObject jsonPayload = new JSONObject(payload);
//        String event = jsonPayload.getString("event");
//
//        if ("payment.captured".equals(event)) {
//            JSONObject paymentEntity = jsonPayload.getJSONObject("payload").getJSONObject("payment").getJSONObject("entity");
//            String razorpayPaymentId = paymentEntity.getString("id");
//            String razorpayOrderId = paymentEntity.getString("order_id");
//            String status = "success";
//            billingService.verifyPayment(razorpayPaymentId, razorpayOrderId, status);
//            return new ResponseEntity<>("Payment verified and processed", HttpStatus.OK);
//        }
//
//        return new ResponseEntity<>("Webhook event received but not processed", HttpStatus.OK);
//    }
//  
//    // NEW: Fetch unpaid customers
//    @GetMapping("/customers/unpaid")
//    public ResponseEntity<List<CustomerSummary>> getUnpaidCustomers() {
//        List<CustomerSummary> customers = billingService.getUnpaidCustomers();
//        return ResponseEntity.ok(customers);
//    }
//    
//    @GetMapping("/customers/{customerId}/unpaid-failed-invoices")
//    public ResponseEntity<List<Invoice>> getUnpaidFailedInvoicesForCustomer(@PathVariable String customerId) {
//        List<Invoice> invoices = billingService.getUnpaidFailedInvoicesForCustomer(customerId);
//        return ResponseEntity.ok(invoices);
//    }
//    // NEW: Fetch unpaid policies for a customer
//    @GetMapping("/customers/{customerId}/unpaid-policies")
//    public ResponseEntity<List<PolicySummary>> getUnpaidPoliciesForCustomer(@PathVariable String customerId) {
//        List<PolicySummary> policies = billingService.getUnpaidPoliciesForCustomer(customerId);
//        return ResponseEntity.ok(policies);
//    }
//    
// // Add this to your BillingController.java
// // NEW: Pay by cash endpoint
// @PostMapping("/invoices/{invoiceId}/pay-by-cash")
// public ResponseEntity<String> payByCash(@PathVariable String invoiceId) {
//     try {
//         billingService.processCashPayment(invoiceId);
//         return new ResponseEntity<>("Cash payment processed successfully", HttpStatus.OK);
//     } catch (RuntimeException e) {
//         return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
//     }
// }
// 
// @GetMapping("/payments/history")
// public ResponseEntity<List<Payment>> getAllPaymentHistory() {
//     List<Payment> payments = billingService.getAllPaymentHistory();
//     return ResponseEntity.ok(payments);
// }
// 
////Add these to BillingController.java (or your main controller file)
//
////NEW: Fetch a single customer by ID (for name)
//@GetMapping("/customers/{customerId}")
//public ResponseEntity<Customer> getCustomerById(@PathVariable String customerId) {
//  Optional<Customer> customer = billingService.getCustomerById(customerId);
//  return customer.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//}
//
////NEW: Fetch a single invoice by ID (for policyIds)
//@GetMapping("/invoices/{invoiceId}")
//public ResponseEntity<Invoice> getInvoiceById(@PathVariable String invoiceId) {
//  Optional<Invoice> invoice = billingService.getInvoiceById(invoiceId);
//  return invoice.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//}
//
//@PostMapping("/policies/names")
//public ResponseEntity<List<Policy>> getPoliciesByIds(@RequestBody List<String> policyIds) {  // Note: Method name is getPoliciesByIds
//    List<Policy> policies = billingService.getPoliciesByIds(policyIds);  // Calls the service method
//    return ResponseEntity.ok(policies);
//}
//
////NEW: Endpoint to fetch all invoice history
//@GetMapping("/invoices/history")
//public ResponseEntity<List<Invoice>> getAllInvoiceHistory() {
// List<Invoice> invoices = billingService.getAllInvoiceHistory();
// return ResponseEntity.ok(invoices);
//}
////Add to BillingController.java
//
////NEW: Search customers by name
//@GetMapping("/customers/search")
//public ResponseEntity<List<CustomerSummary>> searchCustomersByName(@RequestParam String name) {
// List<CustomerSummary> customers = billingService.searchCustomersByName(name);
// return ResponseEntity.ok(customers);
//}
//
////In BillingController.java (full corrected method)
//@PostMapping("/invoices/pay-by-cash")
//public ResponseEntity<String> payByCashMultiple(@RequestBody Map<String, List<String>> body) {
// List<String> invoiceIds = body.getOrDefault("invoiceIds", new ArrayList<>());
// if (invoiceIds.isEmpty()) {
//     return ResponseEntity.badRequest().body("No invoiceIds provided");
// }
// try {
//     billingService.processCashPaymentMultiple(invoiceIds);
//     return ResponseEntity.ok("Cash payment processed successfully for selected invoices");
// } catch (RuntimeException e) {
//     return ResponseEntity.badRequest().body(e.getMessage());
// }
//}
//}
