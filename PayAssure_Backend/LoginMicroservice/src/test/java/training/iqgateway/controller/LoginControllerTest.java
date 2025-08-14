package training.iqgateway.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import training.iqgateway.dto.LoginRequest;
import training.iqgateway.dto.LoginResponse;
import training.iqgateway.entity.Customer;
import training.iqgateway.entity.Insurer;
import training.iqgateway.repository.CustomerRepository;
import training.iqgateway.service.LoginService;
import training.iqgateway.service.Impl.OtpService;

import java.util.Date;
import java.util.Map;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;


@WebMvcTest(LoginController.class)
public class LoginControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LoginService loginService;

    @MockBean
    private CustomerRepository customerRepository;

    @MockBean
    private OtpService otpService;

    @Autowired
    private ObjectMapper objectMapper;

    // ---------------- EXISTING LOGIN TESTS ---------------- //

    @Test
    public void testLogin_AsInsurer_ShouldReturnOk() throws Exception {
        Insurer insurer = new Insurer();
        insurer.setId("insurer123");
        insurer.setName("Insurer User");
        insurer.setEmail("insurer@example.com");
        insurer.setRole("insurer");
        insurer.setCreatedAt(new Date());

        LoginRequest request = new LoginRequest("insurer@example.com", "password");
        Mockito.when(loginService.authenticate(request.getEmail(), request.getPassword()))
               .thenReturn(insurer);

        mockMvc.perform(post("/api/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(insurer.getId())))
                .andExpect(jsonPath("$.name", is(insurer.getName())))
                .andExpect(jsonPath("$.email", is(insurer.getEmail())))
                .andExpect(jsonPath("$.role", is(insurer.getRole())));
    }

    @Test
    public void testLogin_AsCustomer_ShouldReturnOk() throws Exception {
        Customer customer = new Customer();
        customer.setId("customer123");
        customer.setName("Customer User");
        customer.setEmail("customer@example.com");
        customer.setCreatedAt(new Date());

        LoginRequest request = new LoginRequest("customer@example.com", "password");
        Mockito.when(loginService.authenticate(request.getEmail(), request.getPassword()))
               .thenReturn(customer);

        mockMvc.perform(post("/api/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(customer.getId())))
                .andExpect(jsonPath("$.name", is(customer.getName())))
                .andExpect(jsonPath("$.email", is(customer.getEmail())))
                .andExpect(jsonPath("$.role", is("customer")));
    }

    @Test
    public void testLogin_InvalidUser_ShouldReturnUnauthorized() throws Exception {
        LoginRequest request = new LoginRequest("unknown@example.com", "wrongpassword");
        Mockito.when(loginService.authenticate(request.getEmail(), request.getPassword()))
               .thenReturn(null);

        mockMvc.perform(post("/api/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testLogin_UnknownUserType_ShouldReturnUnauthorized() throws Exception {
        Object unknownUser = new Object();
        LoginRequest request = new LoginRequest("email@example.com", "password");
        Mockito.when(loginService.authenticate(request.getEmail(), request.getPassword()))
               .thenReturn(unknownUser);

        mockMvc.perform(post("/api/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    // ---------------- NEW TESTS FOR FORGOT PASSWORD ---------------- //

    @Test
    public void testForgotPassword_EmailFound_ShouldReturnOk() throws Exception {
        Map<String, String> request = Map.of("email", "test@example.com");
        Mockito.when(otpService.generateAndSendOtp("test@example.com")).thenReturn(true);

        mockMvc.perform(post("/api/login/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("OTP sent to email"));
    }

    @Test
    public void testForgotPassword_EmailNotFound_ShouldReturnNotFound() throws Exception {
        Map<String, String> request = Map.of("email", "missing@example.com");
        Mockito.when(otpService.generateAndSendOtp("missing@example.com")).thenReturn(false);

        mockMvc.perform(post("/api/login/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Email not found"));
    }

    // ---------------- NEW TESTS FOR RESET PASSWORD ---------------- //

    @Test
    public void testResetPassword_ValidOtp_ShouldReturnOk() throws Exception {
        Map<String, String> request = Map.of(
                "email", "test@example.com",
                "otp", "123456",
                "newPassword", "newpass"
        );

        Customer customer = new Customer();
        customer.setEmail("test@example.com");

        Mockito.when(otpService.validateOtp("test@example.com", "123456")).thenReturn(true);
        Mockito.when(customerRepository.findByEmail("test@example.com")).thenReturn(customer);

        mockMvc.perform(post("/api/login/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Password reset successful"));

        Mockito.verify(customerRepository).save(customer);
    }

    @Test
    public void testResetPassword_InvalidOtp_ShouldReturnBadRequest() throws Exception {
        Map<String, String> request = Map.of(
                "email", "test@example.com",
                "otp", "wrongotp",
                "newPassword", "newpass"
        );

        Mockito.when(otpService.validateOtp("test@example.com", "wrongotp")).thenReturn(false);

        mockMvc.perform(post("/api/login/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Invalid OTP or expired"));
    }
}






//@WebMvcTest(LoginController.class)
//public class LoginControllerTest {
//
//    @Autowired
//    private MockMvc mockMvc;
//
//    @MockBean
//    private LoginService loginService;
//
//    @MockBean
//    private CustomerRepository customerRepository; // To satisfy constructor injection
//
//    @MockBean
//    private OtpService otpService; // ✅ To satisfy @Autowired field in controller
//
//    @Autowired
//    private ObjectMapper objectMapper;
//
//    @Test
//    public void testLogin_AsInsurer_ShouldReturnOk() throws Exception {
//        Insurer insurer = new Insurer();
//        insurer.setId("insurer123");
//        insurer.setName("Insurer User");
//        insurer.setEmail("insurer@example.com");
//        insurer.setRole("insurer");
//        insurer.setCreatedAt(new Date());
//
//        LoginRequest request = new LoginRequest("insurer@example.com", "password");
//        Mockito.when(loginService.authenticate(request.getEmail(), request.getPassword()))
//               .thenReturn(insurer);
//
//        mockMvc.perform(post("/api/login")
//                .contentType(MediaType.APPLICATION_JSON)
//                .content(objectMapper.writeValueAsString(request)))
//                .andExpect(status().isOk())
//                .andExpect(jsonPath("$.id", is(insurer.getId())))
//                .andExpect(jsonPath("$.name", is(insurer.getName())))
//                .andExpect(jsonPath("$.email", is(insurer.getEmail())))
//                .andExpect(jsonPath("$.role", is(insurer.getRole())));
//    }
//
//    @Test
//    public void testLogin_AsCustomer_ShouldReturnOk() throws Exception {
//        Customer customer = new Customer();
//        customer.setId("customer123");
//        customer.setName("Customer User");
//        customer.setEmail("customer@example.com");
//        customer.setCreatedAt(new Date());
//
//        LoginRequest request = new LoginRequest("customer@example.com", "password");
//        Mockito.when(loginService.authenticate(request.getEmail(), request.getPassword()))
//               .thenReturn(customer);
//
//        mockMvc.perform(post("/api/login")
//                .contentType(MediaType.APPLICATION_JSON)
//                .content(objectMapper.writeValueAsString(request)))
//                .andExpect(status().isOk())
//                .andExpect(jsonPath("$.id", is(customer.getId())))
//                .andExpect(jsonPath("$.name", is(customer.getName())))
//                .andExpect(jsonPath("$.email", is(customer.getEmail())))
//                .andExpect(jsonPath("$.role", is("customer")));
//    }
//
//    @Test
//    public void testLogin_InvalidUser_ShouldReturnUnauthorized() throws Exception {
//        LoginRequest request = new LoginRequest("unknown@example.com", "wrongpassword");
//        Mockito.when(loginService.authenticate(request.getEmail(), request.getPassword()))
//               .thenReturn(null);
//
//        mockMvc.perform(post("/api/login")
//                .contentType(MediaType.APPLICATION_JSON)
//                .content(objectMapper.writeValueAsString(request)))
//                .andExpect(status().isUnauthorized());
//    }
//
//    @Test
//    public void testLogin_UnknownUserType_ShouldReturnUnauthorized() throws Exception {
//        Object unknownUser = new Object();
//
//        LoginRequest request = new LoginRequest("email@example.com", "password");
//        Mockito.when(loginService.authenticate(request.getEmail(), request.getPassword()))
//               .thenReturn(unknownUser);
//
//        mockMvc.perform(post("/api/login")
//                .contentType(MediaType.APPLICATION_JSON)
//                .content(objectMapper.writeValueAsString(request)))
//                .andExpect(status().isUnauthorized());
//    }
//}
