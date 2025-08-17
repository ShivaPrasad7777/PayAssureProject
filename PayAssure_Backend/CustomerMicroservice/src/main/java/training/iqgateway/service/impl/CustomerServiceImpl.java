package training.iqgateway.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.springframework.http.*;

import java.util.ArrayList;
import java.util.Base64;
import org.json.JSONObject;
import org.json.JSONArray;
import java.nio.charset.StandardCharsets;

import training.iqgateway.entity.Customer;
import training.iqgateway.entity.Invoice;
import training.iqgateway.entity.Payment;
import training.iqgateway.entity.Policy;
import training.iqgateway.repository.CustomerRepository;
import training.iqgateway.repository.InvoiceRepository;
import training.iqgateway.repository.PaymentRepository;
import training.iqgateway.repository.PolicyRepository;
import training.iqgateway.service.CustomerService;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Subscription;

import org.json.JSONObject;

import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

@Service
public class CustomerServiceImpl implements CustomerService {

	private static final Logger log = LoggerFactory.getLogger(CustomerServiceImpl.class);

	@Autowired
	private MongoTemplate mongoTemplate;

	@Autowired
	private InvoiceRepository invoiceRepository;

	@Autowired
	private PaymentRepository paymentRepository;

	@Autowired
	private CustomerRepository customerRepository;

	@Autowired
	private PolicyRepository policyRepository;

	@Autowired
	private RestTemplate restTemplate;

	@Value("${razorpay.key_id}")
	private String keyId;

	@Value("${razorpay.key_secret}")
	private String keySecret;

	@Value("${razorpay.plan_id}")
	private String planId;

	@Value("${notification.base_url}")
	private String notificationBaseUrl; // e.g., http://localhost:8886/notify

	public void recordAutopayPayment(String customerId, String subscriptionId, String orderId, String paymentId,
			List<String> policyIds, List<String> policyNames) {
		if (customerId == null || policyIds == null || policyIds.isEmpty()) {
			throw new IllegalArgumentException("Missing required data");
		}

// Calculate total amount across all policies
		double totalAmount = 0;
		for (String policyId : policyIds) {
			Optional<Policy> optPolicy = policyRepository.findById(policyId);
			if (optPolicy.isPresent()) {
				totalAmount += optPolicy.get().getMonthlyPremium();
			} else {
				log.warn("Policy not found for id: {}", policyId);
			}
		}

		Payment payment = new Payment();
		payment.setCustomerId(customerId);
		payment.setAmount(totalAmount);
		payment.setStatus("paidByAutopay");
		payment.setRazorpayPaymentId(paymentId);
// payment.setRazorpayOrderId(orderId);
		payment.setRazorpaySubscriptionId(subscriptionId);
		payment.setMethod("autopaid");
		payment.setAutoPay(true);
		payment.setPaidAt(new Date());
		payment.setPolicyIds(policyIds);
		payment.setPolicyNames(policyNames);
		payment.setTaxDetails(new Payment.TaxDetails("GST", 0.18, totalAmount * 0.18, totalAmount * 1.18));

		paymentRepository.save(payment);

// Update Customer payment history for policies and send notifications
		Optional<Customer> optCustomer = customerRepository.findById(customerId);
		if (optCustomer.isPresent()) {
			Customer customer = optCustomer.get();
			String toEmail = customer.getEmail();
			String customerName = customer.getName();

			for (int i = 0; i < policyIds.size(); i++) {
				String policyId = policyIds.get(i);
				String policyName = (policyNames != null && i < policyNames.size()) ? policyNames.get(i) : "";

// Construct notification payload
				Map<String, Object> payload = new HashMap<>();
				payload.put("toEmail", toEmail);
				payload.put("customerName", customerName);
				payload.put("invoiceId", null); // autopay payments usually have no invoice
				payload.put("policyName", policyName);
				payload.put("status", "SUCCESS");
				payload.put("amount", totalAmount); // You may adjust to per policy amount if needed

				try {
					restTemplate.postForEntity(notificationBaseUrl + "/payment-status", payload, String.class);

					log.info("Sent autopay payment notification email for policy: {}", policyName);
				} catch (Exception ex) {
					log.error("Failed to send autopay payment notification for policy: {}", policyName, ex);
				}
			}
		} else {
			log.warn("Customer not found for id: {}", customerId);
		}
	}

	public List<Customer> getCustomersWithExpiringPoliciesByDays(int days) {
		Date now = new Date();
		Calendar cal = Calendar.getInstance();
		cal.setTime(now);
		cal.add(Calendar.DAY_OF_YEAR, days);
		Date rangeEnd = cal.getTime();

		List<Customer> allCustomers = customerRepository.findAll();
		List<Customer> filteredCustomers = new ArrayList<>();

		for (Customer customer : allCustomers) {
			// Filter paymentHistories for policies expiring in next 'days'
			List<Customer.PaymentHistory> filteredPaymentHistory = customer.getPaymentHistory().stream()
					.filter(entry -> {
						Date validUpto = entry.getValidUpto();
						if (validUpto == null)
							return false;
						// validUpto must be between now and rangeEnd (inclusive)
						return !validUpto.before(now) && !validUpto.after(rangeEnd);
					}).collect(Collectors.toList());

			if (!filteredPaymentHistory.isEmpty()) {
				// Replace with filtered list
				customer.setPaymentHistory(filteredPaymentHistory);
				filteredCustomers.add(customer);
			}
		}
		return filteredCustomers;
	}

	public List<Customer> findCustomersWithinDaysUntilExpiry(int daysUntilExpiry) {
		LocalDate today = LocalDate.now();
		LocalDate expiryThresholdDate = today.plusDays(daysUntilExpiry);

		Date todayDate = Date.from(today.atStartOfDay(ZoneId.systemDefault()).toInstant());
		Date expiryThreshold = Date.from(expiryThresholdDate.atStartOfDay(ZoneId.systemDefault()).toInstant());

		Query query = new Query();
		query.addCriteria(Criteria.where("paymentHistory.validUpto").gte(todayDate) // validUpto >= today
				.lte(expiryThreshold) // validUpto <= today + daysUntilExpiry
		);

		List<Customer> customers = mongoTemplate.find(query, Customer.class);
		return customers;
	}

