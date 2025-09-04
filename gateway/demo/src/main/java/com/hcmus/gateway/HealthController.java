package com.hcmus.gateway;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new HashMap<>();
        body.put("status", "UP");
        body.put("service", "api-gateway");
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/api/news/health")
    public ResponseEntity<Map<String, Object>> newsHealth() {
        Map<String, Object> body = new HashMap<>();
        body.put("status", "UP");
        body.put("service", "news-service");
        body.put("timestamp", Instant.now().toString());
        body.put("note", "Mock endpoint - news service not running");
        return ResponseEntity.ok(body);
    }

    @GetMapping("/api/news/categories")
    public ResponseEntity<Map<String, Object>> newsCategories() {
        Map<String, Object> body = new HashMap<>();
        body.put("status", "success");
        body.put("categories", new String[]{
            "cryptocurrency",
            "bitcoin",
            "ethereum",
            "defi",
            "nft",
            "blockchain",
            "trading",
            "regulation",
            "technology",
            "market-analysis"
        });
        body.put("timestamp", Instant.now().toString());
        body.put("note", "Mock endpoint - news service not running");
        return ResponseEntity.ok(body);
    }
}


