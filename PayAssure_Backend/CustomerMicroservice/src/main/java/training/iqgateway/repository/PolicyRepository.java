// training.iqgateway.repository.PolicyRepository.java (new interface)
package training.iqgateway.repository;

import training.iqgateway.entity.Policy;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PolicyRepository extends MongoRepository<Policy, String> {
    List<Policy> findAllByIdIn(List<String> ids);  // Custom query to find by list of IDs
}
