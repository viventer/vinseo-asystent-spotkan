# Etap 9: proces workera

## Cel

Uruchomić osobny proces BullMQ, który pobiera zadania pipeline'u i deleguje
ich wykonanie do `ProcessingService`. Worker nie uruchamia serwera HTTP.

## Wdrożone zmiany

- Dodano `ProcessingProcessor` oparty na `WorkerHost`.
- Worker obsługuje kolejkę `meeting-processing`.
- Procesor:
  - przekazuje payload joba do `ProcessingService.runStep`,
  - nie zawiera reguł biznesowych ani zapytań do bazy,
  - waliduje i bezpiecznie loguje błędy jobów,
  - nie loguje treści transkryptu, adresów e-mail ani innych danych osobowych.
- `WorkerModule` importuje moduły potrzebne do wykonania pipeline'u:
  `ProcessingModule`, `QueueModule`, `DatabaseModule` i `ConfigModule`.
- `worker.ts` uruchamia kontekst Nest bez `listen()` i pozostawia proces aktywny.
  Zamknięcie aplikacji korzysta z graceful shutdown BullMQ.
- Dodano produkcyjny skrypt:

```bash
npm run start:worker:prod
```

## Retry, backoff i timeout

Konfiguracja kolejki zawiera:

- skończoną liczbę prób (`WORKER_JOB_ATTEMPTS`, domyślnie `5`),
- wykładniczy backoff (`WORKER_JOB_BACKOFF_MS`, domyślnie `1000` ms),
- przechowywanie ograniczonej liczby zakończonych i nieudanych jobów,
- timeout pojedynczego kroku (`WORKER_STEP_TIMEOUT_MS`, domyślnie `30000` ms).

Timeout jest zaimplementowany jako `Promise.race`. Oznacza to, że timeout
odrzuca bieżącą próbę, ale nie anuluje pracy wykonywanej już przez adapter lub
serwis. Jest to akceptowalne w wersji zero, ponieważ zapisy wyników są
idempotentne i chronione ograniczeniami unikalności PostgreSQL.

Worker używa również konfiguracji BullMQ dla współbieżności i obsługi
stalled jobs:

- `WORKER_CONCURRENCY` — domyślnie `1`,
- `WORKER_LOCK_DURATION_MS` — domyślnie `30000` ms,
- `WORKER_STALLED_INTERVAL_MS` — domyślnie `30000` ms,
- `maxStalledCount` — `1`.

Redis służy wyłącznie do dostarczania jobów. PostgreSQL pozostaje źródłem
prawdy o zakończeniu kroków.

## Konfiguracja środowiska

Rozdzielono konfigurację API i workera:

- API wymaga `PORT`.
- Worker wymaga `DATABASE_URL` i `REDIS_URL`, ale nie wymaga `PORT`.
- Oba procesy korzystają ze wspólnych ustawień retry i workera.

`backend/.env.example` zawiera lokalne wartości domyślne. Dla lokalnego
uruchomienia należy utworzyć ignorowany przez git plik:

```bash
cp backend/.env.example backend/.env
```

Skrypty `start`, `start:dev`, `start:debug` i `start:worker` przekazują
`.env` do Node przez `--env-file .env`. Skrypty produkcyjne używają
`--env-file-if-exists=.env`.

## Idempotencja i restart

Nie dodano deterministycznego `jobId`. Powtórny POST lub ponowne dostarczenie
joba może wykonać ten sam krok ponownie, ale serwisy feature'ów sprawdzają
istniejące wyniki i zapisują je idempotentnie.

Przetestowano:

- ponowne dostarczenie kroku,
- retry po niepoprawnym wyniku summary,
- restart workera podczas pierwszego kroku,
- zachowanie spotkania i wcześniejszych wyników po błędzie.

Po zakończeniu pipeline'u pozostaje dokładnie jeden marker nagrania,
transkrypcja, summary i zestaw zadań.

## Testy i weryfikacja

Dodano testy:

- konfiguracji środowiska,
- opcji kolejki,
- timeoutu,
- delegowania jobów przez procesor,
- bezpiecznego logowania błędów,
- integracji BullMQ, Redis i PostgreSQL.

Przeszły:

- `tsc -p tsconfig.json --noEmit`,
- `oxlint --type-aware src/ test/`,
- testy jednostkowe,
- testy E2E PostgreSQL,
- testy workera z Redis i PostgreSQL,
- `npm run build`,
- ręczny przebieg: `POST /meetings/{meetingId}/processing`, odczyt summary
  i tasks oraz ponowne uruchomienie tego samego spotkania.

## Decyzje i konsekwencje

- Wybrano `@nestjs/bullmq` i `WorkerHost`, aby worker korzystał z Nestowego
  mechanizmu dependency injection.
- Wybrano skończony, konfigurowalny retry zamiast nieskończonego ponawiania.
- Nie dodano `jobId`, ponieważ idempotencja wyników jest odpowiedzialnością
  PostgreSQL i serwisów feature'ów.
- Nie dodano `AbortSignal` do adapterów. Timeout nie przerywa pracy w tle,
  dlatego adaptery i zapisy muszą pozostać retry-safe.

## Poza zakresem

- Docker Compose dla API i workera,
- automatyczne migracje i seed przy uruchomieniu całego stosu,
- komenda `demo` eksportująca wyniki do Markdown,
- prawdziwe integracje z Google i modelami,
- anulowanie adapterów przez `AbortSignal`,
- status pipeline'u przechowywany w Redis.

Powyższe elementy należą do etapu 10 lub późniejszych wersji.
