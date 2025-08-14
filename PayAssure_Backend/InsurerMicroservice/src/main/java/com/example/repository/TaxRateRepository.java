package com.example.repository;

import com.example.model.TaxRate;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface TaxRateRepository extends MongoRepository<TaxRate, String> {
    Optional<TaxRate> findByPolicyType(String policyType);  // To fetch GST by policyType
}
