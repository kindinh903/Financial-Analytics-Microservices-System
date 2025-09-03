package com.hcmus.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

@SpringBootApplication
@ComponentScan(basePackages = {"com.hcmus.gateway", "com.hcmus.gateway.config", "com.hcmus.gateway.filter"})
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @Bean
    public CorsWebFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        
        // QUAN TRỌNG: Dùng specific origins thay vì wildcard
        config.addAllowedOrigin("http://localhost:3000");  // React dev server
        config.addAllowedOrigin("http://localhost:3001");  // Backup port
        config.addAllowedOrigin("http://127.0.0.1:3000");  // Alternative localhost
        
        // Hoặc nếu cần nhiều ports khác nhau:
        // config.addAllowedOriginPattern("http://localhost:[3000-3010]");
        
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsWebFilter(source);
    }
}