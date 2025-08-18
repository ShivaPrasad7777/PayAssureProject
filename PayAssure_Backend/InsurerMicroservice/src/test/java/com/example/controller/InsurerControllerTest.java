package com.example.controller;

import com.example.dto.CustomerSummary;
import com.example.dto.PolicySummary;
import com.example.model.Customer;
import com.example.model.Invoice;
import com.example.model.Payment;
import com.example.model.Policy;
import com.example.model.InvoiceRequest;
import com.example.model.PaymentInitiateRequest;
import com.example.service.InsurerService;
import com.razorpay.RazorpayException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InsurerController.class)
@ContextConfiguration(classes = InsurerController.class) 
public class InsurerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InsurerService billingService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testCreateInvoice_Success() throws Exception {
        InvoiceRequest request = new InvoiceRequest();
        request.setCustomerId("cust123");
        request.setPolicyIds(Arrays.asList("policy1", "policy2"));
        request.setInsurerId("insurer123");
        request.setValidUpto(new Date());
        request.setMonths(3);

        Invoice invoice = new Invoice();
        invoice.setId("inv123");
        invoice.setCustomerId("cust123");
        invoice.setPolicyIds(request.getPolicyIds());
        invoice.setMonths(3);
        invoice.setValidUpto(request.getValidUpto());

        Mockito.when(billingService.createInvoice(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyList(),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.any(Date.class),
                ArgumentMatchers.anyInt()
        )).thenReturn(invoice);

