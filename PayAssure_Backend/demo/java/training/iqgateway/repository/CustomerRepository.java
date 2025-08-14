package training.iqgateway.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import training.iqgateway.entity.Customer;

@Repository
public interface CustomerRepository extends MongoRepository<Customer, String> {
    Customer findByEmail(String email);
}
