package com.seal.hackathon;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SealHackathonApplication {

    public static void main(String[] args) {
        SpringApplication.run(SealHackathonApplication.class, args);
    }
}
