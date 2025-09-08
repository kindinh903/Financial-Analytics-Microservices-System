package com.hcmus.gateway.controller;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import reactor.core.publisher.Mono;

import java.net.URI;

@Component
public class WebSocketProxyHandler implements WebSocketHandler {

    private final ReactorNettyWebSocketClient client = new ReactorNettyWebSocketClient();

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        // Extract the path and query parameters
        String path = session.getHandshakeInfo().getUri().getPath();
        String query = session.getHandshakeInfo().getUri().getQuery();
        
        // Build target WebSocket URL
        String targetUrl = "ws://price-service:8081" + path;
        if (query != null) {
            targetUrl += "?" + query;
        }

        try {
            URI targetUri = URI.create(targetUrl);
            
            return client.execute(targetUri, targetSession -> {
                // Proxy messages from client to target
                Mono<Void> input = session.receive()
                    .map(message -> targetSession.textMessage(message.getPayloadAsText()))
                    .as(targetSession::send);

                // Proxy messages from target to client
                Mono<Void> output = targetSession.receive()
                    .map(message -> session.textMessage(message.getPayloadAsText()))
                    .as(session::send);

                return Mono.zip(input, output).then();
            });
        } catch (Exception e) {
            return session.close();
        }
    }
}
