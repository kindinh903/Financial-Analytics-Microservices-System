FROM golang:1.24

WORKDIR /app

COPY . .

RUN go mod download

# build 2 binary
RUN go build -o publisher publisher.go
RUN go build -o subscriber subscriber.go

CMD ["./publisher"]