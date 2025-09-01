package com.hcmus.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayConfig {

    // Java configuration temporarily disabled - using YAML instead
    /*
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // Health check routes
                .route("price-health", r -> r
                        .path("/health/price")
                        .uri("http://price-service:8081"))
                
                .route("auth-health", r -> r
                        .path("/health/auth")
                        .uri("http://auth-service:8087"))
                
                // Service routes
                .route("price-service", r -> r
                        .path("/api/price/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://price-service:8081"))
                
                .route("auth-service", r -> r
                        .path("/api/auth/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://auth-service:8087"))
                
                .build();
    }
    */
} 