        mockMvc.perform(post("/api/insurer/invoices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is("inv123")))
                .andExpect(jsonPath("$.customerId", is("cust123")))
                .andExpect(jsonPath("$.policyIds", hasSize(2)));

        Mockito.verify(billingService).createInvoice(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyList(),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.any(Date.class),
                ArgumentMatchers.anyInt());
    }

    @Test
    public void testCreateInvoice_RazorpayException() throws Exception {
        InvoiceRequest request = new InvoiceRequest();
        request.setCustomerId("cust999");
        request.setPolicyIds(Collections.singletonList("policyX"));
        request.setInsurerId("insurerX");
        request.setValidUpto(new Date());
        request.setMonths(1);

        Mockito.when(billingService.createInvoice(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyList(),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.any(Date.class),
                ArgumentMatchers.anyInt()
        )).thenThrow(new RazorpayException("Razorpay error"));

        mockMvc.perform(post("/api/insurer/invoices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }

    @Test
    public void testCreateInvoice_RuntimeException() throws Exception {
        InvoiceRequest request = new InvoiceRequest();
        request.setCustomerId("custError");
        request.setPolicyIds(Collections.singletonList("policyErr"));
        request.setInsurerId("insurerErr");
        request.setValidUpto(new Date());
        request.setMonths(2);

        Mockito.when(billingService.createInvoice(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyList(),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.any(Date.class),
                ArgumentMatchers.anyInt()
        )).thenThrow(new RuntimeException("Bad request error"));

        mockMvc.perform(post("/api/insurer/invoices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

//    @Test
//    public void testInitiatePayment_Success() throws Exception {
//        PaymentInitiateRequest request = new PaymentInitiateRequest();
//        request.setInvoiceId("inv123");
//        request.setCustomerId("cust123");
//
//        Mockito.when(billingService.initiatePayment("inv123", "cust123")).thenReturn("order_abc123");
//
//        mockMvc.perform(post("/api/insurer/payments/initiate")
//                .contentType(MediaType.APPLICATION_JSON)
//                .content(objectMapper.writeValueAsString(request)))
//                .andExpect(status().isOk())
//                .andExpect(content().string("order_abc123"));
//
//        Mockito.verify(billingService).initiatePayment("inv123", "cust123");
//    }
//
//    @Test
//    public void testInitiatePayment_RazorpayException() throws Exception {
//        PaymentInitiateRequest request = new PaymentInitiateRequest();
//        request.setInvoiceId("invErr");
//        request.setCustomerId("custErr");
//
//        Mockito.when(billingService.initiatePayment(
//                ArgumentMatchers.anyString(),
//                ArgumentMatchers.anyString()
//        )).thenThrow(new RazorpayException("Razorpay failure"));
//
//        mockMvc.perform(post("/api/insurer/payments/initiate")
//                .contentType(MediaType.APPLICATION_JSON)
//                .content(objectMapper.writeValueAsString(request)))
//                .andExpect(status().isInternalServerError())
//                .andExpect(content().string(containsString("Error initiating payment")));
//    }
//
//    @Test
//    public void testInitiatePayment_RuntimeException() throws Exception {
//        PaymentInitiateRequest request = new PaymentInitiateRequest();
//        request.setInvoiceId("invBad");
//        request.setCustomerId("custBad");
//
//        Mockito.when(billingService.initiatePayment(
//                ArgumentMatchers.anyString(),
//                ArgumentMatchers.anyString()
//        )).thenThrow(new RuntimeException("Bad input"));
//
//        mockMvc.perform(post("/api/insurer/payments/initiate")
//                .contentType(MediaType.APPLICATION_JSON)
//                .content(objectMapper.writeValueAsString(request)))
//                .andExpect(status().isBadRequest())
//                .andExpect(content().string(containsString("Bad input")));
//    }
//
//    @Test
    public void testHandleWebhook_PaymentCaptured_Success() throws Exception {
        JSONObject paymentEntity = new JSONObject();
        paymentEntity.put("id", "pay123");
        paymentEntity.put("order_id", "order123");

        JSONObject payment = new JSONObject();
        payment.put("entity", paymentEntity);

        JSONObject payload = new JSONObject();
        payload.put("payment", payment);

        JSONObject jsonPayload = new JSONObject();
        jsonPayload.put("event", "payment.captured");
        jsonPayload.put("payload", payload);

        Mockito.doNothing().when(billingService).verifyPayment("pay123", "order123", "success");

        mockMvc.perform(post("/api/insurer/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Razorpay-Signature", "dummy-signature")
                .content(jsonPayload.toString()))
                .andExpect(status().isOk())
                .andExpect(content().string("Payment verified and processed"));

        Mockito.verify(billingService).verifyPayment("pay123", "order123", "success");
    }

    @Test
    public void testHandleWebhook_UnknownEvent() throws Exception {
        JSONObject jsonPayload = new JSONObject();
        jsonPayload.put("event", "unhandled.event");

        mockMvc.perform(post("/api/insurer/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Razorpay-Signature", "dummy-signature")
                .content(jsonPayload.toString()))
                .andExpect(status().isOk())
                .andExpect(content().string("Webhook event received but not processed"));
    }

    @Test
    public void testGetUnpaidCustomers_Success() throws Exception {
        List<CustomerSummary> customers = Arrays.asList(
                new CustomerSummary("cust1", "John Doe"),
                new CustomerSummary("cust2", "Jane Smith")
        );

        Mockito.when(billingService.getUnpaidCustomers()).thenReturn(customers);

        mockMvc.perform(get("/api/insurer/customers/unpaid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is("cust1")))
                .andExpect(jsonPath("$[0].name", is("John Doe")));

        Mockito.verify(billingService).getUnpaidCustomers();
    }

    @Test
    public void testGetUnpaidFailedInvoicesForCustomer() throws Exception {
        String customerId = "cust123";
        Invoice inv1 = new Invoice();
        inv1.setId("inv1");
        inv1.setCustomerId(customerId);

        Invoice inv2 = new Invoice();
        inv2.setId("inv2");
        inv2.setCustomerId(customerId);

        List<Invoice> invoices = Arrays.asList(inv1, inv2);

        Mockito.when(billingService.getUnpaidFailedInvoicesForCustomer(customerId)).thenReturn(invoices);

        mockMvc.perform(get("/api/insurer/customers/{customerId}/unpaid-failed-invoices", customerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is("inv1")))
                .andExpect(jsonPath("$[1].id", is("inv2")));

        Mockito.verify(billingService).getUnpaidFailedInvoicesForCustomer(customerId);
    }

    @Test
    public void testGetUnpaidPoliciesForCustomer() throws Exception {
        String customerId = "cust123";
        List<PolicySummary> policies = Arrays.asList(
                new PolicySummary("policy1", "Health Insurance"),
                new PolicySummary("policy2", "Car Insurance")
        );

        Mockito.when(billingService.getUnpaidPoliciesForCustomer(customerId)).thenReturn(policies);

        mockMvc.perform(get("/api/insurer/customers/{customerId}/unpaid-policies", customerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is("policy1")))
                .andExpect(jsonPath("$[0].name", is("Health Insurance")));

        Mockito.verify(billingService).getUnpaidPoliciesForCustomer(customerId);
    }
//
//    @Test
//    public void testPayByCash_Success() throws Exception {
//        String invoiceId = "inv123";
//
//        Mockito.doNothing().when(billingService).processCashPayment(invoiceId);
//
//        mockMvc.perform(post("/api/insurer/invoices/{invoiceId}/pay-by-cash", invoiceId))
//                .andExpect(status().isOk())
//                .andExpect(content().string("Cash payment processed successfully"));
//
//        Mockito.verify(billingService).processCashPayment(invoiceId);
//    }
//
//    @Test
//    public void testPayByCash_RuntimeException() throws Exception {
//        String invoiceId = "inv123";
//
//        Mockito.doThrow(new RuntimeException("Error processing cash payment"))
//                .when(billingService).processCashPayment(invoiceId);
//
//        mockMvc.perform(post("/api/insurer/invoices/{invoiceId}/pay-by-cash", invoiceId))
//                .andExpect(status().isBadRequest())
//                .andExpect(content().string("Error processing cash payment"));
//    }

    @Test
    public void testGetAllPaymentHistory() throws Exception {
        Payment p = new Payment();
        p.setId("pay1");
        p.setAmount(100.0);

        Mockito.when(billingService.getAllPaymentHistory()).thenReturn(Collections.singletonList(p));

        mockMvc.perform(get("/api/insurer/payments/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is("pay1")))
                .andExpect(jsonPath("$[0].amount", is(100.0)));

        Mockito.verify(billingService).getAllPaymentHistory();
    }

    @Test
    public void testGetCustomerById_Found() throws Exception {
        String customerId = "cust123";
        Customer c = new Customer();
        c.setId(customerId);
        c.setName("John Doe");

        Mockito.when(billingService.getCustomerById(customerId)).thenReturn(Optional.of(c));

        mockMvc.perform(get("/api/insurer/customers/{customerId}", customerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(customerId)))
                .andExpect(jsonPath("$.name", is("John Doe")));
    }

    @Test
    public void testGetCustomerById_NotFound() throws Exception {
        String customerId = "cust999";

        Mockito.when(billingService.getCustomerById(customerId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/insurer/customers/{customerId}", customerId))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testGetInvoiceById_Found() throws Exception {
        String invoiceId = "inv123";
        Invoice inv = new Invoice();
        inv.setId(invoiceId);
        inv.setCustomerId("cust123");

        Mockito.when(billingService.getInvoiceById(invoiceId)).thenReturn(Optional.of(inv));

        mockMvc.perform(get("/api/insurer/invoices/{invoiceId}", invoiceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(invoiceId)));
    }

    @Test
    public void testGetInvoiceById_NotFound() throws Exception {
        String invoiceId = "inv999";

        Mockito.when(billingService.getInvoiceById(invoiceId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/insurer/invoices/{invoiceId}", invoiceId))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testGetPoliciesByIds() throws Exception {
        List<String> policyIds = Arrays.asList("policy1", "policy2");

        Policy p1 = new Policy();
        p1.setId("policy1");
        p1.setName("Health Insurance");

        Policy p2 = new Policy();
        p2.setId("policy2");
        p2.setName("Car Insurance");

        List<Policy> policies = Arrays.asList(p1, p2);

        Mockito.when(billingService.getPoliciesByIds(policyIds)).thenReturn(policies);

        mockMvc.perform(post("/api/insurer/policies/names")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(policyIds)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is("policy1")))
                .andExpect(jsonPath("$[1].id", is("policy2")));

        Mockito.verify(billingService).getPoliciesByIds(policyIds);
    }

    @Test
    public void testGetAllInvoiceHistory() throws Exception {
        Invoice inv = new Invoice();
        inv.setId("inv123");

        Mockito.when(billingService.getAllInvoiceHistory()).thenReturn(Collections.singletonList(inv));

        mockMvc.perform(get("/api/insurer/invoices/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is("inv123")));

        Mockito.verify(billingService).getAllInvoiceHistory();
    }

    @Test
    public void testSearchCustomersByName() throws Exception {
        List<CustomerSummary> customers = Arrays.asList(
                new CustomerSummary("cust1", "John Doe"),
                new CustomerSummary("cust2", "Johnny Appleseed")
        );

        Mockito.when(billingService.searchCustomersByName("John")).thenReturn(customers);

        mockMvc.perform(get("/api/insurer/customers/search")
                .param("name", "John"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name", containsString("John")))
                .andExpect(jsonPath("$[1].name", containsString("John")));

        Mockito.verify(billingService).searchCustomersByName("John");
    }

    @Test
    public void testPayByCashMultiple_Success() throws Exception {
        Map<String, List<String>> body = new HashMap<>();
        body.put("invoiceIds", Arrays.asList("inv1", "inv2"));

        Mockito.doNothing().when(billingService).processCashPaymentMultiple(body.get("invoiceIds"));

        mockMvc.perform(post("/api/insurer/invoices/pay-by-cash")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(content().string("Cash payment processed successfully for selected invoices"));

        Mockito.verify(billingService).processCashPaymentMultiple(body.get("invoiceIds"));
    }

    @Test
    public void testPayByCashMultiple_BadRequest_NoInvoiceIds() throws Exception {
        Map<String, List<String>> emptyBody = new HashMap<>();

        mockMvc.perform(post("/api/insurer/invoices/pay-by-cash")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emptyBody)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("No invoiceIds provided"));

        Mockito.verify(billingService, Mockito.never()).processCashPaymentMultiple(ArgumentMatchers.anyList());
    }

    @Test
    public void testPayByCashMultiple_RuntimeException() throws Exception {
        Map<String, List<String>> body = new HashMap<>();
        List<String> invoiceIds = Arrays.asList("inv1", "inv2");
        body.put("invoiceIds", invoiceIds);

        Mockito.doThrow(new RuntimeException("Error processing multiple cash payments"))
                .when(billingService).processCashPaymentMultiple(invoiceIds);

        mockMvc.perform(post("/api/insurer/invoices/pay-by-cash")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Error processing multiple cash payments"));

        Mockito.verify(billingService).processCashPaymentMultiple(invoiceIds);
    }
}
