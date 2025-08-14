package training.iqgateway.service.Impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import training.iqgateway.entity.Customer;
import training.iqgateway.entity.Insurer;
import training.iqgateway.repository.CustomerRepository;
import training.iqgateway.repository.InsurerRepository;
import training.iqgateway.service.LoginService;

@Service
public class LoginServiceImpl implements LoginService {

    @Autowired
    private InsurerRepository insurerRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Override
    public Object authenticate(String email, String password) {
        // Determine user type based on email substring
        if (email.contains("insurer")) {
            Insurer insurer = insurerRepository.findByEmail(email);
            if (insurer != null && password.equals(insurer.getPassword())) {
                return insurer;
            }
        } else if (email.contains("gmail")) { // Presuming Gmail users are customers
            Customer customer = customerRepository.findByEmail(email);
            if (customer != null && password.equals(customer.getPassword())) {
                return customer;
            }
        }
        return null; // Authentication failed
    }
}















//package training.iqgateway.service.Impl;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Service;
//import training.iqgateway.entity.Admin;
//import training.iqgateway.entity.Customer;
//import training.iqgateway.entity.Insurer;
//import training.iqgateway.repository.AdminRepository;
//import training.iqgateway.repository.CustomerRepository;
//import training.iqgateway.repository.InsurerRepository;
//import training.iqgateway.service.LoginService;
//
//@Service
//public class LoginServiceImpl implements LoginService {
//
//    @Autowired
//    private AdminRepository adminRepository;
//
//    @Autowired
//    private InsurerRepository insurerRepository;
//
//    @Autowired
//    private CustomerRepository customerRepository;
//
//    @Override
//    public Object authenticate(String email, String password) {
//        // Determine collection based on email substring
//        if (email.contains("admin")) {
//            Admin admin = adminRepository.findByEmail(email);
//            if (admin != null && password.equals(admin.getPassword())) {
//                return admin;
//            }
//        } else if (email.contains("insurer")) {
//            Insurer insurer = insurerRepository.findByEmail(email);
//            if (insurer != null && password.equals(insurer.getPassword())) {
//                return insurer;
//            }
//        } else if (email.contains("gmail")) {
//            Customer customer = customerRepository.findByEmail(email);
//            if (customer != null && password.equals(customer.getPassword())) {
//                return customer;
//            }
//        }
//        return null; // Authentication failed
//    }
//}
