package com.example.model;

import lombok.Data;
import java.util.Date;
import java.util.List;

@Data
public class InvoiceRequest {
    private String customerId;
    private List<String> policyIds;  // Array for multiple policies
    private String insurerId;
   // private Date dueDate;
    private Date validUpto;  // New: Validity date for the invoice
    private int months;  // Default 1; from frontend dropdown (1-5)
}


//package com.example.model;
//
//import lombok.Data;
//import java.util.Date;
//
//@Data
//public class InvoiceRequest {
//    private String customerId;
//    private String policyId;
//    private String insurerId;
//    private Date dueDate;
//    private int advanceMonths = 0;  // New: 0 for normal, 1/3/6 for advance
//}
