#!/bin/bash
# Kafka startup script to prevent Cluster ID mismatches

echo "Starting Kafka with Cluster ID protection..."

# Always remove existing meta.properties to prevent cluster ID mismatches
if [ -f "/var/lib/kafka/data/meta.properties" ]; then
    echo "Removing existing meta.properties to prevent cluster ID mismatch..."
    rm -f /var/lib/kafka/data/meta.properties
fi

# Create directory if it doesn't exist
mkdir -p /var/lib/kafka/data

# Start Kafka
exec /etc/confluent/docker/run
