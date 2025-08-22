FROM golang:1.24-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

COPY . .

RUN go mod download

# build 2 binary
RUN go build -o publisher publisher.go
RUN go build -o subscriber subscriber.go
RUN go build -o server server.go

EXPOSE 8086

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8086/health || exit 1

CMD ["./server"]