	public void sendPolicyExpiryNotification(String customerId, String policyId) {
		Optional<Customer> optCustomer = customerRepository.findById(customerId);
		if (optCustomer.isEmpty()) {
			log.warn("Customer not found: {}", customerId);
			return;
		}
		Customer customer = optCustomer.get();

		Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
				.filter(h -> h.getPolicyId().equals(policyId)).findFirst();

		if (optHistory.isEmpty() || optHistory.get().getValidUpto() == null) {
			log.warn("Payment history or validUpto not found for customerId: {}, policyId: {}", customerId, policyId);
			return;
		}

		String toEmail = customer.getEmail();
		String expiryDateStr = optHistory.get().getValidUpto().toString();
		// Fetch policy name
		String policyName = null;
		Optional<Policy> policyOpt = policyRepository.findById(policyId);
		if (policyOpt.isPresent()) {
			policyName = policyOpt.get().getName();
		}

		Map<String, String> payload = new HashMap<>();
		payload.put("toEmail", toEmail);
		payload.put("policyId", policyId);
		payload.put("policyName", policyName);
		payload.put("expiryDate", expiryDateStr);

		try {
			restTemplate.postForEntity(notificationBaseUrl + "/policy-expiry", payload, String.class);
			log.info("Sent policy expiry notification request to Notification Microservice for {}, policy {}", toEmail,
					policyId);
		} catch (Exception e) {
			log.error("Failed to send notification to Notification Microservice", e);
		}
	}

	@Override
	public List<Invoice> getUnpaidInvoices(String customerId) {
		log.info("Fetching unpaid and failed invoices for customerId: {}", customerId);
		// Assuming invoiceRepository supports findByCustomerIdAndStatusIn
		List<String> statuses = List.of("unpaid", "failed");
		return invoiceRepository.findByCustomerIdAndStatusIn(customerId, statuses);
	}

	@Override
	public void processPayment(String razorpayOrderId, String razorpayPaymentId, String status) {
		processPayment(razorpayOrderId, razorpayPaymentId, status, null);
	}

	@Override
	public void processPayment(String razorpayOrderId, String razorpayPaymentId, String status, String subscriptionId) {
		log.info("Starting processPayment - OrderID: {}, PaymentID: {}, Status: {}, SubscriptionID: {}",
				razorpayOrderId, razorpayPaymentId, status, subscriptionId);

		if (subscriptionId != null && !subscriptionId.isEmpty()) {
			// AutoPay subscription payment handling
			try {
				RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
				Subscription subscription = razorpay.subscriptions.fetch(subscriptionId);
				JSONObject notes = subscription.get("notes");
				String customerId = notes.optString("customerId");
				String policyId = notes.optString("policyId");

				if (customerId.isEmpty() || policyId.isEmpty()) {
					throw new RuntimeException("Subscription notes missing required customerId or policyId");
				}

				Optional<Policy> optPolicy = policyRepository.findById(policyId);
				if (optPolicy.isEmpty())
					throw new RuntimeException("Policy not found");
				Policy policy = optPolicy.get();

				double monthlyAmount = policy.getMonthlyPremium();

				// Create Payment record for autopay
				Payment payment = new Payment();
				payment.setCustomerId(customerId);
				payment.setInvoiceId(null); // autopay payments have no invoice
				payment.setInsurerId(policy.getInsurerId());
				payment.setAmount(monthlyAmount);
				payment.setStatus("paidByAutopay");
				payment.setRazorpayPaymentId(razorpayPaymentId);
				payment.setRazorpaySubscriptionId(subscriptionId);
				payment.setMethod("autopaid");
				payment.setAutoPay(true);
				payment.setTaxDetails(new Payment.TaxDetails("GST", 0.18, monthlyAmount * 0.18, monthlyAmount * 1.18));
				payment.setPaidAt(new Date());

				paymentRepository.save(payment);
				log.info("Saved autopay payment for policyId {}", policyId);

				try {
					String statusForNotify = "SUCCESS";
					if (!"paidByAutopay".equals(payment.getStatus()) && !"paid".equals(payment.getStatus())) {
						statusForNotify = "FAILED";
					}
					sendPaymentStatusNotification(payment.getCustomerId(), policy.getName(), null, statusForNotify,
							payment.getAmount());
				} catch (Exception ex) {
					log.error("Failed to send payment status notification", ex);
				}

				// Update customer's payment history for this policy
				Optional<Customer> optCustomer = customerRepository.findById(customerId);
				if (optCustomer.isPresent()) {
					Customer customer = optCustomer.get();
					Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
							.filter(h -> h.getPolicyId().equals(policyId)).findFirst();

					Customer.PaymentHistory history = optHistory.orElseGet(() -> {
						Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
						newHistory.setPolicyId(policyId);
						customer.getPaymentHistory().add(newHistory);
						log.info("Created new payment history entry for policy {}", policyId);
						return newHistory;
					});

					history.setStatus("paidByAutopay");
					Date now = new Date();
					history.setLastPaidDate(now);

					Calendar cal = Calendar.getInstance();
					cal.setTime(history.getValidUpto() != null ? history.getValidUpto() : now);
					cal.add(Calendar.MONTH, 1); // extend by 1 month for autopay payment
					history.setValidUpto(cal.getTime());

					customer.setAutoPayEnabled(true);
					customerRepository.save(customer);
					log.info("Updated customer payment history and autopay status");
				} else {
					log.error("Customer not found for auto pay update: {}", customerId);
				}
			} catch (RazorpayException e) {
				log.error("Error during autopay subscription fetch", e);
				throw new RuntimeException("Failed to process autopay payment: " + e.getMessage());
			}
		} else {
			// One-time payment logic with invoice
			String trimmedOrderId = razorpayOrderId.trim();
			Optional<Invoice> optInvoice = invoiceRepository.findByRazorpayOrderId(trimmedOrderId);

			if (optInvoice.isEmpty()) {
				log.error("Invoice not found for orderId: {}", trimmedOrderId);
				throw new RuntimeException("Invoice not found for order id: " + trimmedOrderId);
			}

			Invoice invoice = optInvoice.get();
			String finalStatus = status;
			if (subscriptionId != null && !subscriptionId.isEmpty() && "paid".equals(status)) {
				finalStatus = "paidByAutopay";
			}

			invoice.setStatus(finalStatus);
			invoiceRepository.save(invoice);
			log.info("Updated invoice {} status to {}", invoice.getId(), finalStatus);

			Payment payment = new Payment();
			payment.setInvoiceId(invoice.getId());
			payment.setCustomerId(invoice.getCustomerId());
			payment.setInsurerId(invoice.getInsurerId());
			payment.setAmount(invoice.getAmount());
			payment.setStatus(finalStatus);
			payment.setRazorpayPaymentId(razorpayPaymentId);
			payment.setRazorpaySubscriptionId(subscriptionId != null ? subscriptionId : "");
			payment.setMethod("razorpay");
			payment.setAutoPay(subscriptionId != null && !subscriptionId.isEmpty());

			if (!invoice.getTaxDetailsList().isEmpty()) {
				Invoice.TaxDetails taxDetails = invoice.getTaxDetailsList().get(0);
				Payment.TaxDetails paymentTax = new Payment.TaxDetails();
				paymentTax.setTaxType("GST");
				paymentTax.setTaxRate(taxDetails.getGstRate());
				paymentTax.setTaxAmount(taxDetails.getTaxAmount());
				paymentTax.setTotalAmount(taxDetails.getTotalAmount());
				payment.setTaxDetails(paymentTax);
			}

			payment.setPaidAt(new Date());
			paymentRepository.save(payment);
			log.info("Saved payment for invoice {}", invoice.getId());

			try {
				String statusForNotify = "SUCCESS";
				if (!"paid".equals(payment.getStatus())) {
					statusForNotify = "FAILED";
				}
				sendPaymentStatusNotification(payment.getCustomerId(), null, invoice.getId(), statusForNotify,
						payment.getAmount());
			} catch (Exception ex) {
				log.error("Failed to send payment status notification", ex);
			}

			// Update customer's payment history by policy
			Optional<Customer> optCustomer = customerRepository.findById(invoice.getCustomerId());
			if (optCustomer.isEmpty()) {
				log.error("Customer not found for id: {}", invoice.getCustomerId());
				throw new RuntimeException("Customer not found");
			}
			Customer customer = optCustomer.get();

			for (String policyId : invoice.getPolicyIds()) {
				Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
						.filter(h -> h.getPolicyId().equals(policyId)).findFirst();

				Customer.PaymentHistory history = optHistory.orElseGet(() -> {
					Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
					newHistory.setPolicyId(policyId);
					customer.getPaymentHistory().add(newHistory);
					log.info("Created new payment history entry for policy {}", policyId);
					return newHistory;
				});

				history.setStatus(finalStatus);
				Date now = new Date();
				history.setLastPaidDate(now);

				if ("paid".equals(status) || "paidByAutopay".equals(finalStatus)) {
					Calendar cal = Calendar.getInstance();
					cal.setTime(now);
					cal.add(Calendar.MONTH, invoice.getMonths());
					history.setValidUpto(cal.getTime());
					log.info("Extended validUpto for policy {} to {}", policyId, history.getValidUpto());
				}
			}

			customerRepository.save(customer);
			log.info("Updated customer {} payment history", customer.getId());
		}
	}

