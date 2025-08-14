// Add this to CustomerMicroservice (not NotificationMicroservice)
// Place it in src/main/java/training/iqgateway/config/AppConfig.java (create the 'config' package if needed)
// This configures RestTemplate for making HTTP calls from Customer to Notification (via gateway on 9999)

package training.iqgateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
