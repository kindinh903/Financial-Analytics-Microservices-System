package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/segmentio/kafka-go"
)

func main() {
	// Start Kafka publisher in background
	go startPublisher()
	
	// Start Kafka subscriber in background
	go startSubscriber()

	// Setup HTTP server
	mux := http.NewServeMux()
	
	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Notification endpoint
	mux.HandleFunc("/notifications", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			// Handle notification creation
			w.WriteHeader(http.StatusCreated)
			w.Write([]byte(`{"message": "Notification created"}`))
		} else {
			// Handle notification retrieval
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"notifications": []}`))
		}
	})

	// Server configuration
	server := &http.Server{
		Addr:         ":8086",
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in background
	go func() {
		log.Printf("Starting HTTP server on port 8086")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}

func startPublisher() {
	writer := kafka.Writer{
		Addr:     kafka.TCP("kafka:9092"),
		Topic:    "alerts",
		Balancer: &kafka.LeastBytes{},
	}
	defer writer.Close()

	// Keep publisher running
	for {
		time.Sleep(30 * time.Second)
		log.Println("Publisher heartbeat")
	}
}

func startSubscriber() {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: []string{"kafka:9092"},
		Topic:   "alerts",
		GroupID: "notification-group",
	})
	defer reader.Close()

	log.Println("Starting Kafka subscriber for topic 'alerts'...")

	for {
		message, err := reader.ReadMessage(context.Background())
		if err != nil {
			log.Printf("Error reading message: %v", err)
			continue
		}

		log.Printf("Received message - Key: %s, Value: %s", string(message.Key), string(message.Value))
	}
}
