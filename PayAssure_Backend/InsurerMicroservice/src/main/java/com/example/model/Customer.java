package com.example.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.List;

@Data
@Document(collection = "customers")
public class Customer {
    @Id
    private String id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String password;
    private String aadhaarNumber;
    private boolean autoPayEnabled;
    private List<String> policyIds;
    private List<PaymentHistoryEntry> paymentHistory;  // Per-policy history
    private Date createdAt;

    @Data
    public static class PaymentHistoryEntry {
        private String policyId;
        private String status;
        private Date lastPaidDate;
        private Date validUpto;
    }
}
