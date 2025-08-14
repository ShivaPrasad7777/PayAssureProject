package training.iqgateway.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import training.iqgateway.service.NotificationService;

import java.util.Map;

@RestController
@RequestMapping("/notify")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @PostMapping("/email")
    public ResponseEntity<String> sendEmail(@RequestBody Map<String, String> body) {
        String to = body.get("to");
        String subject = body.get("subject");
        String content = body.get("content");
        notificationService.sendEmail(to, subject, content);
        return ResponseEntity.ok("Email sent successfully");
    }

    // -- AUTOPAY STATUS ENDPOINT --
    @PostMapping("/autopay-status")
    public ResponseEntity<String> sendAutoPayStatus(@RequestBody Map<String, Object> body) {
        String toEmail = (String) body.get("toEmail");
        String policyId = (String) body.get("policyId");
        String policyName = (String) body.get("policyName");
        boolean enabled = (boolean) body.get("enabled");
        notificationService.sendAutoPayStatusEmail(toEmail, policyId, policyName, enabled);
        return ResponseEntity.ok("Auto-pay status email sent successfully");
    }

    @PostMapping("/payment-status")
    public ResponseEntity<String> sendPaymentStatus(@RequestBody Map<String, Object> body) {
        String toEmail = (String) body.get("toEmail");
        String customerName = (String) body.get("customerName");
        String invoiceId = (String) body.get("invoiceId");
        String status = (String) body.get("status");
        Double amount = body.get("amount") == null ? null : Double.valueOf(body.get("amount").toString());
        notificationService.sendPaymentStatusEmail(toEmail, customerName, invoiceId, status, amount);
        return ResponseEntity.ok("Payment status email sent");
    }

    // -- POLICY EXPIRY ENDPOINT --
    @PostMapping("/policy-expiry")
    public ResponseEntity<String> sendPolicyExpiryNotification(@RequestBody Map<String, String> body) {
        String toEmail = body.get("toEmail");
        String policyId = body.get("policyId");
        String policyName = body.get("policyName");
        String expiryDate = body.get("expiryDate");
        System.out.println("hi");
        System.out.println("hi");
        if (toEmail == null || policyId == null || expiryDate == null || policyName == null) {
            return ResponseEntity.badRequest().body("Missing required fields");
        }

        notificationService.sendPolicyExpiryEmail(toEmail, policyId, policyName, expiryDate);
        return ResponseEntity.ok("Policy expiry email sent");
    }
}
