package training.iqgateway.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import training.iqgateway.service.NotificationService;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NotificationController.class)
public class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NotificationService notificationService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testSendEmail_Success() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("to", "user@example.com");
        request.put("subject", "Test Subject");
        request.put("content", "Test email content");

        // Mockito does not need to stub void methods if no exception thrown
        Mockito.doNothing().when(notificationService).sendEmail("user@example.com", "Test Subject", "Test email content");

        mockMvc.perform(post("/notify/email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Email sent successfully"));

        Mockito.verify(notificationService).sendEmail("user@example.com", "Test Subject", "Test email content");
    }

    @Test
    public void testSendAutoPayStatus_Success() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("toEmail", "user@example.com");
        request.put("policyId", "policy123");
        request.put("policyName", "Health Insurance");
        request.put("enabled", true);

        Mockito.doNothing().when(notificationService).sendAutoPayStatusEmail("user@example.com", "policy123", "Health Insurance", true);

        mockMvc.perform(post("/notify/autopay-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Auto-pay status email sent successfully"));

        Mockito.verify(notificationService).sendAutoPayStatusEmail("user@example.com", "policy123", "Health Insurance", true);
    }

    @Test
    public void testSendPaymentStatus_Success() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("toEmail", "user@example.com");
        request.put("customerName", "John Doe");
        request.put("invoiceId", "inv123");
        request.put("status", "PAID");
        request.put("amount", 150.75);

        Mockito.doNothing().when(notificationService).sendPaymentStatusEmail("user@example.com", "John Doe", "inv123", "PAID", 150.75);

        mockMvc.perform(post("/notify/payment-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Payment status email sent"));

        Mockito.verify(notificationService).sendPaymentStatusEmail("user@example.com", "John Doe", "inv123", "PAID", 150.75);
    }

    @Test
    public void testSendPaymentStatus_AmountNull_Success() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("toEmail", "user@example.com");
        request.put("customerName", "John Doe");
        request.put("invoiceId", "inv123");
        request.put("status", "PAID");
        request.put("amount", null);

        Mockito.doNothing().when(notificationService).sendPaymentStatusEmail("user@example.com", "John Doe", "inv123", "PAID", null);

        mockMvc.perform(post("/notify/payment-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Payment status email sent"));

        Mockito.verify(notificationService).sendPaymentStatusEmail("user@example.com", "John Doe", "inv123", "PAID", null);
    }

    @Test
    public void testSendPolicyExpiryNotification_Success() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("toEmail", "user@example.com");
        request.put("policyId", "policy123");
        request.put("policyName", "Life Insurance");
        request.put("expiryDate", "2025-12-31");

        Mockito.doNothing().when(notificationService).sendPolicyExpiryEmail("user@example.com", "policy123", "Life Insurance", "2025-12-31");

        mockMvc.perform(post("/notify/policy-expiry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Policy expiry email sent"));

        Mockito.verify(notificationService).sendPolicyExpiryEmail("user@example.com", "policy123", "Life Insurance", "2025-12-31");
    }

    @Test
    public void testSendPolicyExpiryNotification_MissingFields_BadRequest() throws Exception {
        // Missing policyId and expiryDate
        Map<String, String> request = new HashMap<>();
        request.put("toEmail", "user@example.com");
        request.put("policyName", "Life Insurance");

        mockMvc.perform(post("/notify/policy-expiry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Missing required fields"));

        Mockito.verify(notificationService, Mockito.never()).sendPolicyExpiryEmail(Mockito.anyString(), Mockito.anyString(), Mockito.anyString(), Mockito.anyString());
    }
}
