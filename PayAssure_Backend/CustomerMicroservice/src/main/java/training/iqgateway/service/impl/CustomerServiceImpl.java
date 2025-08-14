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
//
//

//package training.iqgateway.service.impl;
//
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import org.springframework.beans.factory.annotation.*;
//import org.springframework.data.domain.Sort;
//import org.springframework.stereotype.Service;
//import org.springframework.web.client.RestTemplate;
//
//import com.razorpay.RazorpayClient;
//import com.razorpay.Subscription;
//import com.razorpay.RazorpayException;
//
//import training.iqgateway.entity.*;
//import training.iqgateway.repository.*;
//import training.iqgateway.service.CustomerService;
//
//import java.util.*;
//import java.util.stream.Collectors;
//import java.util.Calendar;
//
//import org.json.JSONObject;
//
//@Service
//public class CustomerServiceImpl implements CustomerService {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerServiceImpl.class);
//
//    @Autowired private InvoiceRepository invoiceRepository;
//    @Autowired private PaymentRepository paymentRepository;
//    @Autowired private CustomerRepository customerRepository;
//    @Autowired private PolicyRepository policyRepository;
//    @Autowired private RestTemplate restTemplate;
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
//    @Value("${notification.base_url}") // e.g. http://localhost:8886/notify
//    private String notificationBaseUrl;
//
//    @Override
//    public List<Invoice> getUnpaidInvoices(String customerId) {
//        log.info("Fetching unpaid invoices for customerId={}", customerId);
//        return invoiceRepository.findByCustomerIdAndStatus(customerId, "unpaid");
//    }
//
//    @Override
//    public void processPayment(String orderId, String paymentId, String status, String subscriptionId) {
//        processPayment(orderId, paymentId, status, subscriptionId, null, Collections.emptyList(), Collections.emptyList(), 0.0);
//    }
//
//    @Override
//    public void processPayment(String orderId, String paymentId, String status, String subscriptionId,
//                               String customerId, List<String> policyIds, List<String> policyNames, double amount) {
//        log.info("Processing payment orderId={}, paymentId={}, status={}, subscriptionId={}, customerId={}, policies={}, policyNames={}, amount={}",
//            orderId, paymentId, status, subscriptionId, customerId, policyIds, policyNames, amount);
//
//        try {
//            if (subscriptionId != null && !subscriptionId.isBlank()) {
//                // autopay payment path
//                if (customerId == null || customerId.isBlank()) {
//                    throw new IllegalArgumentException("customerId is required for autopay payments.");
//                }
//
//                Optional<Customer> customerOpt = customerRepository.findById(customerId);
//                if (customerOpt.isEmpty()) {
//                    throw new RuntimeException("Customer not found: " + customerId);
//                }
//                Customer customer = customerOpt.get();
//
//                if (amount <= 0 && !policyIds.isEmpty()) {
//                    amount = policyRepository.findById(policyIds.get(0))
//                            .map(Policy::getMonthlyPremium)
//                            .orElse(0.0);
//                }
//
//                Payment payment = new Payment();
//                payment.setCustomerId(customerId);
//                payment.setPolicyIds(policyIds);
//                payment.setPolicyNames(policyNames);
//                payment.setAmount(amount);
//                payment.setAutoPay(true);
//                payment.setRazorpayPaymentId(paymentId != null ? paymentId : "");
//                payment.setRazorpaySubscriptionId(subscriptionId);
//                if (status == null || status.isBlank())
//                    status = "paidByAutopay";
//                payment.setStatus(status);
//                payment.setPaidAt(new Date());
//
//                paymentRepository.save(payment);
//
//                // Update customer payment history per policy
//                for (String pid : policyIds) {
//                    // Fetch or create payment history entry for this policy
//                    Customer.PaymentHistory hist = customer.getPaymentHistory().stream()
//                            .filter(h -> h.getPolicyId().equals(pid))
//                            .findFirst()
//                            .orElseGet(() -> {
//                                Customer.PaymentHistory newHist = new Customer.PaymentHistory();
//                                newHist.setPolicyId(pid);
//                                customer.getPaymentHistory().add(newHist);
//                                return newHist;
//                            });
//
//                    hist.setStatus("paidByAutopay");
//                    hist.setRazorpaySubscriptionId(subscriptionId);
//                    hist.setLastPaidDate(new Date());
//                    Calendar cal = Calendar.getInstance();
//                    cal.setTime(new Date());
//                    cal.add(Calendar.MONTH, 1);
//                    hist.setValidUpto(cal.getTime());
//                }
//                customer.setAutoPayEnabled(true);
//                customerRepository.save(customer);
//
//                // Send payment notification email
//                sendPaymentNotification(customer.getEmail(), customer.getName(), null,
//                        status.equalsIgnoreCase("paidByAutopay") ? "SUCCESS" : "FAILED", amount);
//
//                return;
//            }
//
//            // One-time payment path
//            if (orderId == null || orderId.isBlank()) {
//                throw new IllegalArgumentException("orderId is required for one-time payment");
//            }
//
//            Optional<Invoice> invoiceOpt = invoiceRepository.findByRazorpayOrderId(orderId.trim());
//            if (invoiceOpt.isEmpty()) {
//                throw new RuntimeException("Invoice not found for orderId: " + orderId);
//            }
//            Invoice invoice = invoiceOpt.get();
//
//            String finalStatus = (subscriptionId != null && !subscriptionId.isBlank() && "paid".equalsIgnoreCase(status))
//                    ? "paidByAutopay" : status;
//
//            invoice.setStatus(finalStatus);
//            invoiceRepository.save(invoice);
//
//            Payment payment = new Payment();
//            payment.setInvoiceId(invoice.getId());
//            payment.setCustomerId(invoice.getCustomerId());
//            payment.setAmount(amount > 0 ? amount : invoice.getAmount());
//            payment.setStatus(finalStatus);
//            payment.setRazorpayPaymentId(paymentId != null ? paymentId : "");
//            payment.setRazorpaySubscriptionId(subscriptionId != null ? subscriptionId : "");
//            payment.setAutoPay(subscriptionId != null && !subscriptionId.isBlank());
//            payment.setPaidAt(new Date());
//
//            if (!invoice.getTaxDetailsList().isEmpty()) {
//                Invoice.TaxDetails tax = invoice.getTaxDetailsList().get(0);
//                payment.setTaxDetails(new Payment.TaxDetails(
//                    "GST",
//                    tax.getGstRate(),
//                    tax.getTaxAmount(),
//                    tax.getTotalAmount()
//                ));
//            }
//
//            List<String> pIds = policyIds.isEmpty() ? invoice.getPolicyIds() : policyIds;
//            List<String> pNames = !policyNames.isEmpty() ? policyNames : getPolicyNamesByIds(pIds);
//
//            payment.setPolicyIds(pIds);
//            payment.setPolicyNames(pNames);
//
//            paymentRepository.save(payment);
//
//            Optional<Customer> customerOpt = customerRepository.findById(invoice.getCustomerId());
//            if (customerOpt.isPresent()) {
//                Customer c = customerOpt.get();
//                sendPaymentNotification(c.getEmail(), c.getName(), invoice.getId(),
//                    (finalStatus.equalsIgnoreCase("paid") || finalStatus.equalsIgnoreCase("paidByAutopay"))
//                    ? "SUCCESS" : "FAILED", payment.getAmount());
//
//                // Update payment history for each policy
//                for (String pid : invoice.getPolicyIds()) {
//                    Customer.PaymentHistory hist = c.getPaymentHistory().stream()
//                            .filter(h -> h.getPolicyId().equals(pid))
//                            .findFirst()
//                            .orElseGet(() -> {
//                                Customer.PaymentHistory newHist = new Customer.PaymentHistory();
//                                newHist.setPolicyId(pid);
//                                c.getPaymentHistory().add(newHist);
//                                return newHist;
//                            });
//                    hist.setStatus(finalStatus);
//                    hist.setLastPaidDate(new Date());
//                    if (finalStatus.equalsIgnoreCase("paid") || finalStatus.equalsIgnoreCase("paidByAutopay")) {
//                        Calendar cal = Calendar.getInstance();
//                        cal.setTime(new Date());
//                        cal.add(Calendar.MONTH, invoice.getMonths());
//                        hist.setValidUpto(cal.getTime());
//                    }
//                }
//                customerRepository.save(c);
//            } else {
//                log.warn("Customer not found for email notification, customerId {}", invoice.getCustomerId());
//            }
//        } catch (Exception e) {
//            log.error("Failed to process payment:", e);
//            throw new RuntimeException("Payment processing failed: " + e.getMessage(), e);
//        }
//    }
//
//    @Override
//    public List<Payment> getPaymentHistory(String customerId) {
//        log.info("Fetching payment history for customerId={}", customerId);
//        return paymentRepository.findByCustomerId(customerId, Sort.by(Sort.Direction.DESC, "paidAt"));
//    }
//
//    @Override
//    public Optional<Invoice> getInvoiceById(String invoiceId) {
//        return invoiceRepository.findById(invoiceId);
//    }
//
//    @Override
//    public List<String> getPolicyNamesByIds(List<String> policyIds) {
//        List<Policy> policies = policyRepository.findAllByIdIn(policyIds);
//        Map<String, String> idToName = policies.stream()
//                .collect(Collectors.toMap(Policy::getId, Policy::getName));
//        return policyIds.stream()
//                .map(id -> idToName.getOrDefault(id, "Unknown Policy"))
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    public String enableAutoPay(String customerId, String invoiceId, int months, double amount) {
//        try {
//            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//            JSONObject req = new JSONObject();
//            req.put("plan_id", planId);
//            req.put("total_count", months);
//            req.put("quantity", 1);
//            req.put("customer_notify", 1);
//            req.put("notes", new JSONObject()
//                    .put("customerId", customerId)
//                    .put("invoiceId", invoiceId));
//
//            Subscription sub = razorpay.subscriptions.create(req);
//
//            customerRepository.findById(customerId).ifPresent(cust -> {
//                cust.setAutoPayEnabled(true);
//                customerRepository.save(cust);
//            });
//
//            invoiceRepository.findById(invoiceId).ifPresent(inv -> {
//                inv.setRazorpaySubscriptionId(sub.get("id"));
//                invoiceRepository.save(inv);
//            });
//
//            return sub.get("id");
//        } catch (RazorpayException e) {
//            log.error("Error enabling autopay", e);
//            throw new RuntimeException("Failed to enable autopay: " + e.getMessage());
//        }
//    }
//
//    @Override
//    public String enableAutoPayPolicy(String customerId, String policyId, int months, double amount) {
//        try {
//            Optional<Customer> custOpt = customerRepository.findById(customerId);
//            if (custOpt.isEmpty()) throw new RuntimeException("Customer not found");
//            Customer cust = custOpt.get();
//
//            Optional<Policy> policyOpt = policyRepository.findById(policyId);
//            if (policyOpt.isEmpty()) throw new RuntimeException("Policy not found");
//            Policy policy = policyOpt.get();
//
//            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//
//            String razorpayCustId = cust.getRazorpayCustomerId();
//            if (razorpayCustId == null || razorpayCustId.isBlank()) {
//                JSONObject custReq = new JSONObject();
//                custReq.put("name", cust.getName());
//                custReq.put("email", cust.getEmail());
//                custReq.put("contact", cust.getPhone().startsWith("+") ? cust.getPhone() : "+" + cust.getPhone());
//
//                com.razorpay.Customer newCust = razorpay.customers.create(custReq);
//                razorpayCustId = newCust.get("id");
//                cust.setRazorpayCustomerId(razorpayCustId);
//                customerRepository.save(cust);
//            }
//
//            JSONObject req = new JSONObject();
//            req.put("plan_id", planId);
//            req.put("total_count", months);
//            req.put("quantity", 1);
//            req.put("customer_notify", 1);
//            req.put("customer_id", razorpayCustId);
//            req.put("notes", new JSONObject()
//                    .put("customerId", customerId)
//                    .put("policyId", policyId));
//
//            Subscription sub = razorpay.subscriptions.create(req);
//
//            Optional<Customer.PaymentHistory> histOpt = cust.getPaymentHistory().stream()
//                    .filter(h -> h.getPolicyId().equals(policyId))
//                    .findFirst();
//
//            Customer.PaymentHistory hist = histOpt.orElseGet(() -> {
//                Customer.PaymentHistory newHist = new Customer.PaymentHistory();
//                newHist.setPolicyId(policyId);
//                cust.getPaymentHistory().add(newHist);
//                return newHist;
//            });
//
//            hist.setStatus("paidByAutopay");
//            hist.setRazorpaySubscriptionId(sub.get("id"));
//            cust.setAutoPayEnabled(true);
//            customerRepository.save(cust);
//
//            sendAutopayNotification(cust.getEmail(), policyId, true);
//
//            return sub.get("id");
//        } catch (RazorpayException e) {
//            log.error("Error enabling autopay for policy", e);
//            throw new RuntimeException("Failed to enable autopay policy: " + e.getMessage());
//        }
//    }
//
//    @Override
//    public void disableAutoPay(String customerId, String subscriptionId) {
//        disableAutoPay(customerId, subscriptionId, null);
//    }
//
//    @Override
//    public void disableAutoPay(String customerId, String subscriptionId, String policyId) {
//        try {
//            Optional<Customer> custOpt = customerRepository.findById(customerId);
//            if (custOpt.isEmpty()) throw new RuntimeException("Customer not found");
//            Customer cust = custOpt.get();
//
//            String subId = subscriptionId;
//            if (policyId != null && (subId == null || subId.isBlank())) {
//                subId = cust.getPaymentHistory().stream()
//                        .filter(h -> h.getPolicyId().equals(policyId))
//                        .map(Customer.PaymentHistory::getRazorpaySubscriptionId)
//                        .filter(s -> s != null && !s.isBlank())
//                        .findFirst().orElse("");
//            }
//
//            if (subId != null && !subId.isBlank()) {
//                RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//                Subscription sub = razorpay.subscriptions.fetch(subId);
//                String status = sub.get("status");
//                if ("active".equalsIgnoreCase(status) || "pending".equalsIgnoreCase(status)) {
//                    JSONObject cancelReq = new JSONObject();
//                    cancelReq.put("cancel_at_cycle_end", 0);
//                    razorpay.subscriptions.cancel(subId, cancelReq);
//                    log.info("Subscription cancelled: {}", subId);
//                } else {
//                    log.info("Subscription already inactive: {}", subId);
//                }
//            }
//
//            cust.setAutoPayEnabled(false);
//
//            if (policyId != null) {
//                cust.getPaymentHistory().stream()
//                        .filter(h -> h.getPolicyId().equals(policyId))
//                        .findFirst()
//                        .ifPresent(hist -> {
//                            hist.setStatus("inactive");
//                            hist.setRazorpaySubscriptionId("");
//                        });
//
//                sendAutopayNotification(cust.getEmail(), policyId, false);
//            }
//
//            customerRepository.save(cust);
//        } catch (RazorpayException e) {
//            log.error("Error disabling autopay", e);
//            throw new RuntimeException("Failed to disable autopay: " + e.getMessage());
//        }
//    }
//
//    @Override
//    public List<Policy> getOwnedPolicies(String customerId) {
//        Optional<Customer> custOpt = customerRepository.findById(customerId);
//        if (custOpt.isEmpty()) throw new RuntimeException("Customer not found");
//        List<String> policyIds = custOpt.get().getPolicyIds();
//        return policyRepository.findAllByIdIn(policyIds);
//    }
//
//    @Override
//    public Optional<Customer> getCustomerById(String customerId) {
//        return customerRepository.findById(customerId);
//    }
//
//    private void sendPaymentNotification(String email, String name, String invoiceId, String status, double amount) {
//        if (email == null || email.isBlank()) {
//            log.warn("No email for notification");
//            return;
//        }
//        Map<String, Object> payload = new HashMap<>();
//        payload.put("toEmail", email);
//        payload.put("customerName", name);
//        payload.put("invoiceId", invoiceId);
//        payload.put("status", status.toUpperCase());
//        payload.put("amount", amount);
//
//        try {
//            restTemplate.postForEntity(notificationBaseUrl + "/payment-status", payload, String.class);
//            log.info("Sent payment notification '{}' to {}", status, email);
//        } catch (Exception ex) {
//            log.error("Failed to send payment notification", ex);
//        }
//    }
//
//    private void sendAutopayNotification(String email, String policyId, boolean enabled) {
//        if (email == null || email.isBlank()) {
//            log.warn("No email for autopay notification");
//            return;
//        }
//
//        Map<String, Object> payload = new HashMap<>();
//        payload.put("toEmail", email);
//        payload.put("policyId", policyId);
//        payload.put("enabled", enabled);
//
//        try {
//            restTemplate.postForEntity(notificationBaseUrl + "/autopay-status", payload, String.class);
//            log.info("Sent autopay '{}' notification to {}", enabled ? "enable" : "disable", email);
//        } catch (Exception ex) {
//            log.error("Failed to send autopay notification", ex);
//        }
//    }
//}
//

//notification for succss or failure of payments 
//package training.iqgateway.service.impl;
//
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.data.domain.Sort;
//import org.springframework.http.HttpEntity;
//import org.springframework.http.HttpHeaders;
//import org.springframework.http.HttpMethod;
//import org.springframework.http.ResponseEntity;
//import org.springframework.stereotype.Service;
//import org.springframework.web.client.RestTemplate;
//
//import training.iqgateway.entity.*;
//import training.iqgateway.repository.*;
//import training.iqgateway.service.CustomerService;
//
//import com.razorpay.RazorpayClient;
//import com.razorpay.RazorpayException;
//import com.razorpay.Subscription;
//
//import org.json.JSONArray;
//import org.json.JSONObject;
//
//import java.nio.charset.StandardCharsets;
//import java.util.*;
//import java.util.stream.Collectors;
//
//@Service
//public class CustomerServiceImpl implements CustomerService {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerServiceImpl.class);
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
//    private String notificationBaseUrl;
//
//    @Override
//    public List<Invoice> getUnpaidInvoices(String customerId) {
//        log.info("Fetching unpaid invoices for customerId: {}", customerId);
//        return invoiceRepository.findByCustomerIdAndStatus(customerId, "unpaid");
//    }
//
//    @Override
//    public void processPayment(String orderId, String paymentId, String status, String subscriptionId) {
//        // Delegate to full method with empty customerId, empty policy lists and zero amount
//        processPayment(orderId, paymentId, status, subscriptionId, null, List.of(), List.of(), 0);
//    }
//
//    /**
//     * Full payment processing method that accepts all relevant data including:
//     * - orderId and paymentId (from webhook/payment)
//     * - status and subscriptionId
//     * - customerId
//     * - policyIds and policyNames as lists (to avoid nested arrays issue)
//     * - payment amount (from webhook or policy premium)
//     */
////    public void processPayment(
////            String orderId,
////            String paymentId,
////            String status,
////            String subscriptionId,
////            String customerId,
////            List<String> policyIds,
////            List<String> policyNames,
////            double amount) {
////
////        log.info("Processing payment with orderId: {}, paymentId: {}, status: {}, subscriptionId: {}, customerId: {}, policyIds: {}, policyNames: {}, amount: {}",
////                orderId, paymentId, status, subscriptionId, customerId, policyIds, policyNames, amount);
////
////        if (subscriptionId != null && !subscriptionId.isEmpty()) {
////            // Subscription autopay payment path
////
////            if (customerId == null || customerId.isBlank()) {
////                throw new IllegalArgumentException("customerId is required for subscription payment");
////            }
////
////            Optional<Customer> optCustomer = customerRepository.findById(customerId);
////            if (optCustomer.isEmpty()) {
////                throw new RuntimeException("Customer not found");
////            }
////
////            // If amount is zero, try to fetch from policy first policyId's monthly premium
////            if (amount <= 0 && policyIds != null && !policyIds.isEmpty()) {
////                amount = policyRepository.findById(policyIds.get(0))
////                        .map(Policy::getMonthlyPremium)
////                        .orElse(0.0);
////            }
////
////            Payment payment = new Payment();
////            payment.setCustomerId(customerId);
////            payment.setRazorpayPaymentId(paymentId != null ? paymentId : "");
////            payment.setRazorpaySubscriptionId(subscriptionId);
////            payment.setStatus(status != null ? status : "paidByAutopay");
////            payment.setAutoPay(true);
////            payment.setPolicyIds(policyIds != null ? policyIds : List.of());
////            payment.setPolicyNames(policyNames != null ? policyNames : List.of());
////            payment.setPaidAt(new Date());
////            payment.setAmount(amount);
////
////            paymentRepository.save(payment);
////            
////         // After paymentRepository.save(payment);
////
////            Optional<Customer> optCustomer = customerRepository.findById(customerId);
////            if (optCustomer.isPresent()) {
////                Customer customer = optCustomer.get();
////                String email = customer.getEmail();
////                String customerName = customer.getName();
////                String paymentStatusForNotification = "paidByAutopay".equalsIgnoreCase(payment.getStatus())
////                        ? "SUCCESS" : "FAILED";
////                double paymentAmount = payment.getAmount();
////
////                sendPaymentStatusNotification(email, customerName, null, paymentStatusForNotification, paymentAmount);
////            } else {
////                log.warn("Customer not found when sending autopay payment notification for customerId {}", customerId);
////            }
////
////            
////            
////
////            // TODO: Optionally update customer payment history per policy here if your app requires
////
////            return; // done autopay processing
////        }
////
////        // One-time payment (invoice-based) path
////        if (orderId == null || orderId.trim().isEmpty()) {
////            throw new IllegalArgumentException("orderId is required for one-time payment");
////        }
////
////        Optional<Invoice> optInvoice = invoiceRepository.findByRazorpayOrderId(orderId.trim());
////        if (optInvoice.isEmpty()) {
////            throw new RuntimeException("Invoice not found for orderId: " + orderId);
////        }
////        Invoice invoice = optInvoice.get();
////
////        String finalStatus = status;
////        if (subscriptionId != null && !subscriptionId.isEmpty() && "paid".equalsIgnoreCase(status)) {
////            finalStatus = "paidByAutopay";
////        }
////
////        invoice.setStatus(finalStatus);
////        invoiceRepository.save(invoice);
////
////        Payment payment = new Payment();
////        payment.setInvoiceId(invoice.getId());
////        payment.setCustomerId(invoice.getCustomerId());
////        payment.setAmount(amount > 0 ? amount : invoice.getAmount());
////        payment.setStatus(finalStatus);
////        payment.setRazorpayPaymentId(paymentId != null ? paymentId : "");
////        payment.setRazorpaySubscriptionId(subscriptionId != null ? subscriptionId : "");
////        payment.setAutoPay(subscriptionId != null && !subscriptionId.isEmpty());
////        payment.setPaidAt(new Date());
////
////        if (!invoice.getTaxDetailsList().isEmpty()) {
////            Invoice.TaxDetails taxDetails = invoice.getTaxDetailsList().get(0);
////            payment.setTaxDetails(new Payment.TaxDetails(
////                    "GST",
////                    taxDetails.getGstRate(),
////                    taxDetails.getTaxAmount(),
////                    taxDetails.getTotalAmount()
////            ));
////        }
////
////        List<String> pIds = (policyIds != null && !policyIds.isEmpty()) ? policyIds : invoice.getPolicyIds();
////        List<String> pNames;
////        if (policyNames != null && !policyNames.isEmpty()) {
////            pNames = policyNames;
////        } else {
////            pNames = policyRepository.findAllById(pIds).stream()
////                    .map(Policy::getName)
////                    .collect(Collectors.toList());
////        }
////
////        payment.setPolicyIds(pIds);
////        payment.setPolicyNames(pNames);
////
////        paymentRepository.save(payment);
////
////        // TODO: Optional — update customer's payment history per policy as per app requirements.
////    }
//   
//    public void processPayment(
//            String orderId,
//            String paymentId,
//            String status,
//            String subscriptionId,
//            String customerId,
//            List<String> policyIds,
//            List<String> policyNames,
//            double amount) {
//
//        log.info("Processing payment with orderId: {}, paymentId: {}, status: {}, subscriptionId: {}, customerId: {}, policyIds: {}, policyNames: {}, amount: {}",
//                orderId, paymentId, status, subscriptionId, customerId, policyIds, policyNames, amount);
//
//        if (subscriptionId != null && !subscriptionId.isEmpty()) {
//            // Subscription autopay payment path
//
//            if (customerId == null || customerId.isBlank()) {
//                throw new IllegalArgumentException("customerId is required for subscription payment");
//            }
//
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isEmpty()) {
//                throw new RuntimeException("Customer not found");
//            }
//
//            // If amount is zero, try to fetch from policy first policyId's monthly premium
//            if (amount <= 0 && policyIds != null && !policyIds.isEmpty()) {
//                amount = policyRepository.findById(policyIds.get(0))
//                        .map(Policy::getMonthlyPremium)
//                        .orElse(0.0);
//            }
//
//            Payment payment = new Payment();
//            payment.setCustomerId(customerId);
//            payment.setRazorpayPaymentId(paymentId != null ? paymentId : "");
//            payment.setRazorpaySubscriptionId(subscriptionId);
//            payment.setStatus(status != null ? status : "paidByAutopay");
//            payment.setAutoPay(true);
//            payment.setPolicyIds(policyIds != null ? policyIds : List.of());
//            payment.setPolicyNames(policyNames != null ? policyNames : List.of());
//            payment.setPaidAt(new Date());
//            payment.setAmount(amount);
//
//            paymentRepository.save(payment);
//
//            // Use renamed variable to avoid duplication
//            Optional<Customer> autopayCustomerOpt = customerRepository.findById(customerId);
//            if (autopayCustomerOpt.isPresent()) {
//                Customer customer = autopayCustomerOpt.get();
//                String email = customer.getEmail();
//                String customerName = customer.getName();
//                String paymentStatusForNotification = "paidByAutopay".equalsIgnoreCase(payment.getStatus())
//                        ? "SUCCESS" : "FAILED";
//                double paymentAmount = payment.getAmount();
//
//                sendPaymentStatusNotification(email, customerName, null, paymentStatusForNotification, paymentAmount);
//            } else {
//                log.warn("Customer not found when sending autopay payment notification for customerId {}", customerId);
//            }
//
//            // TODO: Optionally update customer payment history per policy here if your app requires
//
//            return; // done autopay processing
//        }
//
//        // One-time payment (invoice-based) path
//        if (orderId == null || orderId.trim().isEmpty()) {
//            throw new IllegalArgumentException("orderId is required for one-time payment");
//        }
//
//        Optional<Invoice> optInvoice = invoiceRepository.findByRazorpayOrderId(orderId.trim());
//        if (optInvoice.isEmpty()) {
//            throw new RuntimeException("Invoice not found for orderId: " + orderId);
//        }
//        Invoice invoice = optInvoice.get();
//
//        String finalStatus = status;
//        if (subscriptionId != null && !subscriptionId.isEmpty() && "paid".equalsIgnoreCase(status)) {
//            finalStatus = "paidByAutopay";
//        }
//
//        invoice.setStatus(finalStatus);
//        invoiceRepository.save(invoice);
//
//        Payment payment = new Payment();
//        payment.setInvoiceId(invoice.getId());
//        payment.setCustomerId(invoice.getCustomerId());
//        payment.setAmount(amount > 0 ? amount : invoice.getAmount());
//        payment.setStatus(finalStatus);
//        payment.setRazorpayPaymentId(paymentId != null ? paymentId : "");
//        payment.setRazorpaySubscriptionId(subscriptionId != null ? subscriptionId : "");
//        payment.setAutoPay(subscriptionId != null && !subscriptionId.isEmpty());
//        payment.setPaidAt(new Date());
//
//        if (!invoice.getTaxDetailsList().isEmpty()) {
//            Invoice.TaxDetails taxDetails = invoice.getTaxDetailsList().get(0);
//            payment.setTaxDetails(new Payment.TaxDetails(
//                    "GST",
//                    taxDetails.getGstRate(),
//                    taxDetails.getTaxAmount(),
//                    taxDetails.getTotalAmount()
//            ));
//        }
//
//        List<String> pIds = (policyIds != null && !policyIds.isEmpty()) ? policyIds : invoice.getPolicyIds();
//        List<String> pNames;
//        if (policyNames != null && !policyNames.isEmpty()) {
//            pNames = policyNames;
//        } else {
//            pNames = policyRepository.findAllById(pIds).stream()
//                    .map(Policy::getName)
//                    .collect(Collectors.toList());
//        }
//
//        payment.setPolicyIds(pIds);
//        payment.setPolicyNames(pNames);
//
//        paymentRepository.save(payment);
//
//        // Use a different variable name to avoid conflict
//        Optional<Customer> invoiceCustomerOpt = customerRepository.findById(invoice.getCustomerId());
//        if (invoiceCustomerOpt.isPresent()) {
//            Customer customer = invoiceCustomerOpt.get();
//            String email = customer.getEmail();
//            String customerName = customer.getName();
//            String paymentStatusForNotification = "paid".equalsIgnoreCase(finalStatus) || "paidByAutopay".equalsIgnoreCase(finalStatus)
//                    ? "SUCCESS" : "FAILED";
//            double paymentAmount = payment.getAmount();
//
//            sendPaymentStatusNotification(email, customerName, invoice.getId(), paymentStatusForNotification, paymentAmount);
//        } else {
//            log.warn("Customer not found when sending payment notification for invoice {}", invoice.getId());
//        }}
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
//        return policies.stream().map(Policy::getName).collect(Collectors.toList());
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
//            subRequest.put("notes", new JSONObject()
//                    .put("customerId", customerId)
//                    .put("invoiceId", invoiceId));
//
//            Subscription subscription = razorpay.subscriptions.create(subRequest);
//            String subscriptionId = subscription.get("id");
//
//            customerRepository.findById(customerId).ifPresent(customer -> {
//                customer.setAutoPayEnabled(true);
//                customerRepository.save(customer);
//            });
//
//            invoiceRepository.findById(invoiceId).ifPresent(invoice -> {
//                invoice.setRazorpaySubscriptionId(subscriptionId);
//                invoiceRepository.save(invoice);
//            });
//
//            log.info("Autopay enabled with subscriptionId: {}", subscriptionId);
//            return subscriptionId;
//
//        } catch (Exception e) {
//            log.error("Error enabling autopay", e);
//            throw new RuntimeException("Failed to enable autopay");
//        }
//    }
//
//    @Override
//    public String enableAutoPayPolicy(String customerId, String policyId, int months, double amount) {
//        log.info("Enabling autopay for customerId: {}, policyId: {}, months: {}, amount: {}", customerId, policyId, months, amount);
//
//        try {
//            Optional<Policy> optPolicy = policyRepository.findById(policyId);
//            if (optPolicy.isEmpty()) throw new RuntimeException("Policy not found");
//            Policy policy = optPolicy.get();
//
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isEmpty()) throw new RuntimeException("Customer not found");
//            Customer customer = optCustomer.get();
//
//            Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                    .filter(h -> h.getPolicyId().equals(policyId))
//                    .findFirst();
//
//            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//
//            String razorpayCustomerId = customer.getRazorpayCustomerId();
//            if (razorpayCustomerId == null) {
//                JSONObject customerRequest = new JSONObject();
//                customerRequest.put("name", customer.getName() != null ? customer.getName() : "Customer");
//                customerRequest.put("email", customer.getEmail());
//                customerRequest.put("contact", customer.getPhone().startsWith("+") ? customer.getPhone() : "+" + customer.getPhone());
//
//                try {
//                    com.razorpay.Customer createdCustomer = razorpay.customers.create(customerRequest);
//                    razorpayCustomerId = createdCustomer.get("id");
//                    log.info("Created new Razorpay Customer ID: {}", razorpayCustomerId);
//                } catch (RazorpayException e) {
//                    if (e.getMessage().contains("Customer already exists")) {
//                        razorpayCustomerId = findExistingRazorpayCustomerId(customer.getEmail(), customer.getPhone());
//                        if (razorpayCustomerId == null) {
//                            throw new RuntimeException("Customer exists in Razorpay but could not retrieve ID: " + e.getMessage());
//                        }
//                        log.info("Found existing Razorpay Customer ID via manual search: {}", razorpayCustomerId);
//                    } else {
//                        throw e;
//                    }
//                }
//                customer.setRazorpayCustomerId(razorpayCustomerId);
//                customerRepository.save(customer);
//            } else {
//                log.info("Using existing Razorpay Customer ID: {}", razorpayCustomerId);
//            }
//
//            JSONObject subRequest = new JSONObject();
//            subRequest.put("plan_id", planId);
//            subRequest.put("total_count", months);
//            subRequest.put("quantity", 1);
//            subRequest.put("customer_notify", 1);
//            subRequest.put("customer_id", razorpayCustomerId);
//            subRequest.put("notes", new JSONObject().put("customerId", customerId).put("policyId", policyId));
//
//            Subscription subscription = razorpay.subscriptions.create(subRequest);
//            String subscriptionId = subscription.get("id");
//
//            customer.setAutoPayEnabled(true);
//
//            Customer.PaymentHistory history = optHistory.orElseGet(() -> {
//                Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
//                newHistory.setPolicyId(policyId);
//                customer.getPaymentHistory().add(newHistory);
//                log.info("Created new payment history entry for policy {}", policyId);
//                return newHistory;
//            });
//            history.setStatus("paidByAutopayActive");
//            history.setRazorpaySubscriptionId(subscriptionId);
//            customerRepository.save(customer);
//
//            sendAutoPayNotification(customer.getEmail(), policyId, true);
//
//            log.info("Autopay enabled with subscriptionId: {}", subscriptionId);
//            return subscriptionId;
//
//        } catch (Exception e) {
//            log.error("Error enabling autopay for policy", e);
//            throw new RuntimeException("Failed to enable autopay: " + e.getMessage());
//        }
//    }
//
//    private String findExistingRazorpayCustomerId(String email, String contact) {
//        try {
//            String auth = keyId + ":" + keySecret;
//            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
//
//            HttpHeaders headers = new HttpHeaders();
//            headers.set("Authorization", "Basic " + encodedAuth);
//            headers.set("Content-Type", "application/json");
//
//            String razorpayCustomerId = null;
//            int skip = 0;
//            int count = 100;
//            boolean hasMore = true;
//
//            while (hasMore && razorpayCustomerId == null) {
//                String url = String.format("https://api.razorpay.com/v1/customers?count=%d&skip=%d", count, skip);
//                HttpEntity<String> entity = new HttpEntity<>(headers);
//                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
//
//                if (response.getStatusCode().is2xxSuccessful()) {
//                    JSONObject jsonResponse = new JSONObject(response.getBody());
//                    JSONArray items = jsonResponse.getJSONArray("items");
//                    hasMore = items.length() == count;
//                    skip += count;
//
//                    for (int i = 0; i < items.length(); i++) {
//                        JSONObject cust = items.getJSONObject(i);
//                        if (cust.optString("email").equals(email) || cust.optString("contact").equals(contact)) {
//                            razorpayCustomerId = cust.getString("id");
//                            break;
//                        }
//                    }
//                } else {
//                    throw new RuntimeException("Failed to fetch customers from Razorpay: " + response.getStatusCode());
//                }
//            }
//
//            return razorpayCustomerId;
//        } catch (Exception e) {
//            log.error("Error fetching Razorpay customers manually: {}", e.getMessage(), e);
//            return null;
//        }
//    }
//
//    @Override
//    public void disableAutoPay(String customerId, String subscriptionId) {
//        disableAutoPay(customerId, subscriptionId, null);
//    }
//
//    @Override
//    public void disableAutoPay(String customerId, String subscriptionId, String policyId) {
//        log.info("Disabling autopay for customerId: {}, subscriptionId: {}, policyId: {}", customerId, subscriptionId, policyId);
//        try {
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isEmpty()) {
//                log.warn("Customer not found for id: {}", customerId);
//                throw new RuntimeException("Customer not found");
//            }
//            Customer customer = optCustomer.get();
//
//            String effectiveSubscriptionId = subscriptionId;
//            if (policyId != null && (effectiveSubscriptionId == null || effectiveSubscriptionId.isEmpty())) {
//                Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                        .filter(h -> h.getPolicyId().equals(policyId))
//                        .findFirst();
//                if (optHistory.isPresent()) {
//                    effectiveSubscriptionId = optHistory.get().getRazorpaySubscriptionId();
//                    if (effectiveSubscriptionId == null || effectiveSubscriptionId.isEmpty()) {
//                        log.warn("No subscriptionId found for policyId: {}. Updating local status only.", policyId);
//                    }
//                } else {
//                    log.warn("No payment history for policyId: {}. Cannot cancel subscription.", policyId);
//                }
//            }
//
//            if (effectiveSubscriptionId != null && !effectiveSubscriptionId.isEmpty()) {
//                RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//                Subscription subscription = razorpay.subscriptions.fetch(effectiveSubscriptionId);
//                String subStatus = subscription.get("status");
//
//                if ("active".equals(subStatus) || "pending".equals(subStatus)) {
//                    JSONObject cancelOptions = new JSONObject();
//                    cancelOptions.put("cancel_at_cycle_end", 0); // immediate cancel
//                    razorpay.subscriptions.cancel(effectiveSubscriptionId, cancelOptions);
//                    log.info("Successfully canceled subscription: {}", effectiveSubscriptionId);
//                } else if ("cancelled".equals(subStatus)) {
//                    log.info("Subscription {} is already cancelled. Skipping cancellation.", effectiveSubscriptionId);
//                } else {
//                    log.warn("Subscription {} in status '{}'; cannot cancel.", effectiveSubscriptionId, subStatus);
//                }
//            } else {
//                log.info("No valid subscriptionId provided or found. Skipping Razorpay cancellation.");
//            }
//
//            customer.setAutoPayEnabled(false);
//
//            if (policyId != null) {
//                Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                        .filter(h -> h.getPolicyId().equals(policyId))
//                        .findFirst();
//                if (optHistory.isPresent()) {
//                    Customer.PaymentHistory history = optHistory.get();
//                    history.setStatus("paidByAutoPayInactive");
//                    history.setRazorpaySubscriptionId("");
//                } else {
//                    log.warn("No history for policy {}, cannot set inactive status", policyId);
//                }
//                sendAutoPayNotification(customer.getEmail(), policyId, false);
//            }
//
//            customerRepository.save(customer);
//            log.info("Autopay disabled successfully for customerId: {}", customerId);
//        } catch (RazorpayException e) {
//            log.error("Razorpay error during disable: {}", e.getMessage(), e);
//            throw new RuntimeException("Failed to disable autopay: " + e.getMessage());
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
//    private void sendPaymentStatusNotification(String toEmail, String customerName, String invoiceId, String status, Double amount) {
//        if (toEmail == null || toEmail.isBlank()) {
//            log.warn("No email provided, skipping payment status notification");
//            return;
//        }
//        Map<String, Object> payload = new HashMap<>();
//        payload.put("toEmail", toEmail);
//        payload.put("customerName", customerName);
//        payload.put("invoiceId", invoiceId);
//        payload.put("status", status.toUpperCase()); // Use "SUCCESS" or "FAILED"
//        payload.put("amount", amount);
//
//        try {
//            restTemplate.postForEntity(notificationBaseUrl + "/payment-status", payload, String.class);
//            log.info("Sent payment {} notification email to {}", status, toEmail);
//        } catch (Exception ex) {
//            log.error("Failed to send payment status notification to {}: {}", toEmail, ex.getMessage());
//        }
//    }
//
//}

//display policy names in payment history
//package training.iqgateway.service.impl;
//
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.data.domain.Sort;
//import org.springframework.http.HttpEntity;
//import org.springframework.http.HttpHeaders;
//import org.springframework.http.HttpMethod;
//import org.springframework.http.ResponseEntity;
//import org.springframework.stereotype.Service;
//import org.springframework.web.client.HttpClientErrorException;
//import org.springframework.web.client.RestTemplate;
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
//import org.json.JSONArray;
//import org.json.JSONObject;
//
//import java.nio.charset.StandardCharsets;
//import java.util.Base64;
//import java.util.Calendar;
//import java.util.Date;
//import java.util.HashMap;
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//import java.util.stream.Collectors;
//
//@Service
//public class CustomerServiceImpl implements CustomerService {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerServiceImpl.class);
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
////    @Override
////    public void processPayment(String razorpayOrderId, String razorpayPaymentId, String status, String subscriptionId) {
////        log.info("Starting processPayment - OrderID: {}, PaymentID: {}, Status: {}, SubscriptionID: {}", razorpayOrderId, razorpayPaymentId, status, subscriptionId);
////
////        if (subscriptionId != null && !subscriptionId.isEmpty()) {
////            // AutoPay subscription payment handling
////            try {
////                RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
////                Subscription subscription = razorpay.subscriptions.fetch(subscriptionId);
////                JSONObject notes = subscription.get("notes");
////                String customerId = notes.optString("customerId");
////                String policyId = notes.optString("policyId");
////
////                if (customerId.isEmpty() || policyId.isEmpty()) {
////                    throw new RuntimeException("Subscription notes missing required customerId or policyId");
////                }
////
//                Optional<Policy> optPolicy = policyRepository.findById(policyId);
////                if (optPolicy.isEmpty()) throw new RuntimeException("Policy not found");
////                Policy policy = optPolicy.get();
////
////                double monthlyAmount = policy.getMonthlyPremium();
////
////                // Create Payment record for autopay
////                Payment payment = new Payment();
////                payment.setCustomerId(customerId);
////                payment.setInvoiceId(null); // autopay payments have no invoice
////                payment.setInsurerId(policy.getInsurerId());
////                payment.setAmount(monthlyAmount);
////                payment.setStatus("paidByAutopay");
////                payment.setRazorpayPaymentId(razorpayPaymentId);
////                payment.setRazorpaySubscriptionId(subscriptionId);
////                payment.setMethod("autopaid");
////                payment.setAutoPay(true);
////                payment.setTaxDetails(new Payment.TaxDetails("GST", 0.18, monthlyAmount * 0.18, monthlyAmount * 1.18));
////                payment.setPaidAt(new Date());
////
////                paymentRepository.save(payment);
////                log.info("Saved autopay payment for policyId {}", policyId);
////
////                // Update customer's payment history for this policy
////                Optional<Customer> optCustomer = customerRepository.findById(customerId);
////                if (optCustomer.isPresent()) {
////                    Customer customer = optCustomer.get();
////                    Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
////                        .filter(h -> h.getPolicyId().equals(policyId))
////                        .findFirst();
////
////                    Customer.PaymentHistory history = optHistory.orElseGet(() -> {
////                        Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
////                        newHistory.setPolicyId(policyId);
////                        customer.getPaymentHistory().add(newHistory);
////                        log.info("Created new payment history entry for policy {}", policyId);
////                        return newHistory;
////                    });
////
////                    history.setStatus("paidByAutopayActive"); // Set active status on payment
////                    Date now = new Date();
////                    history.setLastPaidDate(now);
////
////                    Calendar cal = Calendar.getInstance();
////                    cal.setTime(history.getValidUpto() != null ? history.getValidUpto() : now);
////                    cal.add(Calendar.MONTH, 1); // extend by 1 month for autopay payment
////                    history.setValidUpto(cal.getTime());
////
////                    history.setRazorpaySubscriptionId(subscriptionId); // Save subscriptionId here if not already
////
////                    customer.setAutoPayEnabled(true);
////                    customerRepository.save(customer);
////                    log.info("Updated customer payment history and autopay status");
////                } else {
////                    log.error("Customer not found for auto pay update: {}", customerId);
////                }
////            } catch (RazorpayException e) {
////                log.error("Error during autopay subscription fetch", e);
////                throw new RuntimeException("Failed to process autopay payment: " + e.getMessage());
////            }
////        } else {
////            // One-time payment logic with invoice (unchanged from your code)
////            String trimmedOrderId = razorpayOrderId.trim();
////            Optional<Invoice> optInvoice = invoiceRepository.findByRazorpayOrderId(trimmedOrderId);
////
////            if (optInvoice.isEmpty()) {
////                log.error("Invoice not found for orderId: {}", trimmedOrderId);
////                throw new RuntimeException("Invoice not found for order id: " + trimmedOrderId);
////            }
////
////            Invoice invoice = optInvoice.get();
////            String finalStatus = status;
////            if (subscriptionId != null && !subscriptionId.isEmpty() && "paid".equals(status)) {
////                finalStatus = "paidByAutopay";
////            }
////
////            invoice.setStatus(finalStatus);
////            invoiceRepository.save(invoice);
////            log.info("Updated invoice {} status to {}", invoice.getId(), finalStatus);
////
////            Payment payment = new Payment();
////            payment.setInvoiceId(invoice.getId());
////            payment.setCustomerId(invoice.getCustomerId());
////            payment.setInsurerId(invoice.getInsurerId());
////            payment.setAmount(invoice.getAmount());
////            payment.setStatus(finalStatus);
////            payment.setRazorpayPaymentId(razorpayPaymentId);
////            payment.setRazorpaySubscriptionId(subscriptionId != null ? subscriptionId : "");
////            payment.setMethod("razorpay");
////            payment.setAutoPay(subscriptionId != null && !subscriptionId.isEmpty());
////
////            if (!invoice.getTaxDetailsList().isEmpty()) {
////                Invoice.TaxDetails taxDetails = invoice.getTaxDetailsList().get(0);
////                Payment.TaxDetails paymentTax = new Payment.TaxDetails();
////                paymentTax.setTaxType("GST");
////                paymentTax.setTaxRate(taxDetails.getGstRate());
////                paymentTax.setTaxAmount(taxDetails.getTaxAmount());
////                paymentTax.setTotalAmount(taxDetails.getTotalAmount());
////                payment.setTaxDetails(paymentTax);
////            }
////
////            payment.setPaidAt(new Date());
////            paymentRepository.save(payment);
////            log.info("Saved payment for invoice {}", invoice.getId());
////
////            // Update customer's payment history by policy
////            Optional<Customer> optCustomer = customerRepository.findById(invoice.getCustomerId());
////            if (optCustomer.isEmpty()) {
////                log.error("Customer not found for id: {}", invoice.getCustomerId());
////                throw new RuntimeException("Customer not found");
////            }
////            Customer customer = optCustomer.get();
////
////            for (String policyId : invoice.getPolicyIds()) {
////                Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
////                    .filter(h -> h.getPolicyId().equals(policyId))
////                    .findFirst();
////
////                Customer.PaymentHistory history = optHistory.orElseGet(() -> {
////                    Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
////                    newHistory.setPolicyId(policyId);
////                    customer.getPaymentHistory().add(newHistory);
////                    log.info("Created new payment history entry for policy {}", policyId);
////                    return newHistory;
////                });
////
////                history.setStatus(finalStatus);
////                Date now = new Date();
////                history.setLastPaidDate(now);
////
////                if ("paid".equals(status) || "paidByAutopay".equals(finalStatus)) {
////                    Calendar cal = Calendar.getInstance();
////                    cal.setTime(now);
////                    cal.add(Calendar.MONTH, invoice.getMonths());
////                    history.setValidUpto(cal.getTime());
////                    log.info("Extended validUpto for policy {} to {}", policyId, history.getValidUpto());
////                }
////            }
////
////            customerRepository.save(customer);
////            log.info("Updated customer {} payment history", customer.getId());
////        }
////    }
//    @Override
//    public void processPayment(String razorpayOrderId, String razorpayPaymentId, String status, String subscriptionId) {
//        log.info("Starting processPayment - OrderID: {}, PaymentID: {}, Status: {}, SubscriptionID: {}",
//                razorpayOrderId, razorpayPaymentId, status, subscriptionId);
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
//                // --- Save related policy IDs and names for display ---
//                payment.setPolicyIds(List.of(policyId));
//                payment.setPolicyNames(List.of(policy.getName()));
//
//                log.info("Saving autopay payment with policyId: {}, policyName: {}", payment.getPolicyIds(), payment.getPolicyNames());
//
//                log.info("Saved autopay payment for policyId {}", policyId);
//
//                // Update customer's payment history for this policy
//                Optional<Customer> optCustomer = customerRepository.findById(customerId);
//                if (optCustomer.isPresent()) {
//                    Customer customer = optCustomer.get();
//                    Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                            .filter(h -> h.getPolicyId().equals(policyId))
//                            .findFirst();
//
//                    Customer.PaymentHistory history = optHistory.orElseGet(() -> {
//                        Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
//                        newHistory.setPolicyId(policyId);
//                        customer.getPaymentHistory().add(newHistory);
//                        log.info("Created new payment history entry for policy {}", policyId);
//                        return newHistory;
//                    });
//
//                    history.setStatus("paidByAutopayActive"); // Set active status on payment
//                    Date now = new Date();
//                    history.setLastPaidDate(now);
//
//                    Calendar cal = Calendar.getInstance();
//                    cal.setTime(history.getValidUpto() != null ? history.getValidUpto() : now);
//                    cal.add(Calendar.MONTH, 1); // extend by 1 month for autopay payment
//                    history.setValidUpto(cal.getTime());
//
//                    history.setRazorpaySubscriptionId(subscriptionId); // Save subscriptionId here if not already
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
//            // Save related policies from invoice for display
//            payment.setPolicyIds(invoice.getPolicyIds());
//            List<String> policyNames = policyRepository.findAllById(invoice.getPolicyIds()).stream()
//                    .map(Policy::getName)
//                    .collect(Collectors.toList());
//            payment.setPolicyNames(policyNames);
//
//            payment.setPaidAt(new Date());
//            paymentRepository.save(payment);
//            log.info("Saved payment for invoice {}", invoice.getId());
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
//                        .filter(h -> h.getPolicyId().equals(policyId))
//                        .findFirst();
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
//    @Override
//    public String enableAutoPayPolicy(String customerId, String policyId, int months, double amount) {
//        log.info("Enabling autopay for customerId: {}, policyId: {}, months: {}, amount: {}", customerId, policyId, months, amount);
//
//        try {
//            Optional<Policy> optPolicy = policyRepository.findById(policyId);
//            if (optPolicy.isEmpty()) throw new RuntimeException("Policy not found");
//            Policy policy = optPolicy.get();
//
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isEmpty()) throw new RuntimeException("Customer not found");
//            Customer customer = optCustomer.get();
//
//            Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                 .filter(h -> h.getPolicyId().equals(policyId))
//                 .findFirst();
//
//            int remainingMonths = policy.getDurationMonths();
//            if (optHistory.isPresent()) {
//                Date today = new Date();
//                Date validUpto = optHistory.get().getValidUpto() != null ? optHistory.get().getValidUpto() : new Date(0);
//                Date createdAt = policy.getCreatedAt();
//
//                Calendar calToday = Calendar.getInstance();
//                calToday.setTime(today);
//                Calendar calValid = Calendar.getInstance();
//                calValid.setTime(validUpto);
//                Calendar calCreated = Calendar.getInstance();
//                calCreated.setTime(createdAt);
//
//                int monthsPassed = (calToday.get(Calendar.YEAR) - calCreated.get(Calendar.YEAR)) * 12 +
//                                   (calToday.get(Calendar.MONTH) - calCreated.get(Calendar.MONTH));
//
//                remainingMonths = policy.getDurationMonths() - monthsPassed;
//
//                if (calToday.get(Calendar.YEAR) == calValid.get(Calendar.YEAR) &&
//                    calToday.get(Calendar.MONTH) == calValid.get(Calendar.MONTH)) {
//                    remainingMonths++;
//                }
//            }
//
//            if (months > remainingMonths) throw new RuntimeException("Requested months exceed remaining: " + remainingMonths);
//
//            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//
//            // Create or reuse Razorpay customer for notification
//            String razorpayCustomerId = customer.getRazorpayCustomerId();
//            if (razorpayCustomerId == null) {
//                JSONObject customerRequest = new JSONObject();
//                customerRequest.put("name", customer.getName() != null ? customer.getName() : "Customer");
//                customerRequest.put("email", customer.getEmail());
//                customerRequest.put("contact", customer.getPhone().startsWith("+") ? customer.getPhone() : "+" + customer.getPhone());
//
//                try {
//                    // Try to create via SDK
//                    com.razorpay.Customer razorpayCustomer = razorpay.customers.create(customerRequest);
//                    razorpayCustomerId = razorpayCustomer.get("id");
//                    log.info("Created new Razorpay Customer ID: {}", razorpayCustomerId);
//                } catch (RazorpayException e) {
//                    if (e.getMessage().contains("Customer already exists")) {
//                        // Fallback: Manually list customers via HTTP API and find matching one
//                        razorpayCustomerId = findExistingRazorpayCustomerId(customer.getEmail(), customer.getPhone());
//                        if (razorpayCustomerId == null) {
//                            throw new RuntimeException("Customer exists in Razorpay but could not retrieve ID: " + e.getMessage());
//                        }
//                        log.info("Found existing Razorpay Customer ID via manual search: {}", razorpayCustomerId);
//                    } else {
//                        throw e;  // Rethrow other errors
//                    }
//                }
//                customer.setRazorpayCustomerId(razorpayCustomerId);
//                customerRepository.save(customer);
//            } else {
//                log.info("Using existing Razorpay Customer ID: {}", razorpayCustomerId);
//            }
//
//            JSONObject subRequest = new JSONObject();
//            subRequest.put("plan_id", planId);
//            subRequest.put("total_count", months);
//            subRequest.put("quantity", 1);
//            subRequest.put("customer_notify", 1);
//            subRequest.put("customer_id", razorpayCustomerId);
//            subRequest.put("notes", new JSONObject().put("customerId", customerId).put("policyId", policyId));
//
//            Subscription subscription = razorpay.subscriptions.create(subRequest);
//            String subscriptionId = subscription.get("id");
//
//            customer.setAutoPayEnabled(true);
//
//            // Update payment history with "paidByAutopayActive" status and save subscriptionId
//            Customer.PaymentHistory history = optHistory.orElseGet(() -> {
//                Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
//                newHistory.setPolicyId(policyId);
//                customer.getPaymentHistory().add(newHistory);
//                log.info("Created new payment history entry for policy {}", policyId);
//                return newHistory;
//            });
//            history.setStatus("paidByAutopayActive");
//            history.setRazorpaySubscriptionId(subscriptionId); // Save the ID here
//
//            customerRepository.save(customer);
//
//            // Notify Notification Microservice
//            sendAutoPayNotification(customer.getEmail(), policyId, true);
//
//            log.info("Autopay enabled with subscriptionId: {}", subscriptionId);
//            return subscriptionId;
//
//        } catch (Exception e) {
//            log.error("Error enabling autopay for policy", e);
//            throw new RuntimeException("Failed to enable autopay: " + e.getMessage());
//        }
//    }
//
//    // New helper method for manual listing (alternative to SDK's all())
//    private String findExistingRazorpayCustomerId(String email, String contact) {
//        try {
//            // Set up basic auth header (key:secret base64 encoded)
//            String auth = keyId + ":" + keySecret;
//            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
//
//            HttpHeaders headers = new HttpHeaders();
//            headers.set("Authorization", "Basic " + encodedAuth);
//            headers.set("Content-Type", "application/json");
//
//            // Fetch customers (with pagination; loop until found or end)
//            String razorpayCustomerId = null;
//            int skip = 0;
//            int count = 100;  // Max per page
//            boolean hasMore = true;
//
//            while (hasMore && razorpayCustomerId == null) {
//                String url = String.format("https://api.razorpay.com/v1/customers?count=%d&skip=%d", count, skip);
//                HttpEntity<String> entity = new HttpEntity<>(headers);
//                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
//
//                if (response.getStatusCode().is2xxSuccessful()) {
//                    JSONObject jsonResponse = new JSONObject(response.getBody());
//                    JSONArray items = jsonResponse.getJSONArray("items");
//                    hasMore = items.length() == count;  // If full page, there might be more
//                    skip += count;
//
//                    for (int i = 0; i < items.length(); i++) {
//                        JSONObject cust = items.getJSONObject(i);
//                        if (cust.optString("email").equals(email) || cust.optString("contact").equals(contact)) {
//                            razorpayCustomerId = cust.getString("id");
//                            break;
//                        }
//                    }
//                } else {
//                    throw new RuntimeException("Failed to fetch customers from Razorpay: " + response.getStatusCode());
//                }
//            }
//
//            return razorpayCustomerId;
//        } catch (Exception e) {
//            log.error("Error fetching Razorpay customers manually: {}", e.getMessage(), e);
//            return null;
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
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isEmpty()) {
//                log.warn("Customer not found for id: {}", customerId);
//                throw new RuntimeException("Customer not found");
//            }
//            Customer customer = optCustomer.get();
//
//            String effectiveSubscriptionId = subscriptionId;
//            if (policyId != null && (effectiveSubscriptionId == null || effectiveSubscriptionId.isEmpty())) {
//                // Fetch subscriptionId from paymentHistory if not provided
//                Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                    .filter(h -> h.getPolicyId().equals(policyId))
//                    .findFirst();
//                if (optHistory.isPresent()) {
//                    effectiveSubscriptionId = optHistory.get().getRazorpaySubscriptionId();
//                    if (effectiveSubscriptionId == null || effectiveSubscriptionId.isEmpty()) {
//                        log.warn("No subscriptionId found for policyId: {}. Updating local status only.", policyId);
//                    }
//                } else {
//                    log.warn("No payment history for policyId: {}. Cannot cancel subscription.", policyId);
//                }
//            }
//
//            // Cancel in Razorpay if we have a valid subscriptionId
//            if (effectiveSubscriptionId != null && !effectiveSubscriptionId.isEmpty()) {
//                RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//                Subscription subscription = razorpay.subscriptions.fetch(effectiveSubscriptionId);
//                String subStatus = subscription.get("status");
//
//                if ("active".equals(subStatus) || "pending".equals(subStatus)) {
//                    JSONObject cancelOptions = new JSONObject();
//                    cancelOptions.put("cancel_at_cycle_end", 0); // immediate cancel
//                    razorpay.subscriptions.cancel(effectiveSubscriptionId, cancelOptions);
//                    log.info("Successfully canceled subscription: {}", effectiveSubscriptionId);
//                } else if ("cancelled".equals(subStatus)) {
//                    log.info("Subscription {} is already cancelled. Skipping cancellation.", effectiveSubscriptionId);
//                } else {
//                    log.warn("Subscription {} in status '{}'; cannot cancel.", effectiveSubscriptionId, subStatus);
//                }
//            } else {
//                log.info("No valid subscriptionId provided or found. Skipping Razorpay cancellation.");
//            }
//
//            customer.setAutoPayEnabled(false); // global flag
//
//            if (policyId != null) {
//                // Update per-policy status
//                Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                    .filter(h -> h.getPolicyId().equals(policyId))
//                    .findFirst();
//                if (optHistory.isPresent()) {
//                    Customer.PaymentHistory history = optHistory.get();
//                    history.setStatus("paidByAutoPayInactive");
//                    history.setRazorpaySubscriptionId(""); // Clear subscriptionId after cancel
//                } else {
//                    log.warn("No history for policy {}, cannot set inactive status", policyId);
//                }
//
//                // Notify Notification Microservice for disable
//                sendAutoPayNotification(customer.getEmail(), policyId, false);
//            }
//
//            customerRepository.save(customer);
//            log.info("Autopay disabled successfully for customerId: {}", customerId);
//        } catch (RazorpayException e) {
//            log.error("Razorpay error during disable: {}", e.getMessage(), e);
//            throw new RuntimeException("Failed to disable autopay: " + e.getMessage());
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
//}
//

//
////autopay enabled status/disabled status
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
//import java.util.Date;
//import java.util.HashMap;
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//import java.util.stream.Collectors;
//
//@Service
//public class CustomerServiceImpl implements CustomerService {
//
//    private static final Logger log = LoggerFactory.getLogger(CustomerServiceImpl.class);
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
//                    history.setStatus("paidByAutopayActive"); // Set active status on payment
//                    Date now = new Date();
//                    history.setLastPaidDate(now);
//
//                    Calendar cal = Calendar.getInstance();
//                    cal.setTime(history.getValidUpto() != null ? history.getValidUpto() : now);
//                    cal.add(Calendar.MONTH, 1); // extend by 1 month for autopay payment
//                    history.setValidUpto(cal.getTime());
//
//                    history.setRazorpaySubscriptionId(subscriptionId); // Save subscriptionId here if not already
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
//            // One-time payment logic with invoice (unchanged from your code)
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
//    @Override
//    public String enableAutoPayPolicy(String customerId, String policyId, int months, double amount) {
//        log.info("Enabling autopay for customerId: {}, policyId: {}, months: {}, amount: {}", customerId, policyId, months, amount);
//
//        try {
//            Optional<Policy> optPolicy = policyRepository.findById(policyId);
//            if (optPolicy.isEmpty()) throw new RuntimeException("Policy not found");
//            Policy policy = optPolicy.get();
//
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isEmpty()) throw new RuntimeException("Customer not found");
//            Customer customer = optCustomer.get();
//
//            Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                 .filter(h -> h.getPolicyId().equals(policyId))
//                 .findFirst();
//
//            int remainingMonths = policy.getDurationMonths();
//            if (optHistory.isPresent()) {
//                Date today = new Date();
//                Date validUpto = optHistory.get().getValidUpto() != null ? optHistory.get().getValidUpto() : new Date(0);
//                Date createdAt = policy.getCreatedAt();
//
//                Calendar calToday = Calendar.getInstance();
//                calToday.setTime(today);
//                Calendar calValid = Calendar.getInstance();
//                calValid.setTime(validUpto);
//                Calendar calCreated = Calendar.getInstance();
//                calCreated.setTime(createdAt);
//
//                int monthsPassed = (calToday.get(Calendar.YEAR) - calCreated.get(Calendar.YEAR)) * 12 +
//                                   (calToday.get(Calendar.MONTH) - calCreated.get(Calendar.MONTH));
//
//                remainingMonths = policy.getDurationMonths() - monthsPassed;
//
//                if (calToday.get(Calendar.YEAR) == calValid.get(Calendar.YEAR) &&
//                    calToday.get(Calendar.MONTH) == calValid.get(Calendar.MONTH)) {
//                    remainingMonths++;
//                }
//            }
//
//            if (months > remainingMonths) throw new RuntimeException("Requested months exceed remaining: " + remainingMonths);
//
//            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//
//            // Create or reuse Razorpay customer for notification
//            String razorpayCustomerId = customer.getRazorpayCustomerId();
//            if (razorpayCustomerId == null) {
//                JSONObject customerRequest = new JSONObject();
//                customerRequest.put("name", customer.getName() != null ? customer.getName() : "Customer");
//                customerRequest.put("email", customer.getEmail());
//                customerRequest.put("contact", customer.getPhone().startsWith("+") ? customer.getPhone() : "+" + customer.getPhone());
//                com.razorpay.Customer razorpayCustomer = razorpay.customers.create(customerRequest);
//                razorpayCustomerId = razorpayCustomer.get("id");
//                customer.setRazorpayCustomerId(razorpayCustomerId);
//                customerRepository.save(customer);
//                log.info("Created new Razorpay Customer ID: {}", razorpayCustomerId);
//            } else {
//                log.info("Using existing Razorpay Customer ID: {}", razorpayCustomerId);
//            }
//
//            JSONObject subRequest = new JSONObject();
//            subRequest.put("plan_id", planId);
//            subRequest.put("total_count", months);
//            subRequest.put("quantity", 1);
//            subRequest.put("customer_notify", 1);
//            subRequest.put("customer_id", razorpayCustomerId);
//            subRequest.put("notes", new JSONObject().put("customerId", customerId).put("policyId", policyId));
//
//            Subscription subscription = razorpay.subscriptions.create(subRequest);
//            String subscriptionId = subscription.get("id");
//
//            customer.setAutoPayEnabled(true);
//
//            // Update payment history with "paidByAutopayActive" status and save subscriptionId
//            Customer.PaymentHistory history = optHistory.orElseGet(() -> {
//                Customer.PaymentHistory newHistory = new Customer.PaymentHistory();
//                newHistory.setPolicyId(policyId);
//                customer.getPaymentHistory().add(newHistory);
//                log.info("Created new payment history entry for policy {}", policyId);
//                return newHistory;
//            });
//            history.setStatus("paidByAutopayActive");
//            history.setRazorpaySubscriptionId(subscriptionId); // Save the ID here
//
//            customerRepository.save(customer);
//
//            // Notify Notification Microservice
//            sendAutoPayNotification(customer.getEmail(), policyId, true);
//
//            log.info("Autopay enabled with subscriptionId: {}", subscriptionId);
//            return subscriptionId;
//
//        } catch (Exception e) {
//            log.error("Error enabling autopay for policy", e);
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
//            Optional<Customer> optCustomer = customerRepository.findById(customerId);
//            if (optCustomer.isEmpty()) {
//                log.warn("Customer not found for id: {}", customerId);
//                throw new RuntimeException("Customer not found");
//            }
//            Customer customer = optCustomer.get();
//
//            String effectiveSubscriptionId = subscriptionId;
//            if (policyId != null && (effectiveSubscriptionId == null || effectiveSubscriptionId.isEmpty())) {
//                // Fetch subscriptionId from paymentHistory if not provided
//                Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                    .filter(h -> h.getPolicyId().equals(policyId))
//                    .findFirst();
//                if (optHistory.isPresent()) {
//                    effectiveSubscriptionId = optHistory.get().getRazorpaySubscriptionId();
//                    if (effectiveSubscriptionId == null || effectiveSubscriptionId.isEmpty()) {
//                        log.warn("No subscriptionId found for policyId: {}. Updating local status only.", policyId);
//                    }
//                } else {
//                    log.warn("No payment history for policyId: {}. Cannot cancel subscription.", policyId);
//                }
//            }
//
//            // Cancel in Razorpay if we have a valid subscriptionId
//            if (effectiveSubscriptionId != null && !effectiveSubscriptionId.isEmpty()) {
//                RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
//                JSONObject cancelOptions = new JSONObject();
//                cancelOptions.put("cancel_at_cycle_end", 0); // immediate cancel
//                razorpay.subscriptions.cancel(effectiveSubscriptionId, cancelOptions);
//                log.info("Successfully canceled subscription: {}", effectiveSubscriptionId);
//            } else {
//                log.info("No valid subscriptionId provided or found. Skipping Razorpay cancellation.");
//            }
//
//            customer.setAutoPayEnabled(false); // global flag
//
//            if (policyId != null) {
//                // Update per-policy status
//                Optional<Customer.PaymentHistory> optHistory = customer.getPaymentHistory().stream()
//                    .filter(h -> h.getPolicyId().equals(policyId))
//                    .findFirst();
//                if (optHistory.isPresent()) {
//                    Customer.PaymentHistory history = optHistory.get();
//                    history.setStatus("paidByAutoPayInactive");
//                    history.setRazorpaySubscriptionId(""); // Clear subscriptionId after cancel
//                } else {
//                    log.warn("No history for policy {}, cannot set inactive status", policyId);
//                }
//
//                // Notify Notification Microservice for disable
//                sendAutoPayNotification(customer.getEmail(), policyId, false);
//            }
//
//            customerRepository.save(customer);
//            log.info("Autopay disabled successfully for customerId: {}", customerId);
//        } catch (RazorpayException e) {
//            log.error("Razorpay error during disable: {}", e.getMessage(), e);
//            throw new RuntimeException("Failed to disable autopay: " + e.getMessage());
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
//}