	@Override
	public List<Payment> getPaymentHistory(String customerId) {
		log.info("Fetching payment history for customerId: {}", customerId);
		Sort sort = Sort.by(Sort.Direction.DESC, "paidAt");
		List<Payment> payments = paymentRepository.findByCustomerId(customerId, sort);
		if (payments.isEmpty()) {
			log.warn("No payment records found for customerId: {}", customerId);
		}
		return payments;
	}

	@Override
	public Optional<Invoice> getInvoiceById(String invoiceId) {
		return invoiceRepository.findById(invoiceId);
	}

	@Override
	public List<String> getPolicyNamesByIds(List<String> policyIds) {
		log.info("Fetching policy names for IDs: {}", policyIds);
		List<Policy> policies = policyRepository.findAllByIdIn(policyIds);
		return policies.stream().map(Policy::getName).collect(Collectors.toList());
	}

	@Override
	public String enableAutoPay(String customerId, String invoiceId, int months, double amount) {
		log.info("Enabling autopay for customerId: {}, invoiceId: {}", customerId, invoiceId);
		try {
			RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);

			JSONObject subRequest = new JSONObject();
			subRequest.put("plan_id", planId);
			subRequest.put("total_count", months);
			subRequest.put("quantity", 1);
			subRequest.put("customer_notify", 1);
			subRequest.put("notes", new JSONObject().put("customerId", customerId).put("invoiceId", invoiceId));

			Subscription subscription = razorpay.subscriptions.create(subRequest);
			String subscriptionId = subscription.get("id");

			Optional<Customer> optCustomer = customerRepository.findById(customerId);
			if (optCustomer.isPresent()) {
				Customer customer = optCustomer.get();
				customer.setAutoPayEnabled(true);
				customerRepository.save(customer);
			}

			Optional<Invoice> optInvoice = invoiceRepository.findById(invoiceId);
			if (optInvoice.isPresent()) {
				Invoice invoice = optInvoice.get();
				invoice.setRazorpaySubscriptionId(subscriptionId);
				invoiceRepository.save(invoice);
			}
			log.info("Autopay enabled with subscriptionId: {}", subscriptionId);
			return subscriptionId;

		} catch (Exception e) {
			log.error("Error enabling autopay", e);
			throw new RuntimeException("Failed to enable autopay");
		}
	}

	private String findExistingRazorpayId(String email, String phone) {
		log.warn("Searching Razorpay customer for email {} or phone {}", email, phone);

		try {
			int count = 100;
			int skip = 0;
			String auth = Base64.getEncoder()
					.encodeToString((keyId + ":" + keySecret).getBytes(StandardCharsets.UTF_8));

			HttpHeaders headers = new HttpHeaders();
			headers.set("Authorization", "Basic " + auth);
			headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

			boolean hasMore = true;
			while (hasMore) {
				String url = String.format("https://api.razorpay.com/v1/customers?count=%d&skip=%d", count, skip);
				HttpEntity<String> entity = new HttpEntity<>(headers);

				ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

				if (!response.getStatusCode().is2xxSuccessful()) {
					log.error("Failed to list Razorpay customers, HTTP status: {}", response.getStatusCodeValue());
					return null;
				}

				JSONObject json = new JSONObject(response.getBody());
				JSONArray items = json.getJSONArray("items");

				for (int i = 0; i < items.length(); i++) {
					JSONObject cust = items.getJSONObject(i);
					String custEmail = cust.optString("email", "");
					String custContact = cust.optString("contact", "").replaceAll("\\s+", "");

					if ((email != null && email.equalsIgnoreCase(custEmail))
							|| (phone != null && phone.replaceAll("\\s+", "").equals(custContact))) {
						String customerId = cust.getString("id");
						log.info("Found existing Razorpay customer id: {}", customerId);
						return customerId;
					}
				}

				hasMore = items.length() == count;
				skip += count;
			}
		} catch (Exception ex) {
			log.error("Error searching for existing Razorpay customer: ", ex);
		}
		return null;
	}

	@Override
	public String enableAutoPayPolicy(String customerId, String policyId, int months, double amount) {
		log.info("Enabling autopay for customerId: {}, policyId: {}, months: {}, amount: {}", customerId, policyId,
				months, amount);

		try {
			Optional<Policy> optPolicy = policyRepository.findById(policyId);
			if (optPolicy.isEmpty())
				throw new RuntimeException("Policy not found for id: " + policyId);
			Policy policy = optPolicy.get();

			Optional<Customer> optCustomer = customerRepository.findById(customerId);
			if (optCustomer.isEmpty())
				throw new RuntimeException("Customer not found for id: " + customerId);
			Customer customer = optCustomer.get();

			// Find or create PaymentHistory for this policy
			Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
					.filter(h -> h.getPolicyId().equals(policyId)).findFirst();

			RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);

			String razorpayCustomerId = customer.getRazorpayCustomerId();
			if (razorpayCustomerId == null || razorpayCustomerId.isEmpty()) {
				JSONObject customerRequest = new JSONObject();
				customerRequest.put("name", customer.getName() != null ? customer.getName() : "Customer");
				customerRequest.put("email", customer.getEmail());
				String contactNum = customer.getPhone();
				if (!contactNum.startsWith("+")) {
					contactNum = "+" + contactNum;
				}
				customerRequest.put("contact", contactNum);

				try {
					com.razorpay.Customer newCustomer = razorpay.customers.create(customerRequest);
					razorpayCustomerId = newCustomer.get("id");
					log.info("Created new Razorpay customer with id {}", razorpayCustomerId);
				} catch (RazorpayException e) {
					if (e.getMessage() != null && e.getMessage().contains("already exists")) {
						log.warn("Customer exists on Razorpay, attempting to find existing customer id");
						razorpayCustomerId = findExistingRazorpayId(customer.getEmail(), customer.getPhone());
						if (razorpayCustomerId == null) {
							throw new RuntimeException("Failed to get existing Razorpay customer id: " + e.getMessage(),
									e);
						}
						log.info("Using existing Razorpay customer id: {}", razorpayCustomerId);
					} else {
						throw e;
					}
				}
				customer.setRazorpayCustomerId(razorpayCustomerId);
				customerRepository.save(customer);

			} else {
				log.info("Using existing Razorpay Customer ID: {}", razorpayCustomerId);
			}

			// Prepare subscription creation payload
			JSONObject subRequest = new JSONObject();
			subRequest.put("plan_id", planId); // Your configured plan ID
			subRequest.put("total_count", months);
			subRequest.put("quantity", 1);
			subRequest.put("customer_notify", 1);
			subRequest.put("customer_id", razorpayCustomerId);
			subRequest.put("notes", new JSONObject().put("customerId", customerId).put("policyId", policyId));

			Subscription subscription = razorpay.subscriptions.create(subRequest);
			String subscriptionId = subscription.get("id");

			// Update global autopay flag (optional)
			customer.setAutoPayEnabled(true);

			Customer.PaymentHistory history = optHistory.orElseGet(() -> {
				Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
				newHistory.setPolicyId(policyId);
				customer.getPaymentHistory().add(newHistory);
				log.info("Created new payment history entry for policy {}", policyId);
				return newHistory;
			});

			// Update payment history for autopay subscription
			history.setStatus("paidByAutopayActive");
			history.setRazorpaySubscriptionId(subscriptionId);
			// Optional: if you added autopayEnabled boolean field in PaymentHistory, set it
			// here
			// history.setAutopayEnabled(true);

			customerRepository.save(customer);

			// Send notification to customer on autopay enablement
			sendAutoPayNotification(customer.getEmail(), policyId, true);

			log.info("Autopay enabled with subscriptionId: {}", subscriptionId);
			return subscriptionId;

		} catch (Exception e) {
			log.error("Error enabling autopay for policy: {}", e.getMessage(), e);
			throw new RuntimeException("Failed to enable autopay: " + e.getMessage());
		}
	}

	// 2-param disableAutoPay delegates to 3-param with null policyId
	@Override
	public void disableAutoPay(String customerId, String subscriptionId) {
		disableAutoPay(customerId, subscriptionId, null);
	}

	@Override
	public void disableAutoPay(String customerId, String subscriptionId, String policyId) {
		log.info("Disabling autopay for customerId: {}, subscriptionId: {}, policyId: {}", customerId, subscriptionId,
				policyId);
		try {
			RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
			JSONObject cancelOptions = new JSONObject();
			cancelOptions.put("cancel_at_cycle_end", 0); // immediate cancel
			razorpay.subscriptions.cancel(subscriptionId, cancelOptions);

			Optional<Customer> optCustomer = customerRepository.findById(customerId);
			if (optCustomer.isPresent()) {
				Customer customer = optCustomer.get();
				customer.setAutoPayEnabled(false); // global flag

				if (policyId != null) {
					Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
							.filter(h -> policyId.equals(h.getPolicyId())).findFirst();
					if (optHistory.isPresent()) {
						Customer.PaymentHistory history = optHistory.get();
						history.setStatus("paidByAutopayInActive");
					}
					sendAutoPayNotification(customer.getEmail(), policyId, false);
				}
				customerRepository.save(customer);
			} else {
				log.warn("Customer not found for id: {}", customerId);
			}
			log.info("Autopay disabled successfully (subscriptionId: {})", subscriptionId);
		} catch (Exception e) {
			log.error("Error disabling autopay", e);
			throw new RuntimeException("Failed to disable autopay: " + e.getMessage());
		}
	}

	@Override
	public List<Policy> getOwnedPolicies(String customerId) {
		log.info("Fetching owned policies for customerId: {}", customerId);
		Optional<Customer> optCustomer = customerRepository.findById(customerId);
		if (optCustomer.isEmpty()) {
			throw new RuntimeException("Customer not found");
		}
		List<String> policyIds = optCustomer.get().getPolicyIds();
		return policyRepository.findAllByIdIn(policyIds);
	}

	/**
	 * Helper method to send autopay enable/disable notification
	 */
	private void sendAutoPayNotification(String toEmail, String policyId, boolean enabled) {
		// Fetch policy name
		String policyName = null;
		Optional<Policy> policyOpt = policyRepository.findById(policyId);
		if (policyOpt.isPresent()) {
			policyName = policyOpt.get().getName();
		}
		Map<String, Object> payload = new HashMap<>();
		payload.put("toEmail", toEmail);
		payload.put("policyId", policyId);
		payload.put("policyName", policyName);
		payload.put("enabled", enabled);

		try {
			restTemplate.postForEntity(notificationBaseUrl + "/autopay-status", payload, String.class);
			log.info("Sent autopay {} notification for policy {}", enabled ? "ENABLED" : "DISABLED", policyId);
		} catch (Exception ex) {
			log.error("Failed to send autopay {} notification", enabled ? "enabled" : "disabled", ex);
		}
	}

	private void sendPaymentStatusNotification(String customerId, String customerName, String invoiceId, String status,
			Double amount) {
		try {
			Optional<Customer> optCustomer = customerRepository.findById(customerId);
			if (optCustomer.isEmpty()) {
				log.warn("Customer not found for payment notification: {}", customerId);
				return;
			}
			String toEmail = optCustomer.get().getEmail();

			Map<String, Object> payload = new HashMap<>();
			payload.put("toEmail", toEmail);
			payload.put("customerName", customerName);
			payload.put("invoiceId", invoiceId);
			payload.put("status", status);
			payload.put("amount", amount);

			log.info("Attempting to send payment notification to {} with payload: {}", toEmail, payload);

			// Make REST call to Notification Microservice endpoint /payment-status
			String url = notificationBaseUrl + "/payment-status";
			String response = restTemplate.postForObject(url, payload, String.class);

			log.info("Payment status notification sent, response: {}", response);
		} catch (Exception e) {
			log.error("Error sending payment status notification", e);
		}
	}
	
	@Override
	public List<Invoice> getInvoiceHistory(String customerId) {
	    // Validate customer existence if needed

	    // Fetch invoices by customer id using repository
	    return invoiceRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
	}


}

