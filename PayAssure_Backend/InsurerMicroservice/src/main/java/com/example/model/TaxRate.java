package com.example.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Data
@Document(collection = "taxRates")
public class TaxRate {
    @Id
    private String id;
    private String policyType;
    private double gstRate;
    private String applicability;
    private Date updatedAt;
}
