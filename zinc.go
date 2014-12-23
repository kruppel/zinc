package main

import (
	"io"
	"net/http"
)

func test(w http.ResponseWriter, r *http.Request) {
	io.WriteString(w, "testing 123")
}

func main() {
	http.HandleFunc("/", test)
	http.ListenAndServe(":8000", nil)
}
