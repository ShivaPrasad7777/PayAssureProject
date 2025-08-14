package com.example.repository;

import com.example.model.Policy;  // Adjust if your model package is different
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PolicyRepository extends MongoRepository<Policy, String> {
    // Custom methods, e.g.:
    // Policy findByInsurerId(String insurerId);
}
