package com.example.repository;

import com.example.model.Invoice;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;  // For returning Optional (good practice to handle not found)

@Repository
public interface InvoiceRepository extends MongoRepository<Invoice, String> {

    // Custom method to find by razorpayOrderId (Spring generates the query)
    Optional<Invoice> findByRazorpayOrderId(String razorpayOrderId);
    List<Invoice> findByCustomerIdAndStatusIn(String customerId, List<String> statuses);


    
}
