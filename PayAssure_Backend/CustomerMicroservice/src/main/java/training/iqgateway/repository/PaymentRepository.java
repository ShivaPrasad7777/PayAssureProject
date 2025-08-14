package training.iqgateway.repository;


import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;

import training.iqgateway.entity.Payment;

public interface PaymentRepository extends MongoRepository<Payment, String> {
	List<Payment> findByCustomerId(String customerId, Sort sort);

}
