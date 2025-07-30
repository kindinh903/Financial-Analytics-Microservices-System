package main

import (
    "context"
    "github.com/segmentio/kafka-go"
    "log"
)

func main() {
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
