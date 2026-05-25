.PHONY: dev build build-linux migrate lint test clean prod-up prod-down load-test

dev:
	@air

build:
	go build -o bin/api ./cmd/api

build-linux:
ifeq ($(OS),Windows_NT)
	set "GOOS=linux" && set "GOARCH=amd64" && go build -o bin\warpgate-linux ./cmd/api
else
	GOOS=linux GOARCH=amd64 go build -o bin/warpgate-linux ./cmd/api
endif

migrate:
	go run ./cmd/api -migrate

lint:
	golangci-lint run ./...

test:
	go test -v -race -count=1 ./...

clean:
	rm -rf bin/

prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

load-test:
	k6 run tests/load/login.js

load-test-messaging:
	k6 run tests/load/messaging.js
