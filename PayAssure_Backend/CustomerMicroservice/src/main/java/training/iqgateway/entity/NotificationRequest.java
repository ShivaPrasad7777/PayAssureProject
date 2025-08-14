package training.iqgateway.entity;

public class NotificationRequest {
	 private String customerId;
	    private String policyId;
		public String getCustomerId() {
			return customerId;
		}
		public void setCustomerId(String customerId) {
			this.customerId = customerId;
		}
		public String getPolicyId() {
			return policyId;
		}
		public void setPolicyId(String policyId) {
			this.policyId = policyId;
		}
}
