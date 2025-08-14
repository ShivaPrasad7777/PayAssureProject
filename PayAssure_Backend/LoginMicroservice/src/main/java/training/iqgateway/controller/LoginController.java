package training.iqgateway.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import training.iqgateway.dto.LoginRequest;
import training.iqgateway.dto.LoginResponse;
import training.iqgateway.entity.Customer;
import training.iqgateway.repository.CustomerRepository;
import training.iqgateway.service.LoginService;
import training.iqgateway.service.Impl.OtpService;

@RestController
@RequestMapping("/api/login")
public class LoginController {

    private final CustomerRepository customerRepository;

    @Autowired
    private LoginService loginService;
    
    @Autowired
    private OtpService otpService;

    LoginController(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @PostMapping
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest loginRequest) {
        Object user = loginService.authenticate(loginRequest.getEmail(), loginRequest.getPassword());
        if (user != null) {
            LoginResponse response;
            if (user instanceof training.iqgateway.entity.Insurer) {
                training.iqgateway.entity.Insurer insurer = (training.iqgateway.entity.Insurer) user;
                response = new LoginResponse(
                    insurer.getId(), 
                    insurer.getName(), 
                    insurer.getEmail(), 
                    insurer.getRole(), 
                    insurer.getCreatedAt()
                );
                // Add insurer-specific fields if needed
            } else if (user instanceof training.iqgateway.entity.Customer) {
                training.iqgateway.entity.Customer customer = (training.iqgateway.entity.Customer) user;
                response = new LoginResponse(
                    customer.getId(), 
                    customer.getName(), 
                    customer.getEmail(), 
                    "customer", 
                    customer.getCreatedAt()
                );
                // Add customer-specific fields if needed
                System.out.println("Testing the git");
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String,String> request) {
        boolean sent = otpService.generateAndSendOtp(request.get("email"));
        if (sent) return ResponseEntity.ok("OTP sent to email");
        else return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Email not found");
    }
    
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String,String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");
        boolean valid = otpService.validateOtp(email, otp);
        if (valid) {
            Customer customer = customerRepository.findByEmail(email);
            customer.setPassword(newPassword); // Hash password in real apps!
            customerRepository.save(customer);
            System.out.println("Hi");
            System.out.println("hi");
            return ResponseEntity.ok("Password reset successful");
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid OTP or expired");
        }
    }


}





//package training.iqgateway.controller;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.HttpStatus;

//import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.RequestBody;
//import org.springframework.web.bind.annotation.RequestMapping;
//import org.springframework.web.bind.annotation.RestController;
//
//import training.iqgateway.dto.LoginRequest;
//import training.iqgateway.dto.LoginResponse;

//
//@RestController
//@RequestMapping("/api/login")
//public class LoginController {
//
//    @Autowired
//    private LoginService loginService;
//
//    @PostMapping
//    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest loginRequest) {
//        Object user = loginService.authenticate(loginRequest.getEmail(), loginRequest.getPassword());
//        if (user != null) {
//            // Create response based on user type
//            LoginResponse response;
//            if (user instanceof training.iqgateway.entity.Admin) {
//                training.iqgateway.entity.Admin admin = (training.iqgateway.entity.Admin) user;
//                response = new LoginResponse(admin.getId(), admin.getName(), admin.getEmail(), admin.getRole(), admin.getCreatedAt());
//            } else if (user instanceof training.iqgateway.entity.Insurer) {
//                training.iqgateway.entity.Insurer insurer = (training.iqgateway.entity.Insurer) user;
//                response = new LoginResponse(insurer.getId(), insurer.getName(), insurer.getEmail(), insurer.getRole(), insurer.getCreatedAt());
//                // Add insurer-specific fields if needed
//            } else if (user instanceof training.iqgateway.entity.Customer) {
//                training.iqgateway.entity.Customer customer = (training.iqgateway.entity.Customer) user;
//                response = new LoginResponse(customer.getId(), customer.getName(), customer.getEmail(), "customer", customer.getCreatedAt());
//                // Add customer-specific fields if needed
//            } else {
//                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
//            }
//            return ResponseEntity.ok(response);
//        }
//        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
//    }
//}
