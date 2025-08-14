package training.iqgateway.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

import java.util.Date;

@Document(collection = "admins")
@Data
public class Admin {
    @Id
    private String id;
    private String name;
    private String email;
    private String password;
    private String role;
    private Date createdAt;
}