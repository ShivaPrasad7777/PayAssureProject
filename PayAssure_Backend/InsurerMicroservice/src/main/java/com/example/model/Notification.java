package com.example.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Data
@Document(collection = "notifications")
public class Notification {
    @Id
    private String id;

    private String customerId;
    private String invoiceId;
    private String insurerId;
    private String type; // email, sms
    private String message;
    private Date sentAt = new Date();
    private String status = "sent";
    private Integer retryCount = 0;
}
