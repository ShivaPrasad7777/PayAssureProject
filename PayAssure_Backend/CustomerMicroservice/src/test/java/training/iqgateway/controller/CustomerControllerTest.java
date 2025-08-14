package training.iqgateway.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import training.iqgateway.entity.*;
import training.iqgateway.service.CustomerService;
import training.iqgateway.repository.CustomerRepository;

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CustomerController.class)
public class CustomerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CustomerService customerService;

    @MockBean
    private CustomerRepository customerRepository;

    @Autowired
    private ObjectMapper objectMapper;

    // Test for unpaid invoices endpoint
    @Test
    public void testGetUnpaidInvoices() throws Exception {
        String customerId = "cust123";

        Invoice invoice1 = new Invoice();
        invoice1.setId("inv1");
        invoice1.setCustomerId(customerId);
        invoice1.setAmount(100.0);
        invoice1.setStatus("unpaid");

        Invoice invoice2 = new Invoice();
        invoice2.setId("inv2");
        invoice2.setCustomerId(customerId);
        invoice2.setAmount(200.0);
        invoice2.setStatus("unpaid");

        List<Invoice> invoices = Arrays.asList(invoice1, invoice2);

        Mockito.when(customerService.getUnpaidInvoices(customerId)).thenReturn(invoices);

        mockMvc.perform(get("/api/customer/invoices/unpaid/{customerId}", customerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is("inv1")))
                .andExpect(jsonPath("$[1].id", is("inv2")));

        Mockito.verify(customerService).getUnpaidInvoices(customerId);
    }

    // Test webhook with "subscription.charged" event success
    @Test
    public void testHandleWebhook_SubscriptionCharged_Success() throws Exception {
        // Prepare JSON payload simulating Razorpay webhook subscription.charged
        JSONObject notes = new JSONObject();
        notes.put("customerId", "cust123");
        notes.put("policyIds", Arrays.asList("policy1", "policy2"));
        notes.put("policyNames", Arrays.asList("Policy One", "Policy Two"));

        JSONObject subscriptionEntity = new JSONObject();
        subscriptionEntity.put("id", "sub123");
        subscriptionEntity.put("order_id", "order123");
        subscriptionEntity.put("notes", notes);

        JSONObject subscription = new JSONObject();
        subscription.put("entity", subscriptionEntity);

        JSONObject paymentEntity = new JSONObject();
        paymentEntity.put("id", "pay123");

        JSONObject payment = new JSONObject();
        payment.put("entity", paymentEntity);

        JSONObject payload = new JSONObject();
        payload.put("subscription", subscription);
        payload.put("payment", payment);

        JSONObject root = new JSONObject();
        root.put("event", "subscription.charged");
        root.put("payload", payload);

        Mockito.doNothing().when(customerService).recordAutopayPayment(
                ArgumentMatchers.eq("cust123"), ArgumentMatchers.eq("sub123"),
                ArgumentMatchers.eq("order123"), ArgumentMatchers.eq("pay123"),
                ArgumentMatchers.anyList(), ArgumentMatchers.anyList());

        mockMvc.perform(post("/api/customer/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(root.toString()))
                .andExpect(status().isOk())
                .andExpect(content().string("Subscription charged event processed"));

        Mockito.verify(customerService).recordAutopayPayment(
                ArgumentMatchers.eq("cust123"), ArgumentMatchers.eq("sub123"),
                ArgumentMatchers.eq("order123"), ArgumentMatchers.eq("pay123"),
                ArgumentMatchers.anyList(), ArgumentMatchers.anyList());
    }

    // Test webhook with "payment.captured" event success
    @Test
    public void testHandleWebhook_PaymentCaptured_Success() throws Exception {
        JSONObject paymentEntity = new JSONObject();
        paymentEntity.put("id", "pay123");
        paymentEntity.put("order_id", "order123");
        paymentEntity.put("customer_id", "cust123");
        paymentEntity.put("invoice_id", "inv123");

        JSONObject payment = new JSONObject();
        payment.put("entity", paymentEntity);

        JSONObject payload = new JSONObject();
        payload.put("payment", payment);

        JSONObject root = new JSONObject();
        root.put("event", "payment.captured");
        root.put("payload", payload);

        Invoice invoice = new Invoice();
        invoice.setId("inv123");
        invoice.setPolicyIds(Arrays.asList("policy1", "policy2"));

        Mockito.when(customerService.getInvoiceById("inv123")).thenReturn(Optional.of(invoice));
        Mockito.when(customerService.getPolicyNamesByIds(invoice.getPolicyIds())).thenReturn(Arrays.asList("Policy One", "Policy Two"));

        Mockito.doNothing().when(customerService).processPayment("order123", "pay123", "paid", null);

        mockMvc.perform(post("/api/customer/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(root.toString()))
                .andExpect(status().isOk())
                .andExpect(content().string("Payment captured event processed"));

        Mockito.verify(customerService).getInvoiceById("inv123");
        Mockito.verify(customerService).getPolicyNamesByIds(invoice.getPolicyIds());
        Mockito.verify(customerService).processPayment("order123", "pay123", "paid", null);
    }

    // Test webhook with invalid payload returns bad request
    @Test
    public void testHandleWebhook_InvalidPayload() throws Exception {
        JSONObject root = new JSONObject();
        root.put("event", "subscription.charged");
        // Missing payload object
        root.put("payload", JSONObject.NULL);

        mockMvc.perform(post("/api/customer/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(root.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Invalid payload"));
    }

    // Test get payment history
    @Test
    public void testGetPaymentHistory() throws Exception {
        String customerId = "cust123";

        Payment payment = new Payment();
        payment.setId("pay1");
        payment.setCustomerId(customerId);
        payment.setAmount(120.0);
        payment.setStatus("paid");

        Mockito.when(customerService.getPaymentHistory(customerId)).thenReturn(Collections.singletonList(payment));

        mockMvc.perform(get("/api/customer/payments/history/{customerId}", customerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is("pay1")))
                .andExpect(jsonPath("$[0].amount", is(120.0)));

        Mockito.verify(customerService).getPaymentHistory(customerId);
    }

    // Test get invoice by id (found)
    @Test
    public void testGetInvoiceById_Found() throws Exception {
        String invoiceId = "inv123";
        Invoice invoice = new Invoice();
        invoice.setId(invoiceId);
        invoice.setCustomerId("cust123");

        Mockito.when(customerService.getInvoiceById(invoiceId)).thenReturn(Optional.of(invoice));

        mockMvc.perform(get("/api/customer/invoices/{invoiceId}", invoiceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(invoiceId)));

        Mockito.verify(customerService).getInvoiceById(invoiceId);
    }

    // Test get invoice by id (not found)
    @Test
    public void testGetInvoiceById_NotFound() throws Exception {
        String invoiceId = "invNotExist";

        Mockito.when(customerService.getInvoiceById(invoiceId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/customer/invoices/{invoiceId}", invoiceId))
                .andExpect(status().isNotFound());

        Mockito.verify(customerService).getInvoiceById(invoiceId);
    }


    // Test get policy names by IDs
    @Test
    public void testGetPolicyNamesByIds() throws Exception {
        List<String> policyIds = Arrays.asList("policy1", "policy2");
        List<String> policyNames = Arrays.asList("Policy One", "Policy Two");

        Mockito.when(customerService.getPolicyNamesByIds(policyIds)).thenReturn(policyNames);

        mockMvc.perform(post("/api/customer/policies/names")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(policyIds)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0]", is("Policy One")))
                .andExpect(jsonPath("$[1]", is("Policy Two")));

        Mockito.verify(customerService).getPolicyNamesByIds(policyIds);
    }

    // Test enable autopay for invoice
    @Test
    public void testEnableAutoPay() throws Exception {
        String invoiceId = "inv123";
        Map<String, Object> body = new HashMap<>();
        body.put("customerId", "cust123");
        body.put("months", 6);
        body.put("amount", 100.0);

        Mockito.when(customerService.enableAutoPay("cust123", invoiceId, 6, 100.0)).thenReturn("sub123");

        mockMvc.perform(post("/api/customer/autopay/enable/{invoiceId}", invoiceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Autopay enabled. Subscription ID: sub123")));

        Mockito.verify(customerService).enableAutoPay("cust123", invoiceId, 6, 100.0);
    }

    // Test enable autopay for policy
    @Test
    public void testEnableAutoPayPolicy() throws Exception {
        String policyId = "policy123";
        Map<String, Object> body = new HashMap<>();
        body.put("customerId", "cust123");
        body.put("months", 12);
        body.put("amount", 150.0);

        Mockito.when(customerService.enableAutoPayPolicy("cust123", policyId, 12, 150.0)).thenReturn("sub456");

        mockMvc.perform(post("/api/customer/autopay/enable/policy/{policyId}", policyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Autopay enabled for policy. Subscription ID: sub456")));

        Mockito.verify(customerService).enableAutoPayPolicy("cust123", policyId, 12, 150.0);
    }

    // Test disable autopay
    @Test
    public void testDisableAutoPay() throws Exception {
        Map<String, String> body = new HashMap<>();
        body.put("customerId", "cust123");
        body.put("subscriptionId", "sub123");
        body.put("policyId", "policy123");

        Mockito.doNothing().when(customerService).disableAutoPay("cust123", "sub123", "policy123");

        mockMvc.perform(post("/api/customer/autopay/disable")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(content().string("Autopay disabled"));

        Mockito.verify(customerService).disableAutoPay("cust123", "sub123", "policy123");
    }

    // Test get owned policies
    @Test
    public void testGetOwnedPolicies() throws Exception {
        String customerId = "cust123";
        Policy policy = new Policy();
        policy.setId("policy1");
        policy.setName("Health Insurance");
        List<Policy> policies = Collections.singletonList(policy);

        Mockito.when(customerService.getOwnedPolicies(customerId)).thenReturn(policies);

        mockMvc.perform(get("/api/customer/policies/owned/{customerId}", customerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is("policy1")))
                .andExpect(jsonPath("$[0].name", is("Health Insurance")));

        Mockito.verify(customerService).getOwnedPolicies(customerId);
    }

    // Test get customers with expiring policies by days
    @Test
    public void testGetCustomersWithExpiringPoliciesByDays() throws Exception {
        int days = 30;

        Customer customer = new Customer();
        customer.setId("cust123");
        customer.setName("John Doe");

        List<Customer> customers = Collections.singletonList(customer);

        Mockito.when(customerService.getCustomersWithExpiringPoliciesByDays(days)).thenReturn(customers);

        mockMvc.perform(get("/api/customer/customers/expiring-policies/by-days")
                        .param("days", String.valueOf(days)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is("cust123")))
                .andExpect(jsonPath("$[0].name", is("John Doe")));

        Mockito.verify(customerService).getCustomersWithExpiringPoliciesByDays(days);
    }

    // Test notify expiring policies
    @Test
    public void testNotifyExpiringPolicies() throws Exception {
        NotificationRequest req1 = new NotificationRequest();
        req1.setCustomerId("cust1");
        req1.setPolicyId("policy1");

        NotificationRequest req2 = new NotificationRequest();
        req2.setCustomerId("cust2");
        req2.setPolicyId("policy2");

        List<NotificationRequest> requests = Arrays.asList(req1, req2);

        Mockito.doNothing().when(customerService).sendPolicyExpiryNotification("cust1", "policy1");
        Mockito.doNothing().when(customerService).sendPolicyExpiryNotification("cust2", "policy2");

        mockMvc.perform(post("/api/customer/customers/expiring-policies/notify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requests)))
                .andExpect(status().isOk())
                .andExpect(content().string("Notifications triggered."));

        Mockito.verify(customerService).sendPolicyExpiryNotification("cust1", "policy1");
        Mockito.verify(customerService).sendPolicyExpiryNotification("cust2", "policy2");
    }

    // Test get customer by id (found)
    @Test
    public void testGetCustomerById_Found() throws Exception {
        String customerId = "cust123";

        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setName("John Doe");

        Mockito.when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));

        mockMvc.perform(get("/api/customer/{customerId}", customerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(customerId)))
                .andExpect(jsonPath("$.name", is("John Doe")));

        Mockito.verify(customerRepository).findById(customerId);
    }

    // Test get customer by id (not found)
    @Test
    public void testGetCustomerById_NotFound() throws Exception {
        String customerId = "unknownId";

        Mockito.when(customerRepository.findById(customerId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/customer/{customerId}", customerId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("Customer not found")));

        Mockito.verify(customerRepository).findById(customerId);
    }

    // Test get customer by id (exception handling)
    @Test
    public void testGetCustomerById_Exception() throws Exception {
        String customerId = "custError";

        Mockito.when(customerRepository.findById(customerId)).thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/customer/{customerId}", customerId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message", is("Internal server error")));

        Mockito.verify(customerRepository).findById(customerId);
    }

}
