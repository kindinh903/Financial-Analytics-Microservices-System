package com.hcmus.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
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
            try {
                Key key = Keys.hmacShaKeyFor(jwtKey.getBytes(StandardCharsets.UTF_8));
                Claims claims = Jwts.parserBuilder()
                        .setSigningKey(key)
                        .build()
                        .parseClaimsJws(token)
                        .getBody();

                String userId = claims.get("nameid", String.class);
                if (userId == null) {
                    // Fallback for ClaimTypes.NameIdentifier mapping
                    Object sub = claims.get("sub");
                    userId = sub != null ? sub.toString() : null;
                }
                String email = claims.get("email", String.class);
                String name = claims.get("unique_name", String.class);
                if (name == null) {
                    name = claims.get("name", String.class);
                }
                String role = claims.get("role", String.class);
                String firstName = claims.get("firstName", String.class);
                String lastName = claims.get("lastName", String.class);

                var mutated = exchange.getRequest().mutate()
                        .header("X-User-Id", userId == null ? "" : userId)
                        .header("X-User-Email", email == null ? "" : email)
                        .header("X-User-Name", name == null ? "" : name)
                        .header("X-User-Role", role == null ? "" : role)
                        .header("X-User-First-Name", firstName == null ? "" : firstName)
                        .header("X-User-Last-Name", lastName == null ? "" : lastName)
                        .build();

                return chain.filter(exchange.mutate().request(mutated).build());
            } catch (Exception ex) {
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