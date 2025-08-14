package training.iqgateway.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import training.iqgateway.entity.Insurer;

@Repository
public interface InsurerRepository extends MongoRepository<Insurer, String> {
    Insurer findByEmail(String email);
}
