package com.omnicart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OmniCartApplication {
    public static void main(String[] args) {
        SpringApplication.run(OmniCartApplication.class, args);
    }
}
