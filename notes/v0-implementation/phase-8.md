# Etap 8: orkiestracja przetwarzania

## Cel

Dodać uruchamianie przetwarzania spotkania oraz serwis orkiestrujący kroki
pipeline'u:

```text
recording-ready -> transcribe -> summarize-and-publish
```

Endpoint nie czeka na zakończenie pipeline'u. Sprawdza spotkanie, dodaje
pierwszy job do BullMQ i zwraca `202 Accepted`.

## Wdrożone zmiany

- Dodano `MeetingsRepository.exists`, które sprawdza istnienie spotkania,
  wybierając wyłącznie jego `id`.
- Dodano `MeetingsService.assertMeetingExists` z walidacją UUID i błędem
  `not_found`.
- Dodano feature `processing`:
  - `ProcessingService`,
  - `ProcessingController`,
  - `ProcessingModule`.
- Dodano endpoint:

```http
POST /meetings/{meetingId}/processing
```

- Endpoint:
  - nie wymaga `X-User-Id`,
  - nie przyjmuje body,
  - zwraca `202` z pustym body,
  - zwraca `400` dla niepoprawnego UUID,
  - zwraca `404`, gdy spotkanie nie istnieje,
  - zwraca `500` dla nieoczekiwanej awarii.
- Podłączono `ProcessingModule` do `AppModule`.
- Dodano DTO `MeetingReadErrorDto` do dokumentowania błędów OpenAPI.
- Dodano `@nestjs/swagger` zgodne z NestJS 12.

## Przebieg kroków

`ProcessingService.start`:

1. Waliduje `meetingId`.
2. Sprawdza istnienie spotkania przez `MeetingsService`.
3. Dodaje job `{ meetingId, step: "recording-ready" }`.

`ProcessingService.runStep`:

- `recording-ready` wywołuje
  `RecordingsService.ensureRecordingReady`, a następnie dodaje krok
  `transcribe`.
- `transcribe` ponownie pobiera marker nagrania przez idempotentne
  `ensureRecordingReady`, przekazuje `externalId` do
  `TranscriptsService.ensureTranscriptStored`, a następnie dodaje krok
  `summarize-and-publish`.
- `summarize-and-publish` wywołuje
  `SummariesService.ensureSummaryPublished` i kończy pipeline.

Następny job jest dodawany dopiero po pomyślnym zakończeniu bieżącego serwisu.
Błędy, w tym `InvalidSummaryResultError`, są propagowane bez zmiany. Retry i
klasyfikacja błędów należą do etapu 9.

## Idempotencja i awarie

Nie użyto deterministycznego `jobId`. Powtórne wywołanie endpointu może dodać
kolejny job, ale wynik nie jest duplikowany, ponieważ serwisy nagrań,
transkrypcji i podsumowań zapisują dane idempotentnie w PostgreSQL.

Ponowne wykonanie kroku po awarii między zatwierdzeniem wyniku a dodaniem
następnego joba jest bezpieczne. Job może ponownie wykonać `ensure*`, odczytać
istniejący wynik i dodać kolejny krok.

PostgreSQL pozostaje źródłem prawdy o zakończeniu kroku. Redis przechowuje
wyłącznie dostarczenie jobów i nie przechowuje osobnego statusu pipeline'u.

## Testy i weryfikacja

Dodano testy sprawdzające:

- istnienie i brak spotkania,
- walidację UUID,
- kolejność kroków,
- dodawanie następnego joba dopiero po zakończeniu poprzedniego,
- brak kolejnego joba po kroku publikacji,
- propagowanie błędów,
- powtórne dostarczenie tego samego kroku,
- kontrakt HTTP endpointu,
- brak wymagania `X-User-Id`,
- obecność trasy i odpowiedzi błędów w OpenAPI.

Przeszły:

- `tsc --noEmit`,
- `oxlint --type-aware src/ test/`,
- `prettier --check`,
- pełny `vitest run` — 23 pliki i 177 testów.

## Decyzje i konsekwencje

- Sprawdzanie istnienia spotkania należy do modułu `meetings`, ponieważ ten
  moduł jest właścicielem tabel `meetings`.
- Orkiestrator korzysta wyłącznie z publicznych serwisów feature'ów i nie
  odwołuje się bezpośrednio do ich repozytoriów ani tabel.
- Wybrano ponowne, idempotentne `ensureRecordingReady` w kroku `transcribe`,
  zamiast dodawania osobnego odczytu nagrania.
- Nie dodano `jobId`, aby można było ponowić przetwarzanie po nieudanym
  podsumowaniu.
- OpenAPI dokumentuje kontrakt endpointu, ale endpoint nie ujawnia żadnych
  danych spotkania.

## Poza zakresem

- procesor BullMQ,
- bootstrap workera bez serwera HTTP,
- retry, backoff, timeout i obsługa failed jobs,
- testy integracyjne kolejki i pełnego pipeline'u,
- status przetwarzania,
- prawdziwi dostawcy nagrań, transkrypcji i podsumowań.

Powyższe elementy należą do etapu 9 lub 10.
