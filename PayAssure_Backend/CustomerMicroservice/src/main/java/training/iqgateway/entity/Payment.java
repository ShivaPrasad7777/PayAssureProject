// Updated Entity: src/main/java/training/iqgateway/entity/Payment.java
// Renamed field "isAutoPay" to "autoPay" to follow standard naming and avoid Lombok getter/setter confusion
package training.iqgateway.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.List;

@Document(collection = "payments")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Payment {
    @Id
    private String id;
    private String invoiceId;
    private String customerId;
    private String insurerId;
    private double amount;
    private String status;
    private String razorpayPaymentId;
//    private String razorpaySubscriptionId;
    private String razorpaySubscriptionId="";  // Add this line inside the class

    private String method;
    private boolean autoPay; // Renamed from "isAutoPay" to "autoPay" (Lombok generates isAutoPay() and setAutoPay())
    private TaxDetails taxDetails;
    private Date paidAt;
    
    
 
    private List<String> policyIds;
    private List<String> policyNames;


    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TaxDetails {
        private String taxType;
        private double taxRate;
        private double taxAmount;
        private double totalAmount;
    }
}
