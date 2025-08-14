// PaymentRepository.java
package com.example.repository;

import com.example.model.Payment;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends MongoRepository<Payment, String> {
	
	List<Payment> findAll(Sort sort);
}
