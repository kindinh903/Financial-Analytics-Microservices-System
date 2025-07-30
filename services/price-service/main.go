package main

import (
	"fmt"
	"log"
	"net/http"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "OK")
}

func main() {
	http.HandleFunc("/health", healthHandler)
	log.Println("Price Service started on :8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
} 