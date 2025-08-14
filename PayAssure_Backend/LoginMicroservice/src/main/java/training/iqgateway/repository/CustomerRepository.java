package training.iqgateway.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import training.iqgateway.entity.Customer;

public interface CustomerRepository extends MongoRepository<Customer, String> {
    Customer findByEmail(String email);
}
