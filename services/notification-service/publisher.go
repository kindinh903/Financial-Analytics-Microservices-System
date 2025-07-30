package main

import (
    "context"
    "github.com/segmentio/kafka-go"
    "log"
    "time"
)

func main() {
    writer := kafka.Writer{
        Addr:     kafka.TCP("kafka:9092"),
        Topic:    "alerts",
        Balancer: &kafka.LeastBytes{},
    }

    for i := 0; i < 5; i++ {
        err := writer.WriteMessages(context.Background(),
            kafka.Message{
                Key:   []byte("Key-A"),
                Value: []byte("This is alert number " + string(i)),
            },
        )
        if err != nil {
            log.Fatal("failed to write messages:", err)
        }
        time.Sleep(2 * time.Second)
    }

    writer.Close()
}
