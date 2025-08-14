package training.iqgateway.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {
    private String id;
    private String name;
    private String email;
    private String role;
    private Date createdAt;
    // Add other fields as needed (e.g., for insurer: companyName, for customer: policyIds)
}
