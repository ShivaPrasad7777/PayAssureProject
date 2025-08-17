package training.iqgateway.service.Impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import training.iqgateway.entity.Customer;
import training.iqgateway.repository.CustomerRepository;

import java.util.Date;
import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
public class OtpService {

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private CustomerRepository customerRepository;

    public boolean generateAndSendOtp(String email) {
        Customer customer = customerRepository.findByEmail(email);
        if (customer == null) {
            return false; // No such email
        }
        String otp = String.valueOf(100000 + new Random().nextInt(900000)); // 6-digit
        customer.setOtp(otp);
        customer.setOtpExpiry(new Date(System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(10))); // 10 min expiry
        customerRepository.save(customer);

        // Send email
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Your OTP Code");
        message.setText("Your OTP code is: " + otp + ". It is valid for 10 minutes.");
        mailSender.send(message);

        return true;
    }

    public boolean validateOtp(String email, String otp) {
        Customer customer = customerRepository.findByEmail(email);
        if (customer != null && customer.getOtp() != null &&
            customer.getOtpExpiry() != null &&
            customer.getOtpExpiry().after(new Date()) &&
            customer.getOtp().equals(otp)) {
            customer.setOtp(null);
            customer.setOtpExpiry(null);
            customerRepository.save(customer);
            return true;
        }
        return false;
    }
}

