package training.iqgateway.service;

import java.util.List;
import java.util.Optional;

import training.iqgateway.entity.Customer;
import training.iqgateway.entity.Invoice;
import training.iqgateway.entity.Payment;
import training.iqgateway.entity.Policy;

public interface CustomerService {

    List<Invoice> getUnpaidInvoices(String customerId);

    void processPayment(String razorpayOrderId, String razorpayPaymentId, String status);

    // Updated processPayment to handle autopay (overload)
    void processPayment(String razorpayOrderId, String razorpayPaymentId, String status, String subscriptionId);

    List<Payment> getPaymentHistory(String customerId);

    Optional<Invoice> getInvoiceById(String invoiceId);

    List<String> getPolicyNamesByIds(List<String> policyIds);

    String enableAutoPay(String customerId, String invoiceId, int months, double amount);

    String enableAutoPayPolicy(String customerId, String policyId, int months, double amount);

    // Disable autopay methods
    void disableAutoPay(String customerId, String subscriptionId);

    void disableAutoPay(String customerId, String subscriptionId, String policyId);

    List<Policy> getOwnedPolicies(String customerId);


	List<Customer> findCustomersWithinDaysUntilExpiry(int days);

	void sendPolicyExpiryNotification(String customerId, String policyId);
	
	 public List<Customer> getCustomersWithExpiringPoliciesByDays(int days);

	 void recordAutopayPayment(String customerId, String subscriptionId, String razorpayOrderId,
			String razorpayPaymentId, List<String> policyIds, List<String> policyNames);

	 List<Invoice> getInvoiceHistory(String customerId);



}




//package training.iqgateway.service;
//
//import java.util.*;
//
//import training.iqgateway.entity.*;
//
//public interface CustomerService {
//
//    List<Invoice> getUnpaidInvoices(String customerId);
//
//    void processPayment(String orderId, String paymentId, String status, String subscriptionId);
//
//    // detailed method
//    void processPayment(String orderId, String paymentId, String status, String subscriptionId,
//                        String customerId, List<String> policyIds, List<String> policyNames, double amount);
//
//    List<Payment> getPaymentHistory(String customerId);
//
//    Optional<Invoice> getInvoiceById(String invoiceId);
//
//    List<String> getPolicyNamesByIds(List<String> policyIds);
//
//    String enableAutoPay(String customerId, String invoiceId, int months, double amount);
//
//    String enableAutoPayPolicy(String customerId, String policyId, int months, double amount);
//
//    void disableAutoPay(String customerId, String subscriptionId);
//
//    void disableAutoPay(String customerId, String subscriptionId, String policyId);
//
//    List<Policy> getOwnedPolicies(String customerId);
//
//    Optional<Customer> getCustomerById(String customerId);
//}
//
