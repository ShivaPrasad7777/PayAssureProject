package com.example.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.List;
import java.util.ArrayList;

@Data
@Document(collection = "invoices")
public class Invoice {
    @Id
    private String id;

    private String customerId;
    private String insurerId;
    private double amount;  // Total amount (sum of all policies + taxes)
    private String status = "unpaid";
    //private Date dueDate;
    private Date validUpto;  // NEW: Validity date for the invoice
    private String razorpayOrderId;
    private List<TaxDetails> taxDetailsList = new ArrayList<>();  // UPDATED: List for per-policy tax details (optional granularity)
    private Date createdAt = new Date();
    private List<String> policyIds;  // List for multiple policies (removed single policyId)
    private String paymentLink;  // Stored dynamic payment link
    private int months;  // NEW: Store the billed months for reference

    @Data
    public static class TaxDetails {
        private String policyId;  // NEW: Associate with specific policy
        private double gstRate;
        private double taxAmount;
        private double totalAmount;  // Per-policy total (base + tax)
    }
}








//package com.example.model;
//
//import lombok.Data;
//import org.springframework.data.annotation.Id;
//import org.springframework.data.mongodb.core.mapping.Document;
//
//import java.util.Date;
//
//@Data
//@Document(collection = "invoices")
//public class Invoice {
//    @Id
//    private String id;
//
//    private String customerId;
//    private String policyId;
//    private String insurerId;
//    private Double amount;
//    private String status; // unpaid, pending, paid, overdue
//    private Date dueDate;
//    private String razorpayOrderId;
//    private Date createdAt = new Date();
//}
