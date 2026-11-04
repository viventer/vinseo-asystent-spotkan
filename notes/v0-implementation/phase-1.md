# Etap 1: fundament projektu i runtime

## Cel

Przygotować podstawę API i workera dla version zero, bez implementowania
klienta PostgreSQL ani kolejki.

## Wdrożone zmiany

- Potwierdzono osobne entrypointy NestJS:
  - `backend/src/main.ts` uruchamia API HTTP.
  - `backend/src/worker.ts` tworzy kontekst NestJS bez serwera HTTP i kończy
    proces.
- Dodano osobne moduły root: `AppModule` i `WorkerModule`.
- Dodano walidację konfiguracji środowiska przez Zod dla wymaganych zmiennych:
  `PORT`, `DATABASE_URL` i `REDIS_URL`.
- Dodano `backend/.env.example` z lokalnymi wartościami.
- Dodano Docker Compose dla PostgreSQL i Redis, z przypiętymi głównymi
  wersjami obrazów oraz healthcheckami.
- Dodano `GET /health`, który nie korzysta z PostgreSQL ani Redisa.
- Dodano podstawowy `ApplicationError` i globalny filtr mapujący błędy na
  stabilne kody z API: `invalid_request`, `unauthenticated`, `not_found` i
  `internal_error`.
- Dodano `ParseUuidPipe` do walidacji identyfikatorów UUID.
- Dodano testy konfiguracji, filtra błędów, pipe'a UUID i health service.

## Decyzje

- Przy starcie wymagane są wszystkie trzy zmienne środowiskowe, nawet jeśli
  healthcheck nie odpytuje zależności.
- Worker w tym etapie tylko sprawdza możliwość zbudowania kontekstu NestJS.
  Obsługa BullMQ należy do późniejszego etapu.
- Użyto PostgreSQL 18 i Redis 8 jako aktualnych stabilnych głównych wersji.
- Compose uruchamia wyłącznie PostgreSQL i Redis; API oraz worker pozostają
  osobnymi procesami uruchamianymi z katalogu `backend`.
- Nie dodano jeszcze klientów bazy, schematu Drizzle, kolejki ani endpointów
  spotkań.

## Weryfikacja

Testy Vitest, lint i build przeszły pomyślnie. Sprawdzono również, że API
zwraca `200 {"status":"ok"}` bez połączenia z bazą i Redisem, a brak wymaganej
zmiennej środowiskowej zatrzymuje proces z błędem konfiguracji.
