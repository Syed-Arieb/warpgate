package engine

type EventType string

const (
	EventQR           EventType = "qr"
	EventConnected    EventType = "connected"
	EventDisconnected EventType = "disconnected"
	EventLoggedOut    EventType = "logged_out"
	EventMessage      EventType = "message"
	EventReceipt      EventType = "receipt"
)

type Event struct {
	Type      EventType
	SessionID uint
	Data      interface{}
}

const QRBufferSize = 10
