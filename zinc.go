package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func test(w http.ResponseWriter, r *http.Request) {
	io.WriteString(w, "testing 123")
}

func main() {
	port := "8000"
	if os.Getenv("PORT") != "" {
		port = os.Getenv("PORT")
	}

	http.HandleFunc("/", test)
	http.ListenAndServe(fmt.Sprintf(":%s", port), nil)
}
