package training.iqgateway.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.List;

@Document(collection = "invoices")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Invoice {
    @Id
    private String id;
    private String customerId;
    private String insurerId;
    private double amount;
    private String status;
  //  private Date dueDate;
    private Date validUpto;

    private String razorpayOrderId;
    private List<TaxDetails> taxDetailsList;
    private Date createdAt;
    private List<String> policyIds;
    private String paymentLink;
    private int months;
    
    private String razorpaySubscriptionId = ""; 

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TaxDetails {
        private String policyId;
        private double gstRate;
        private double taxAmount;
        private double totalAmount;
    }
}
