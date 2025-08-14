
package training.iqgateway.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

import java.util.Date;

@Document(collection = "insurers")
@Data
public class Insurer {
    @Id
    private String id;
    private String companyName;
    private String name;
    private String email;
    private String password;
    private String phone;
    private String address;
    private String role;
    private boolean active;
    private Date createdAt;
}