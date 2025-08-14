package training.iqgateway.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import training.iqgateway.entity.Insurer;

public interface InsurerRepository extends MongoRepository<Insurer, String> {
    Insurer findByEmail(String email);
}