//working
//package training.iqgateway.service.impl;
//
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.data.domain.Sort;
//import org.springframework.stereotype.Service;
//import org.springframework.web.client.RestTemplate;
//
//import org.springframework.http.*;
//
//import java.util.ArrayList;
//import java.util.Base64;
//import org.json.JSONObject;
//import org.json.JSONArray;
//import java.nio.charset.StandardCharsets;
//
//import training.iqgateway.entity.Customer;
//import training.iqgateway.entity.Invoice;
//import training.iqgateway.entity.Payment;
//import training.iqgateway.entity.Policy;
//import training.iqgateway.repository.CustomerRepository;
//import training.iqgateway.repository.InvoiceRepository;
//import training.iqgateway.repository.PaymentRepository;
//import training.iqgateway.repository.PolicyRepository;
//import training.iqgateway.service.CustomerService;
//
//import com.razorpay.RazorpayClient;
//import com.razorpay.RazorpayException;
//import com.razorpay.Subscription;
//
//import org.json.JSONObject;
//
//import java.util.Calendar;
//import java.util.Collections;
//import java.util.Date;
//import java.util.HashMap;
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//import java.util.stream.Collectors;
//
//import java.time.LocalDate;
//import java.time.ZoneId;
//import org.springframework.data.mongodb.core.MongoTemplate;
//import org.springframework.data.mongodb.core.query.Criteria;
//import org.springframework.data.mongodb.core.query.Query;
//
//
//@Service
//public class CustomerServiceImpl implements CustomerService {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerServiceImpl.class);
//    
//    @Autowired
//    private MongoTemplate mongoTemplate;
//
//    @Autowired
//    private InvoiceRepository invoiceRepository;
//
//    @Autowired
//    private PaymentRepository paymentRepository;
//
//    @Autowired
//    private CustomerRepository customerRepository;
//
//    @Autowired
//    private PolicyRepository policyRepository;
//
//    @Autowired
//    private RestTemplate restTemplate;
//
//    @Value("${razorpay.key_id}")
//    private String keyId;
//
//    @Value("${razorpay.key_secret}")
//    private String keySecret;
//
//    @Value("${razorpay.plan_id}")
//    private String planId;
//
//    @Value("${notification.base_url}")
//    private String notificationBaseUrl; // e.g., http://localhost:8886/notify
//    
//    public List<Customer> getCustomersWithExpiringPoliciesByDays(int days) {
//        Date now = new Date();
//        Calendar cal = Calendar.getInstance();
//        cal.setTime(now);
//        cal.add(Calendar.DAY_OF_YEAR, days);
//        Date rangeEnd = cal.getTime();
//
//        List<Customer> allCustomers = customerRepository.findAll();
//        List<Customer> filteredCustomers = new ArrayList<>();
//
//        for (Customer customer : allCustomers) {
//            // Filter paymentHistories for policies expiring in next 'days'
//            List<Customer.PaymentHistory> filteredPaymentHistory = customer.getPaymentHistory().stream()
//                .filter(entry -> {
//                    Date validUpto = entry.getValidUpto();
//                    if (validUpto == null) return false;
//                    // validUpto must be between now and rangeEnd (inclusive)
//                    return !validUpto.before(now) && !validUpto.after(rangeEnd);
//                })
//                .collect(Collectors.toList());
//
//            if (!filteredPaymentHistory.isEmpty()) {
//                // Replace with filtered list
//                customer.setPaymentHistory(filteredPaymentHistory);
//                filteredCustomers.add(customer);
//            }
//        }
//        return filteredCustomers;
//    }
//    
//    public List<Customer> findCustomersWithinDaysUntilExpiry(int daysUntilExpiry) {
//        LocalDate today = LocalDate.now();
//        LocalDate expiryThresholdDate = today.plusDays(daysUntilExpiry);
//
//        Date todayDate = Date.from(today.atStartOfDay(ZoneId.systemDefault()).toInstant());
//        Date expiryThreshold = Date.from(expiryThresholdDate.atStartOfDay(ZoneId.systemDefault()).toInstant());
//
//        Query query = new Query();
//        query.addCriteria(Criteria.where("paymentHistory.validUpto")
//                .gte(todayDate)       // validUpto >= today
//                .lte(expiryThreshold) // validUpto <= today + daysUntilExpiry
//        );
//
//        List<Customer> customers = mongoTemplate.find(query, Customer.class);
//        return customers;
//    }
//    
//    public void sendPolicyExpiryNotification(String customerId, String policyId) {
//        Optional<Customer> optCustomer = customerRepository.findById(customerId);
//        if (optCustomer.isEmpty()) {
//            log.warn("Customer not found: {}", customerId);
//            return;
//        }
//        Customer customer = optCustomer.get();
//
//        Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory()
//            .stream()
//            .filter(h -> h.getPolicyId().equals(policyId))
//            .findFirst();
//
//        if (optHistory.isEmpty() || optHistory.get().getValidUpto() == null) {
//            log.warn("Payment history or validUpto not found for customerId: {}, policyId: {}", customerId, policyId);
//            return;
//        }
//
//        String toEmail = customer.getEmail();
//        String expiryDateStr = optHistory.get().getValidUpto().toString();
//
//        Map<String, String> payload = new HashMap<>();
//        payload.put("toEmail", toEmail);
//        payload.put("policyId", policyId);
//        payload.put("expiryDate", expiryDateStr);
//
//        try {
//            restTemplate.postForEntity(notificationBaseUrl + "/policy-expiry", payload, String.class);
//            log.info("Sent policy expiry notification request to Notification Microservice for {}, policy {}", toEmail, policyId);
//        } catch (Exception e) {
//            log.error("Failed to send notification to Notification Microservice", e);
//        }
//    }
//
//    
//
//    @Override
//    public List<Invoice> getUnpaidInvoices(String customerId) {
//        log.info("Fetching unpaid invoices for customerId: {}", customerId);
//        return invoiceRepository.findByCustomerIdAndStatus(customerId, "unpaid");
//    }
//
//    @Override
//    public void processPayment(String razorpayOrderId, String razorpayPaymentId, String status) {
//        processPayment(razorpayOrderId, razorpayPaymentId, status, null);
//    }
//
//    @Override
//    public void processPayment(String razorpayOrderId, String razorpayPaymentId, String status, String subscriptionId) {
//        log.info("Starting processPayment - OrderID: {}, PaymentID: {}, Status: {}, SubscriptionID: {}", razorpayOrderId, razorpayPaymentId, status, subscriptionId);
//
//        if (subscriptionId != null && !subscriptionId.isEmpty()) {
//            // AutoPay subscription payment handling
//            try {
//                RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//                Subscription subscription = razorpay.subscriptions.fetch(subscriptionId);
//                JSONObject notes = subscription.get("notes");
//                String customerId = notes.optString("customerId");
//                String policyId = notes.optString("policyId");
//
//                if (customerId.isEmpty() || policyId.isEmpty()) {
//                    throw new RuntimeException("Subscription notes missing required customerId or policyId");
//                }
//
//                Optional<Policy> optPolicy = policyRepository.findById(policyId);
//                if (optPolicy.isEmpty()) throw new RuntimeException("Policy not found");
//                Policy policy = optPolicy.get();
//
//                double monthlyAmount = policy.getMonthlyPremium();
//
//                // Create Payment record for autopay
//                Payment payment = new Payment();
//                payment.setCustomerId(customerId);
//                payment.setInvoiceId(null); // autopay payments have no invoice
//                payment.setInsurerId(policy.getInsurerId());
//                payment.setAmount(monthlyAmount);
//                payment.setStatus("paidByAutopay");
//                payment.setRazorpayPaymentId(razorpayPaymentId);
//                payment.setRazorpaySubscriptionId(subscriptionId);
//                payment.setMethod("autopaid");
//                payment.setAutoPay(true);
//                payment.setTaxDetails(new Payment.TaxDetails("GST", 0.18, monthlyAmount * 0.18, monthlyAmount * 1.18));
//                payment.setPaidAt(new Date());
//
//                paymentRepository.save(payment);
//                log.info("Saved autopay payment for policyId {}", policyId);
//                
//                try {
//                    String statusForNotify = "SUCCESS";
//                    if (!"paidByAutopay".equals(payment.getStatus()) && !"paid".equals(payment.getStatus())) {
//                        statusForNotify = "FAILED";
//                    }
//                    sendPaymentStatusNotification(payment.getCustomerId(), policy.getName(), null, statusForNotify, payment.getAmount());
//                } catch (Exception ex) {
//                    log.error("Failed to send payment status notification", ex);
//                }
//
//
//                // Update customer's payment history for this policy
//                Optional<Customer> optCustomer = customerRepository.findById(customerId);
//                if (optCustomer.isPresent()) {
//                    Customer customer = optCustomer.get();
//                    Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                        .filter(h -> h.getPolicyId().equals(policyId))
//                        .findFirst();
//
//                    Customer.PaymentHistory history = optHistory.orElseGet(() -> {
//                        Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
//                        newHistory.setPolicyId(policyId);
//                        customer.getPaymentHistory().add(newHistory);
//                        log.info("Created new payment history entry for policy {}", policyId);
//                        return newHistory;
//                    });
//
//                    history.setStatus("paidByAutopay");
//                    Date now = new Date();
//                    history.setLastPaidDate(now);
//
//                    Calendar cal = Calendar.getInstance();
//                    cal.setTime(history.getValidUpto() != null ? history.getValidUpto() : now);
//                    cal.add(Calendar.MONTH, 1); // extend by 1 month for autopay payment
//                    history.setValidUpto(cal.getTime());
//
//                    customer.setAutoPayEnabled(true);
//                    customerRepository.save(customer);
//                    log.info("Updated customer payment history and autopay status");
//                } else {
//                    log.error("Customer not found for auto pay update: {}", customerId);
//                }
//            } catch (RazorpayException e) {
//                log.error("Error during autopay subscription fetch", e);
//                throw new RuntimeException("Failed to process autopay payment: " + e.getMessage());
//            }
//        } else {
//            // One-time payment logic with invoice
//            String trimmedOrderId = razorpayOrderId.trim();
//            Optional<Invoice> optInvoice = invoiceRepository.findByRazorpayOrderId(trimmedOrderId);
//
//            if (optInvoice.isEmpty()) {
//                log.error("Invoice not found for orderId: {}", trimmedOrderId);
//                throw new RuntimeException("Invoice not found for order id: " + trimmedOrderId);
//            }
//
//            Invoice invoice = optInvoice.get();
//            String finalStatus = status;
//            if (subscriptionId != null && !subscriptionId.isEmpty() && "paid".equals(status)) {
//                finalStatus = "paidByAutopay";
//            }
//
//            invoice.setStatus(finalStatus);
//            invoiceRepository.save(invoice);
//            log.info("Updated invoice {} status to {}", invoice.getId(), finalStatus);
//
//            Payment payment = new Payment();
//            payment.setInvoiceId(invoice.getId());
//            payment.setCustomerId(invoice.getCustomerId());
//            payment.setInsurerId(invoice.getInsurerId());
//            payment.setAmount(invoice.getAmount());
//            payment.setStatus(finalStatus);
//            payment.setRazorpayPaymentId(razorpayPaymentId);
//            payment.setRazorpaySubscriptionId(subscriptionId != null ? subscriptionId : "");
//            payment.setMethod("razorpay");
//            payment.setAutoPay(subscriptionId != null && !subscriptionId.isEmpty());
//
//            if (!invoice.getTaxDetailsList().isEmpty()) {
//                Invoice.TaxDetails taxDetails = invoice.getTaxDetailsList().get(0);
//                Payment.TaxDetails paymentTax = new Payment.TaxDetails();
//                paymentTax.setTaxType("GST");
//                paymentTax.setTaxRate(taxDetails.getGstRate());
//                paymentTax.setTaxAmount(taxDetails.getTaxAmount());
//                paymentTax.setTotalAmount(taxDetails.getTotalAmount());
//                payment.setTaxDetails(paymentTax);
//            }
//
//            payment.setPaidAt(new Date());
//            paymentRepository.save(payment);
//            log.info("Saved payment for invoice {}", invoice.getId());
//            
//            try {
//                String statusForNotify = "SUCCESS";
//                if (!"paid".equals(payment.getStatus())) {
//                    statusForNotify = "FAILED";
//                }
//                sendPaymentStatusNotification(payment.getCustomerId(), null, invoice.getId(), statusForNotify, payment.getAmount());
//            } catch (Exception ex) {
//                log.error("Failed to send payment status notification", ex);
//            }
//
//
//            // Update customer's payment history by policy
//            Optional<Customer> optCustomer = customerRepository.findById(invoice.getCustomerId());
//            if (optCustomer.isEmpty()) {
//                log.error("Customer not found for id: {}", invoice.getCustomerId());
//                throw new RuntimeException("Customer not found");
//            }
//            Customer customer = optCustomer.get();
//
//            for (String policyId : invoice.getPolicyIds()) {
//                Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                    .filter(h -> h.getPolicyId().equals(policyId))
//                    .findFirst();
//
//                Customer.PaymentHistory history = optHistory.orElseGet(() -> {
//                    Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
//                    newHistory.setPolicyId(policyId);
//                    customer.getPaymentHistory().add(newHistory);
//                    log.info("Created new payment history entry for policy {}", policyId);
//                    return newHistory;
//                });
//
//                history.setStatus(finalStatus);
//                Date now = new Date();
//                history.setLastPaidDate(now);
//
//                if ("paid".equals(status) || "paidByAutopay".equals(finalStatus)) {
//                    Calendar cal = Calendar.getInstance();
//                    cal.setTime(now);
//                    cal.add(Calendar.MONTH, invoice.getMonths());
//                    history.setValidUpto(cal.getTime());
//                    log.info("Extended validUpto for policy {} to {}", policyId, history.getValidUpto());
//                }
//            }
//
//            customerRepository.save(customer);
//            log.info("Updated customer {} payment history", customer.getId());
//        }
//    }
//    
//
//
//    @Override
//    public List<Payment> getPaymentHistory(String customerId) {
//        log.info("Fetching payment history for customerId: {}", customerId);
//        Sort sort = Sort.by(Sort.Direction.DESC, "paidAt");
//        List<Payment> payments = paymentRepository.findByCustomerId(customerId, sort);
//        if (payments.isEmpty()) {
//            log.warn("No payment records found for customerId: {}", customerId);
//        }
//        return payments;
//    }
//
//    @Override
//    public Optional<Invoice> getInvoiceById(String invoiceId) {
//        return invoiceRepository.findById(invoiceId);
//    }
//
//    @Override
//    public List<String> getPolicyNamesByIds(List<String> policyIds) {
//        log.info("Fetching policy names for IDs: {}", policyIds);
//        List<Policy> policies = policyRepository.findAllByIdIn(policyIds);
//        return policies.stream()
//                .map(Policy::getName)
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    public String enableAutoPay(String customerId, String invoiceId, int months, double amount) {
//        log.info("Enabling autopay for customerId: {}, invoiceId: {}", customerId, invoiceId);
//        try {
//            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//
//            JSONObject subRequest = new JSONObject();
//            subRequest.put("plan_id", planId);
//            subRequest.put("total_count", months);
//            subRequest.put("quantity", 1);
//            subRequest.put("customer_notify", 1);
//            subRequest.put("notes", new JSONObject().put("customerId", customerId).put("invoiceId", invoiceId));
//
//            Subscription subscription = razorpay.subscriptions.create(subRequest);
//            String subscriptionId = subscription.get("id");
//
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isPresent()) {
//                Customer customer = optCustomer.get();
//                customer.setAutoPayEnabled(true);
//                customerRepository.save(customer);
//            }
//
//            Optional<Invoice> optInvoice = invoiceRepository.findById(invoiceId);
//            if (optInvoice.isPresent()) {
//                Invoice invoice = optInvoice.get();
//                invoice.setRazorpaySubscriptionId(subscriptionId);
//                invoiceRepository.save(invoice);
//            }
//            log.info("Autopay enabled with subscriptionId: {}", subscriptionId);
//            return subscriptionId;
//
//        } catch (Exception e) {
//            log.error("Error enabling autopay", e);
//            throw new RuntimeException("Failed to enable autopay");
//        }
//    }
//
//
//
//
//    private String findExistingRazorpayId(String email, String phone) {
//        log.warn("Searching Razorpay customer for email {} or phone {}", email, phone);
//
//        try {
//            int count = 100;
//            int skip = 0;
//            String auth = Base64.getEncoder().encodeToString((keyId + ":" + keySecret).getBytes(StandardCharsets.UTF_8));
//
//            HttpHeaders headers = new HttpHeaders();
//            headers.set("Authorization", "Basic " + auth);
//            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
//
//            boolean hasMore = true;
//            while(hasMore) {
//                String url = String.format("https://api.razorpay.com/v1/customers?count=%d&skip=%d", count, skip);
//                HttpEntity<String> entity = new HttpEntity<>(headers);
//
//                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
//
//                if (!response.getStatusCode().is2xxSuccessful()) {
//                    log.error("Failed to list Razorpay customers, HTTP status: {}", response.getStatusCodeValue());
//                    return null;
//                }
//
//                JSONObject json = new JSONObject(response.getBody());
//                JSONArray items = json.getJSONArray("items");
//
//                for(int i = 0; i < items.length(); i++) {
//                    JSONObject cust = items.getJSONObject(i);
//                    String custEmail = cust.optString("email", "");
//                    String custContact = cust.optString("contact", "").replaceAll("\\s+","");
//
//                    if ((email != null && email.equalsIgnoreCase(custEmail)) ||
//                        (phone != null && phone.replaceAll("\\s+","").equals(custContact))) {
//                        String customerId = cust.getString("id");
//                        log.info("Found existing Razorpay customer id: {}", customerId);
//                        return customerId;
//                    }
//                }
//
//                hasMore = items.length() == count;
//                skip += count;
//            }
//        } catch(Exception ex) {
//            log.error("Error searching for existing Razorpay customer: ", ex);
//        }
//        return null;
//    }
//
//
//    @Override
//    public String enableAutoPayPolicy(String customerId, String policyId, int months, double amount) {
//        log.info("Enabling autopay for customerId: {}, policyId: {}, months: {}, amount: {}", customerId, policyId, months, amount);
//
//        try {
//            Optional<Policy> optPolicy = policyRepository.findById(policyId);
//            if (optPolicy.isEmpty()) throw new RuntimeException("Policy not found for id: " + policyId);
//            Policy policy = optPolicy.get();
//
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isEmpty()) throw new RuntimeException("Customer not found for id: " + customerId);
//            Customer customer = optCustomer.get();
//
//            // Find or create PaymentHistory for this policy
//            Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                    .filter(h -> h.getPolicyId().equals(policyId))
//                    .findFirst();
//
//            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//
//            String razorpayCustomerId = customer.getRazorpayCustomerId();
//            if (razorpayCustomerId == null || razorpayCustomerId.isEmpty()) {
//                JSONObject customerRequest = new JSONObject();
//                customerRequest.put("name", customer.getName() != null ? customer.getName() : "Customer");
//                customerRequest.put("email", customer.getEmail());
//                String contactNum = customer.getPhone();
//                if (!contactNum.startsWith("+")) {
//                    contactNum = "+" + contactNum;
//                }
//                customerRequest.put("contact", contactNum);
//
//                try {
//                    com.razorpay.Customer newCustomer = razorpay.customers.create(customerRequest);
//                    razorpayCustomerId = newCustomer.get("id");
//                    log.info("Created new Razorpay customer with id {}", razorpayCustomerId);
//                } catch (RazorpayException e) {
//                    if (e.getMessage() != null && e.getMessage().contains("already exists")) {
//                        log.warn("Customer exists on Razorpay, attempting to find existing customer id");
//                        razorpayCustomerId = findExistingRazorpayId(customer.getEmail(), customer.getPhone());
//                        if (razorpayCustomerId == null) {
//                            throw new RuntimeException("Failed to get existing Razorpay customer id: " + e.getMessage(), e);
//                        }
//                        log.info("Using existing Razorpay customer id: {}", razorpayCustomerId);
//                    } else {
//                        throw e;
//                    }
//                }
//                customer.setRazorpayCustomerId(razorpayCustomerId);
//                customerRepository.save(customer);
//
//            } else {
//                log.info("Using existing Razorpay Customer ID: {}", razorpayCustomerId);
//            }
//
//            // Prepare subscription creation payload
//            JSONObject subRequest = new JSONObject();
//            subRequest.put("plan_id", planId); // Your configured plan ID
//            subRequest.put("total_count", months);
//            subRequest.put("quantity", 1);
//            subRequest.put("customer_notify", 1);
//            subRequest.put("customer_id", razorpayCustomerId);
//            subRequest.put("notes", new JSONObject()
//                    .put("customerId", customerId)
//                    .put("policyId", policyId));
//
//            Subscription subscription = razorpay.subscriptions.create(subRequest);
//            String subscriptionId = subscription.get("id");
//
//            // Update global autopay flag (optional)
//            customer.setAutoPayEnabled(true);
//
//            Customer.PaymentHistory history = optHistory.orElseGet(() -> {
//                Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
//                newHistory.setPolicyId(policyId);
//                customer.getPaymentHistory().add(newHistory);
//                log.info("Created new payment history entry for policy {}", policyId);
//                return newHistory;
//            });
//
//            // Update payment history for autopay subscription
//            history.setStatus("paidByAutopayActive");
//            history.setRazorpaySubscriptionId(subscriptionId);
//            // Optional: if you added autopayEnabled boolean field in PaymentHistory, set it here
//            // history.setAutopayEnabled(true);
//
//            customerRepository.save(customer);
//
//            // Send notification to customer on autopay enablement
//            sendAutoPayNotification(customer.getEmail(), policyId, true);
//
//            log.info("Autopay enabled with subscriptionId: {}", subscriptionId);
//            return subscriptionId;
//
//        } catch (Exception e) {
//            log.error("Error enabling autopay for policy: {}", e.getMessage(), e);
//            throw new RuntimeException("Failed to enable autopay: " + e.getMessage());
//        }
//    }
//
//    // 2-param disableAutoPay delegates to 3-param with null policyId
//    @Override
//    public void disableAutoPay(String customerId, String subscriptionId) {
//        disableAutoPay(customerId, subscriptionId, null);
//    }
//
//    @Override
//    public void disableAutoPay(String customerId, String subscriptionId, String policyId) {
//        log.info("Disabling autopay for customerId: {}, subscriptionId: {}, policyId: {}", customerId, subscriptionId, policyId);
//        try {
//            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//            JSONObject cancelOptions = new JSONObject();
//            cancelOptions.put("cancel_at_cycle_end", 0); // immediate cancel
//            razorpay.subscriptions.cancel(subscriptionId, cancelOptions);
//
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isPresent()) {
//                Customer customer = optCustomer.get();
//                customer.setAutoPayEnabled(false); // global flag, adjust if per-policy needed
//                customerRepository.save(customer);
//
//                if (policyId != null) {
//                    // Notify Notification Microservice for disable
//                    sendAutoPayNotification(customer.getEmail(), policyId, false);
//                }
//            } else {
//                log.warn("Customer not found for id: {}", customerId);
//            }
//            log.info("Autopay disabled successfully (subscriptionId: {})", subscriptionId);
//        } catch (Exception e) {
//            log.error("Error disabling autopay", e);
//            throw new RuntimeException("Failed to disable autopay: " + e.getMessage());
//        }
//    }
//
//    @Override
//    public List<Policy> getOwnedPolicies(String customerId) {
//        log.info("Fetching owned policies for customerId: {}", customerId);
//        Optional<Customer> optCustomer = customerRepository.findById(customerId);
//        if (optCustomer.isEmpty()) {
//            throw new RuntimeException("Customer not found");
//        }
//        List<String> policyIds = optCustomer.get().getPolicyIds();
//        return policyRepository.findAllByIdIn(policyIds);
//    }
//
//    /**
//     * Helper method to send autopay enable/disable notification
//     */
//    private void sendAutoPayNotification(String toEmail, String policyId, boolean enabled) {
//        Map<String, Object> payload = new HashMap<>();
//        payload.put("toEmail", toEmail);
//        payload.put("policyId", policyId);
//        payload.put("enabled", enabled);
//
//        try {
//            restTemplate.postForEntity(notificationBaseUrl + "/autopay-status", payload, String.class);
//            log.info("Sent autopay {} notification for policy {}", enabled ? "ENABLED" : "DISABLED", policyId);
//        } catch (Exception ex) {
//            log.error("Failed to send autopay {} notification", enabled ? "enabled" : "disabled", ex);
//        }
//    }
//    private void sendPaymentStatusNotification(String customerId, String customerName, String invoiceId, String status, Double amount) {
//        try {
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isEmpty()) {
//                log.warn("Customer not found for payment notification: {}", customerId);
//                return;
//            }
//            String toEmail = optCustomer.get().getEmail();
//
//            Map<String, Object> payload = new HashMap<>();
//            payload.put("toEmail", toEmail);
//            payload.put("customerName", customerName);
//            payload.put("invoiceId", invoiceId);
//            payload.put("status", status);
//            payload.put("amount", amount);
//
//            log.info("Attempting to send payment notification to {} with payload: {}", toEmail, payload);
//
//            // Make REST call to Notification Microservice endpoint /payment-status
//            String url = notificationBaseUrl + "/payment-status";
//            String response = restTemplate.postForObject(url, payload, String.class);
//
//            log.info("Payment status notification sent, response: {}", response);
//        } catch (Exception e) {
//            log.error("Error sending payment status notification", e);
//        }
//    }
//    
//
//}
