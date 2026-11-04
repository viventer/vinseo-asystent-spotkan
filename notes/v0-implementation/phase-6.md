# Etap 6: transkrypcje

## Cel

Dodać przechowywanie segmentów transkrypcji oraz chroniony odczyt
transkrypcji przez uczestników spotkania. Etap realizuje wymagania kroku 6
z `docs/v0-api-building-plan.md`: deterministyczny fake adapter, segmenty
przypisane do lokalnych identyfikatorów mówców, atomowy i idempotentny zapis
oraz endpoint `GET /meetings/:meetingId/transcript`.

Orkiestracja kolejki i wywołanie tego kroku przez workera pozostają zakresem
kroków 8 i 9.

## Wdrożone zmiany

- Dodano port `TranscriptionAdapter` i token `TRANSCRIPTION_ADAPTER`.
- Dodano `FakeTranscriptionAdapter`, który zwraca 10 stabilnych segmentów
  od trzech mówców: `speaker_1`, `speaker_2` i `speaker_3`.
- Dodano walidację wyniku adaptera przez Zod.
- Dodano `TranscriptsRepository` z odczytem, sprawdzeniem istnienia i
  wielowierszowym zapisem segmentów.
- Dodano `TranscriptsService` do zapisu oraz odczytu transkrypcji.
- Dodano `GET /meetings/:meetingId/transcript`.
- Dodano DTO odpowiedzi transkrypcji i serializację przez `nestjs-zod`.
- Podłączono `MeetingsModule` i `TranscriptsModule` do `AppModule`.
- Wydzielono obsługę kodów błędów PostgreSQL do
  `shared/errors/postgres-error.ts`; korzystają z niej recordings i transcripts.
- Dodano testy jednostkowe, HTTP i integracyjne z PostgreSQL.

## Adapter transkrypcji

Port znajduje się w
`backend/src/transcripts/adapters/transcription.adapter.ts`. Adapter otrzymuje
identyfikator spotkania oraz `recordingExternalId` i zwraca `unknown`.
Zewnętrzny wynik jest celowo nieufny: zanim trafi do domeny, przechodzi
`transcriptionResultSchema`.

Każdy segment musi mieć:

- niepusty `speakerId`,
- nieujemne `startMs` i `endMs`,
- `endMs >= startMs`,
- niepusty tekst.

Schemat jest ścisły, więc dodatkowe pola, takie jak imię, e-mail, plik,
ścieżka lub URL, są odrzucane.

Fake adapter nie tworzy plików audio ani nie używa prawdziwego modelu ASR.
Zwraca stałe dane testowe po polsku. Identyfikatory `speaker_1`–`speaker_3`
opisują etykiety lokalne dla spotkania, a nie użytkowników systemu.

## Zapis segmentów

`TranscriptsService.ensureTranscriptStored`:

1. waliduje `meetingId` i `recordingExternalId`,
2. sprawdza, czy spotkanie ma już segmenty,
3. pomija adapter i zapis, jeśli transkrypt istnieje,
4. wywołuje adapter i waliduje jego wynik,
5. nadaje segmentom pozycje od `0`,
6. zapisuje wszystkie segmenty w jednej transakcji.

Drugie sprawdzenie istnienia segmentów wykonywane jest wewnątrz transakcji.
Chroni to przed równoległym przetwarzaniem tego samego spotkania.

Tabela `transcript_segments` wymusza:

- klucz główny segmentu,
- relację do `meetings`,
- unikalność `(meeting_id, position)`,
- nieujemną pozycję,
- niepusty identyfikator mówcy,
- poprawny zakres czasowy.

Jeżeli równoległy zapis przegra na konflikcie `23505`, serwis odczytuje
segmenty zapisane przez zwycięską transakcję. Błąd klucza obcego `23503`
jest mapowany na `not_found`.

Transkrypcja nie może być częściowa, ponieważ wielowierszowy INSERT jest
wykonywany w ramach jednej transakcji.

## Odczyt i autoryzacja

Endpoint:

```http
GET /meetings/{meetingId}/transcript
X-User-Id: <uuid>
```

Kontroler pozostaje cienki: waliduje parametr ścieżki i nagłówek, a następnie
przekazuje `MeetingReadRequest` do serwisu.

`TranscriptsService.getTranscript` najpierw wywołuje
`MeetingAccessService.getParticipantRole`, a dopiero później odczytuje
segmenty. Dostęp mają wyłącznie użytkownicy z wierszem w
`meeting_participants`.

