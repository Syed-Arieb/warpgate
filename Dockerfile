FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bin/api ./cmd/api

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
RUN adduser -D -H -h /app warpgate
WORKDIR /app
COPY --from=builder /app/bin/api .
USER warpgate
EXPOSE 8080
CMD ["./api"]
