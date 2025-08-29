package com.hcmus.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.List;

@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    @Value("${jwt.key:}")
    private String jwtKey;

    @Value("${jwt.enabled:true}")
    private boolean jwtEnabled;

    private static final Logger logger = LoggerFactory.getLogger(AuthenticationFilter.class);

    public AuthenticationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            if (!jwtEnabled) {
                return chain.filter(exchange);
            }

            String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return unauthorized(exchange, "Missing or invalid Authorization header");
            }

            String token = authHeader.substring(7);
            logger.info("Gateway received JWT: {}", token);
            try {
                Key key = Keys.hmacShaKeyFor(jwtKey.getBytes(StandardCharsets.UTF_8));
                logger.debug("JWT key length: {}", jwtKey.length());
                
                Claims claims = Jwts.parserBuilder()
                        .setSigningKey(key)
                        .build()
                        .parseClaimsJws(token)
                        .getBody();

                logger.debug("JWT claims: {}", claims);
                
                String userId = claims.get("nameid", String.class);
                if (userId == null) {
                    // Fallback for ClaimTypes.NameIdentifier mapping
                    userId = claims.get("sub", String.class);
                }
                String email = claims.get("email", String.class);
                String name = claims.get("unique_name", String.class);
                if (name == null) {
                    name = claims.get("name", String.class);
                }
                
                // Xử lý role có thể là array hoặc string
                String role = null;
                Object roleClaim = claims.get("role");
                if (roleClaim instanceof List) {
                    List<?> roleList = (List<?>) roleClaim;
                    if (!roleList.isEmpty()) {
                        role = roleList.get(0).toString(); // Lấy role đầu tiên
                    }
                } else if (roleClaim instanceof String) {
                    role = (String) roleClaim;
                }
                
                String firstName = claims.get("firstName", String.class);
                String lastName = claims.get("lastName", String.class);
                
                // Xử lý permissions có thể là array hoặc string
                String permissions = null;
                Object permissionsClaim = claims.get("permissions");
                if (permissionsClaim instanceof List) {
                    List<?> permissionsList = (List<?>) permissionsClaim;
                    if (!permissionsList.isEmpty()) {
                        permissions = String.join(",", permissionsList.stream().map(Object::toString).toList());
                    }
                } else if (permissionsClaim instanceof String) {
                    permissions = (String) permissionsClaim;
                }
                
                // Xử lý features có thể là array
                String features = null;
                Object featuresClaim = claims.get("features");
                if (featuresClaim instanceof List) {
                    List<?> featuresList = (List<?>) featuresClaim;
                    if (!featuresList.isEmpty()) {
                        features = String.join(",", featuresList.stream().map(Object::toString).toList());
                    }
                } else if (featuresClaim instanceof String) {
                    features = (String) featuresClaim;
                }

                if (logger.isDebugEnabled()) {
                    logger.debug("Gateway JWT decoded: userId={}, email={}, role={}, firstName={}, lastName={}, permissions={}, features={}",
                            userId, email, role, firstName, lastName, permissions, features);
                }

                var mutated = exchange.getRequest().mutate()
                        .header("X-User-Id", userId == null ? "" : userId)
                        .header("X-User-Email", email == null ? "" : email)
                        .header("X-User-Name", name == null ? "" : name)
                        .header("X-User-Role", role == null ? "" : role)
                        .header("X-User-First-Name", firstName == null ? "" : firstName)
                        .header("X-User-Last-Name", lastName == null ? "" : lastName)
                        .header("X-User-Permissions", permissions == null ? "" : permissions)
                        .header("X-User-Features", features == null ? "" : features)
                        .build();

                return chain.filter(exchange.mutate().request(mutated).build());
            } catch (Exception ex) {
                logger.warn("Gateway JWT verify failed: {}", ex.getMessage());
                return unauthorized(exchange, "Invalid token");
            }
        };
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");
        byte[] bytes = ("{\"error\":\"Unauthorized\",\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8);
        return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(bytes)));
    }

    public static class Config {
    }
}