package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication
@EnableMongoRepositories(basePackages = "com.example.repository") 
@ComponentScan(basePackages = {"com.example.demo", "com.example.repository", "com.example.service", "com.example.model", "com.example.controller"})  // Scans all key packages
public class RazorpayTestApplication {

    public static void main(String[] args) {
        SpringApplication.run(RazorpayTestApplication.class, args);
    }
}
