package training.iqgateway.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import training.iqgateway.entity.Admin;

public interface AdminRepository extends MongoRepository<Admin, String> {
    Admin findByEmail(String email);
}
