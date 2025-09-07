package com.hcmus.gateway.config;

import com.hcmus.gateway.controller.WebSocketProxyHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class GatewayConfig {

    @Autowired
    private WebSocketProxyHandler webSocketProxyHandler;

    @Bean
    public HandlerMapping webSocketMapping() {
        Map<String, WebSocketHandler> map = new HashMap<>();
        map.put("/ws/**", webSocketProxyHandler);

        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setUrlMap(map);
        mapping.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return mapping;
    }

    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        return new WebSocketHandlerAdapter();
    }

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