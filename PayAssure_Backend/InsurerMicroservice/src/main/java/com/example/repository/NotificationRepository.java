// NotificationRepository.java
package com.example.repository;

import com.example.model.Invoice;
import com.example.model.Notification;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
}
