package com.example.repository;

import com.example.model.Customer;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface CustomerRepository extends MongoRepository<Customer, String> {
	List<Customer> findByNameContainingIgnoreCase(String name);
}
