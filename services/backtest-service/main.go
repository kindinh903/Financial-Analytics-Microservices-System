package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Shopify/sarama"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// PriceUpdate represents the structure of price update messages from Kafka
type PriceUpdate struct {
	Symbol    string  `json:"symbol"`
	Price     float64 `json:"price"`
	Timestamp int64   `json:"timestamp"`
	Volume    float64 `json:"volume"`
	Service   string  `json:"service"`
}

// BacktestService represents the backtest service
type BacktestService struct {
	consumer sarama.Consumer
	logger   *logrus.Logger
	stats    map[string]int
}

// NewBacktestService creates a new backtest service instance
func NewBacktestService() *BacktestService {
	return &BacktestService{
		logger: logrus.New(),
		stats:  make(map[string]int),
	}
}

// StartKafkaConsumer starts consuming messages from Kafka
func (bs *BacktestService) StartKafkaConsumer(brokers []string, topic string) error {
	config := sarama.NewConfig()
	config.Consumer.Return.Errors = true
	config.Consumer.Offsets.Initial = sarama.OffsetNewest

	consumer, err := sarama.NewConsumer(brokers, config)
	if err != nil {
		return fmt.Errorf("failed to create consumer: %v", err)
	}
	bs.consumer = consumer

	partitionConsumer, err := consumer.ConsumePartition(topic, 0, sarama.OffsetNewest)
	if err != nil {
		return fmt.Errorf("failed to create partition consumer: %v", err)
	}

	go func() {
		for {
			select {
			case msg := <-partitionConsumer.Messages():
				bs.handlePriceUpdate(msg.Value)
			case err := <-partitionConsumer.Errors():
				bs.logger.Errorf("Error from consumer: %v", err)
			}
		}
	}()

	bs.logger.Info("Kafka consumer started successfully")
	return nil
}

// handlePriceUpdate processes incoming price updates
func (bs *BacktestService) handlePriceUpdate(data []byte) {
	var priceUpdate PriceUpdate
	if err := json.Unmarshal(data, &priceUpdate); err != nil {
		bs.logger.Errorf("Failed to unmarshal price update: %v", err)
		return
	}

	// Increment stats for this symbol
	bs.stats[priceUpdate.Symbol]++

	// Log the price update
	bs.logger.WithFields(logrus.Fields{
		"symbol":    priceUpdate.Symbol,
		"price":     priceUpdate.Price,
		"timestamp": priceUpdate.Timestamp,
		"volume":    priceUpdate.Volume,
		"service":   priceUpdate.Service,
	}).Info("Received price update")

	// Here you can add your backtest logic
	// For now, we just log the message
}

// GetStats returns the current statistics
func (bs *BacktestService) GetStats() map[string]int {
	return bs.stats
}

// Close closes the Kafka consumer
func (bs *BacktestService) Close() error {
	if bs.consumer != nil {
		return bs.consumer.Close()
	}
	return nil
}

func main() {
	// Initialize backtest service
	backtestService := NewBacktestService()

	// Kafka configuration
	kafkaBrokers := []string{"kafka:9092"}
	kafkaTopic := "price-updates"

	// Start Kafka consumer
	if err := backtestService.StartKafkaConsumer(kafkaBrokers, kafkaTopic); err != nil {
		log.Fatalf("Failed to start Kafka consumer: %v", err)
	}

	// Setup HTTP server
	router := gin.Default()

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "OK",
			"service": "backtest-service",
		})
	})

	// Stats endpoint
	router.GET("/stats", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"stats": backtestService.GetStats(),
		})
	})

	// Start HTTP server
	go func() {
		if err := router.Run(":8082"); err != nil {
			log.Fatalf("Failed to start HTTP server: %v", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	// Graceful shutdown
	backtestService.logger.Info("Shutting down backtest service...")
	if err := backtestService.Close(); err != nil {
		backtestService.logger.Errorf("Error closing backtest service: %v", err)
	}
} 