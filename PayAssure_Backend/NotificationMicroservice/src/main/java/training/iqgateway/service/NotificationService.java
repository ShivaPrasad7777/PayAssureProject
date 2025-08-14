package training.iqgateway.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final JavaMailSender mailSender;

    @Value("${notification.from_email}")
    private String fromEmail;

    public NotificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendEmail(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            log.info("Email sent to {} successfully (from port 8886)", toEmail);
        } catch (Exception e) {
            log.error("Error sending email to {}: {}", toEmail, e.getMessage());
        }
    }

    // -- AUTOPAY STATUS EMAIL --
    public void sendAutoPayStatusEmail(String toEmail, String policyId, String policyName, boolean enabled) {
        String subject = enabled ? "Auto-Pay Enabled for Your Policy" : "Auto-Pay Disabled for Your Policy";
        String body = enabled
                ? "Dear Customer, Auto-pay has been successfully enabled for your policy \"" + policyName + "\" (ID: " + policyId + "). Your payments will now be automatic."
                : "Dear Customer, Auto-pay has been disabled for your policy \"" + policyName + "\" (ID: " + policyId + "). Please manage your payments manually.";
        sendEmail(toEmail, subject, body);
    }

    // -- PAYMENT STATUS EMAIL --
    public void sendPaymentStatusEmail(String toEmail, String customerName, String invoiceId, String status, Double amount) {
        String subject, content;
        if ("SUCCESS".equalsIgnoreCase(status)) {
            subject = "Your Payment was Successful";
            content = "Dear " + (customerName != null ? customerName : "Customer") + ",\n\n"
                    + "Your payment"
                    + (invoiceId != null ? " for invoice " + invoiceId : "")
                    + " of ₹" + (amount != null ? amount : "-") + " was successful.\n"
                    + "Thank you for your payment!";
        } else {
            subject = "Payment Failed";
            content = "Dear " + (customerName != null ? customerName : "Customer") + ",\n\n"
                    + "Unfortunately, your payment"
                    + (invoiceId != null ? " for invoice " + invoiceId : "")
                    + " of ₹" + (amount != null ? amount : "-") + " failed.\n"
                    + "Please try again or contact support if needed.";
        }
        sendEmail(toEmail, subject, content);
    }

    // -- POLICY EXPIRY EMAIL --
    public void sendPolicyExpiryEmail(String toEmail, String policyId, String policyName, String expiryDate) {
        String subject = "Policy Expiry Reminder for " + policyName + " (" + policyId + ")";
        String body = "Dear Customer,\n\nYour policy \"" + policyName + "\" (ID: " + policyId + ") is set to expire on " + expiryDate
                + ". Please renew it to avoid interruption.\n\nBest regards,\nInsurance Team";
        sendEmail(toEmail, subject, body);
    }
}











//// src/main/java/training/iqgateway/service/NotificationService.java
//// Full code for email sending with auto-pay specific method in NotificationMicroservice
//// Running on port 8886 as per your gateway config
//// Fixed: Ensured all @Value injections match your application.properties; added more logging for debugging
//
//package training.iqgateway.service;
//
//import com.sendgrid.Method;
//import com.sendgrid.Request;
//import com.sendgrid.Response;
//import com.sendgrid.SendGrid;
//import com.sendgrid.helpers.mail.Mail;
//import com.sendgrid.helpers.mail.objects.Content;
//import com.sendgrid.helpers.mail.objects.Email;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Service;
//
//@Service
//public class NotificationService {
//
//    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
//
//    @Value("${sendgrid.api_key}")
//    private String sendgridApiKey;
//
//    @Value("${notification.from_email}")
//    private String fromEmail;
//
//    public void sendEmail(String toEmail, String subject, String body) {
//        try {
//            Email from = new Email(fromEmail);
//            Email to = new Email(toEmail);
//            Content content = new Content("text/plain", body);
//            Mail mail = new Mail(from, subject, to, content);
//            SendGrid sg = new SendGrid(sendgridApiKey);
//            Request request = new Request();
//            request.setMethod(Method.POST);
//            request.setEndpoint("mail/send");
//            request.setBody(mail.build());
//            Response response = sg.api(request);
//            log.info("Email sent to {} with status: {} (from port 8886)", toEmail, response.getStatusCode());
//        } catch (Exception e) {
//            log.error("Error sending email to {}: {}", toEmail, e.getMessage());
//        }
//    }
//
//    // Method for auto-pay status notification
//    public void sendAutoPayStatusEmail(String toEmail, String policyId, boolean enabled) {
//        String subject = enabled ? "Auto-Pay Enabled for Your Policy" : "Auto-Pay Disabled for Your Policy";
//        String body = enabled 
//            ? "Dear Customer, Auto-pay has been successfully enabled for policy " + policyId + ". Your payments will now be automatic."
//            : "Dear Customer, Auto-pay has been disabled for policy " + policyId + ". Please manage payments manually.";
//        
//        sendEmail(toEmail, subject, body);
//    }
//    
//    public void sendPaymentStatusEmail(String toEmail, String customerName, String invoiceId, String status, Double amount) {
//        String subject, content;
//
//        if ("SUCCESS".equalsIgnoreCase(status)) {
//            subject = "Your Payment was Successful";
//            content = "Dear " + (customerName != null ? customerName : "Customer") + ",\n\n"
//                    + "Your payment"
//                    + (invoiceId != null ? " for invoice " + invoiceId : "")
//                    + " of ₹" + (amount != null ? amount : "-") + " was successful.\n"
//                    + "Thank you for your payment!";
//        } else {
//            subject = "Payment Failed";
//            content = "Dear " + (customerName != null ? customerName : "Customer") + ",\n\n"
//                    + "Unfortunately, your payment"
//                    + (invoiceId != null ? " for invoice " + invoiceId : "")
//                    + " of ₹" + (amount != null ? amount : "-") + " failed.\n"
//                    + "Please try again or contact support if needed.";
//        }
//        sendEmail(toEmail, subject, content); // Your existing method!
//    }
//    
//    public void sendPolicyExpiryEmail(String toEmail, String policyId, String expiryDate) {
//        String subject = "Policy Expiry Reminder for Policy " + policyId;
//        String body = "Dear Customer,\n\nYour policy with ID " + policyId + " is set to expire on " + expiryDate 
//                      + ". Please renew it to avoid interruption.\n\nBest regards,\nInsurance Team";
//
//        sendEmail(toEmail, subject, body); // reusing your existing generic email method
//    }
//
//
//
//}
