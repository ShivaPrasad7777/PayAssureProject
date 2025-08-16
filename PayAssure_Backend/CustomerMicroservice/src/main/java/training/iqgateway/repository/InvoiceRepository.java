package training.iqgateway.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import training.iqgateway.entity.Invoice;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends MongoRepository<Invoice, String> {
    List<Invoice> findByCustomerIdAndStatus(String customerId, String status);
    Optional<Invoice> findByRazorpayOrderId(String razorpayOrderId);
	List<Invoice> findByCustomerIdAndStatusIn(String customerId, List<String> statuses);
	List<Invoice> findByCustomerIdOrderByCreatedAtDesc(String customerId);
}
