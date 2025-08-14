package training.iqgateway.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.List;

@Document(collection = "customers")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Customer {
    @Id
    private String id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String password;
    private boolean autoPayEnabled;
    private List<String> policyIds;
    private List<PaymentHistory> paymentHistory;
    private Date createdAt;
    private String razorpayCustomerId;
   

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PaymentHistory {
        private String policyId;
        private String status;
        private Date lastPaidDate;
        private Date validUpto;
        private String razorpaySubscriptionId = "";
    }
}
