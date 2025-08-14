package com.example.model;


import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.List;

@Data
@Document(collection = "payments")
public class Payment {
    @Id
    private String id;

    private String invoiceId;
    private String customerId;
    private String insurerId;
    private Double amount;
    private String status; // success, failed
    private String razorpayPaymentId;
    private String razorpaySubscriptionId;
    private String method;
    private Boolean isAutoPay = false;
    private Date paidAt = new Date();
    private TaxDetails taxDetails;
    
    private List<String> policyIds;
    private List<String> policyNames;


    @Data
    public static class TaxDetails {
        private String taxType;
        private double taxRate;
        private double taxAmount;
        private double totalAmount;
    }
}
