package com.example.model;

import lombok.Data;

@Data
public class PaymentInitiateRequest {
    private String invoiceId;
    private String customerId;
}