Odmowa jest zwracana jako `not_found` dla:

- nieistniejącego spotkania,
- użytkownika spoza spotkania,
- nieznanego użytkownika,
- organizatora, który nie uczestniczył,
- uczestnika, gdy transkrypcja nie została jeszcze zapisana.

Dzięki temu endpoint nie ujawnia, czy spotkanie istnieje osobie
nieuprawnionej. Brak nagłówka `X-User-Id` daje `unauthenticated`, a błędny
UUID w ścieżce daje `invalid_request`.

## Format odpowiedzi

Odpowiedź ma kształt:

```json
{
  "segments": [
    {
      "speaker": {
        "speakerId": "speaker_1",
        "displayName": null
      },
      "startMs": 0,
      "endMs": 4200,
      "text": "Zaczynamy przegląd statusu wdrożenia."
    }
  ]
}
```

`displayName` jest zawsze `null`. Mapowanie lokalnego identyfikatora mówcy na
uczestnika spotkania nie jest częścią wersji zero.

`TranscriptResponseDto` opisuje odpowiedź przez Zod, a
`ZodSerializerInterceptor` sprawdza ją przed wysłaniem. Niepoprawny wynik
odczytu jest mapowany na `internal_error`.

## Warstwy i zależności

Moduł ma następujący kierunek zależności:

```text
controller -> TranscriptsService -> TranscriptsRepository -> Drizzle/PostgreSQL
                         |
                         -> MeetingAccessService
                         -> TranscriptionAdapter
```

`TranscriptsModule` importuje `DatabaseModule` i `MeetingsModule` oraz
eksportuje `TranscriptsService`. Nie importuje `RecordingsModule`, ponieważ
`recordingExternalId` będzie przekazany przez przyszłą orkiestrację
przetwarzania.

## Testy

Dodano testy jednostkowe sprawdzające:

- deterministyczność fake adaptera,
- dokładnie 10 segmentów i trzy lokalne identyfikatory mówców,
- odrzucenie niepoprawnych wyników adaptera,
- pominięcie adaptera dla istniejącego transkryptu,
- nadawanie pozycji segmentom,
- zapis w transakcji,
- obsługę konfliktu równoległego zapisu,
- obsługę błędów PostgreSQL,
- `displayName: null`,
- odmowę odczytu osobom nieuprawnionym,
- kolejność błędów `invalid_request` i `unauthenticated`.

Test integracyjny PostgreSQL sprawdza:

- zapis 10 segmentów,
- powtórne wywołanie bez duplikatów,
- dwa równoległe wywołania bez duplikatów,
- dostęp pracowników i klienta,
- odmowę organizatora, nieznanego użytkownika i zmienionego identyfikatora
  spotkania,
- odczyt przed zapisaniem transkrypcji,
- odpowiedzi 400 i 401.

## Weryfikacja

Przeszły:

- `oxlint --type-aware src/ test/`,
- `tsc -p tsconfig.json --noEmit`,
- `nest build`,
- testy jednostkowe: 92 testy,
- testy integracyjne transkrypcji: 10 testów,
- wcześniejsze testy integracyjne recordings i meeting access: 11 testów.

## Decyzje i konsekwencje

- Wybrano port adaptera zamiast bezpośredniego użycia dostawcy ASR, aby
  późniejszy AssemblyAI lub inny provider nie przeniknął do logiki aplikacji.
- Wynik adaptera jest walidowany przed zapisem, ponieważ jest granicą danych
  zewnętrznych.
- Wybrano transakcyjny zapis wszystkich segmentów, aby nie publikować
  częściowej transkrypcji.
- Idempotencja opiera się na danych w PostgreSQL, nie na Redisie.
- `MeetingAccessService` jest sprawdzany przed odczytem treści i pozostaje
  centralnym miejscem reguły uczestnictwa.
- `nestjs-zod` 5.5.0 nie deklaruje jeszcze peer dependency dla NestJS 12,
  dlatego backend używa `legacy-peer-deps=true` w `backend/.npmrc`.
- Swagger/OpenAPI nie został jeszcze skonfigurowany; pozostaje zakresem
  kroku 10.

## Poza zakresem

- prawdziwy plik audio lub wideo,
- Google Meet i Google Drive,
- prawdziwy dostawca transkrypcji,
- diarization i mapowanie mówców na osoby,
- endpoint uruchamiający processing,
- worker BullMQ i automatyczne przejście z `recording-ready` do `transcribe`,
- wyszukiwanie i asystent.
