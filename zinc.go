package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"
)

const (
	msgBuf = 10
)

type Message struct {
	Text string
}

type Response map[string]interface{}

func (r Response) String() (s string) {
	b, err := json.Marshal(r)
	if err != nil {
		s = ""
		return
	}
	s = string(b)
	return
}

type Broker struct {
	subscribers map[chan []byte]bool
}

func (b *Broker) Subscribe() chan []byte {
	ch := make(chan []byte, msgBuf)
	b.subscribers[ch] = true
	return ch
}

func (b *Broker) Unsubscribe(ch chan []byte) {
	delete(b.subscribers, ch)
}

func (b *Broker) Publish(msg []byte) {
	for ch := range b.subscribers {
		ch <- msg
	}
}

func NewBroker() *Broker {
	return &Broker{make(map[chan []byte]bool)}
}

var msgBroker *Broker

func mockMessage() {
	for {
		time.Sleep(1000 * time.Millisecond)
		msgBroker.Publish([]byte(strconv.Itoa(rand.Intn(100))))
	}
}

func messageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.Header.Get("Content-Type")[:16] != "application/json" {
		http.Error(w, "Content-Type must be application/json", http.StatusNotAcceptable)
		return
	}

	var m Message
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	msgBroker.Publish([]byte(m.Text))

	if r.Header.Get("Accept") == "application/json" {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, Response{"success": true, "message": "OK"})
		return
	}

	fmt.Fprintln(w, "OK")
}

func timerEventSource(w http.ResponseWriter, r *http.Request) {
	f, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ch := msgBroker.Subscribe()
	defer msgBroker.Unsubscribe(ch)

	for {
		msg := <-ch
		fmt.Fprintf(w, "data: Message: %s\n\n", msg)
		f.Flush()
	}
}

func main() {
	msgBroker = NewBroker()

	port := "8000"
	if os.Getenv("PORT") != "" {
		port = os.Getenv("PORT")
	}

	http.HandleFunc("/update", messageHandler)
	http.HandleFunc("/events", timerEventSource)
	http.Handle("/", http.FileServer(http.Dir("static")))
	log.Printf("Starting server at %s:%s", "localhost", port)
	go mockMessage()
	err := http.ListenAndServe(fmt.Sprintf(":%s", port), nil)

	if err != nil {
		log.Fatal(err)
		panic(err)
	}
}
