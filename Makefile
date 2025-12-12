SHELL := /bin/bash
.PHONY: up down build logs bootstrap

up:
	docker compose up --build -d

down:
	docker compose down

build:
	docker compose build --parallel

logs:
	docker compose logs -f