package training.iqgateway.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Data
@Document(collection = "policies")
public class Policy {
    @Id
    private String id;

    private String insurerId;
    private String type;
    private Double coverageAmount;
    private Double monthlyPremium;
    private Integer durationMonths;
    private Boolean active = true;
    private Date createdAt = new Date();
    private String policyType; 
    private String name; 
}
