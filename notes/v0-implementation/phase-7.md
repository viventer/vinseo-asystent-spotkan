# Etap 7: podsumowania i zadania

## Cel

Dodać publikowanie podsumowania spotkania, decyzji i zadań oraz chroniony
odczyt tych danych przez uczestników. Orkiestracja kolejki pozostaje zakresem
etapów 8 i 9.

## Wdrożone zmiany

- Dodano `SummariesRepository` dla tabel `summaries`, `decisions` i `tasks`.
- Dodano port `SummaryAdapter` i deterministyczny `FakeSummaryAdapter`.
- Dodano budowanie i walidację payloadu wysyłanego do modelu.
- Dodano walidację wyniku modelu przez Zod.
- Dodano `SummariesService` oraz endpointy:
  - `GET /meetings/{meetingId}/summary`,
  - `GET /meetings/{meetingId}/tasks`.
- Przeniesiono wspólny schemat `Speaker` do
  `shared/dto/speaker.dto.ts`.
- Dodano `TranscriptsService.getStoredSegments`, używany przez pipeline bez
  omijania granicy modułu.
- Dodano współdzielone helpery testów E2E dla aplikacji, fixture’u spotkania
  i odczytu HTTP.

## Payload i prywatność

Model otrzymuje wyłącznie segmenty, lokalne identyfikatory mówców
(`speaker_1`, `speaker_2`, ...) oraz role `unknown`. Payload jest ścisły i
odrzuca nazwy, e-maile, identyfikatory użytkowników oraz mapowania mówców.
Tekst segmentów nie jest przepisywany, ponieważ wypowiedziane dane należą do
treści transkrypcji, a nie do metadanych dodawanych przez aplikację.

Wynik modelu musi zawierać summary, decyzje i zadania w oczekiwanym kształcie.
Mówcy w decyzjach i zadaniach muszą występować w transkrypcji tego spotkania.
Niepoprawny wynik kończy się `InvalidSummaryResultError`: nic nie jest
publikowane, transkrypt pozostaje dostępny, a worker może ponowić próbę.

## Publikacja i idempotencja

Summary, decyzje i zadania są zapisywane w jednej transakcji PostgreSQL.
Drugie wywołanie zwraca istniejącą publikację, a równoległe wywołania obsługują
konflikt unikalności i odczytują zwycięski zapis. Dzięki temu PostgreSQL jest
źródłem prawdy, a Redis nie przechowuje stanu publikacji.

## Odczyt i autoryzacja

Oba endpointy najpierw sprawdzają `MeetingAccessService`, więc dostęp mają
wyłącznie uczestnicy. Organizator, który nie uczestniczył w spotkaniu, nie ma
dostępu. Brak opublikowanego summary daje `404 not_found`; po publikacji brak
zadań daje `200` z pustą listą. Identyfikatory mówców są zwracane bez mapowania,
z `displayName: null`, ponieważ speaker mapping nie należy do wersji zero.

## Testy i weryfikacja

Dodano testy adaptera, payloadu, serwisu, kontrolera oraz PostgreSQL E2E.
Sprawdzają walidację danych, ochronę danych wychodzących, publikację
transakcyjną, idempotencję, równoległość, ponowienie po błędnym wyniku,
autoryzację i kontrakt HTTP.

Przeszły:

- `tsc -p tsconfig.json --noEmit`,
- `oxlint --type-aware src/ test/`,
- testy jednostkowe,
- testy E2E z PostgreSQL.

Nie dodano migracji, ponieważ tabele i ograniczenia dla tego etapu były już
obecne. Aktualizacja `docs/api.md` opisuje `404` dla tasks przed publikacją
summary.

## Decyzje i konsekwencje

- Wybrano port adaptera zamiast bezpośredniego użycia modelu, aby provider nie
  przeniknął do logiki aplikacji.
- Wybrano ścisły payload i lokalne identyfikatory, aby ograniczyć dane
  przekazywane zewnętrznemu modelowi.
- Wybrano osobny błąd niepoprawnego wyniku, aby krok 9 mógł traktować go jako
  błąd możliwy do ponowienia, bez zapisywania częściowego wyniku.
- Wybrano `404` dla tasks przed publikacją, aby nie sugerować, że brak zadań
  oznacza poprawnie zakończone przetwarzanie.

## Poza zakresem

- endpoint uruchamiający processing,
- worker BullMQ i konfiguracja retry,
- prawdziwy model podsumowań,
- mapowanie mówców na osoby,
- wyszukiwanie, asystent i interfejs użytkownika.
