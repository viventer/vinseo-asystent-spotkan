# Firmowy asystent spotkań (zadanie rekrutacyjne Vinseo)

Repozytorium zawiera obie części zadania:

- **Część A:** dokument decyzyjny w [part-a-doc.md](part-a-doc.md).
- **Część B:** szkielet backendu (NestJS, wersja zero) w katalogu [backend/](backend/). Przetwarza przykładowe spotkanie od sygnału „nagranie gotowe”, przez atrapę transkrypcji i atrapę streszczenia, do zapisanego streszczenia i zadań. Dostęp do wyników mają tylko uczestnicy spotkania.

Szczegółowe zachowanie wersji zero opisuje [docs/version-zero.md](docs/version-zero.md), kontrakt API [docs/api.md](docs/api.md), a model danych [docs/data-model.md](docs/data-model.md).

## 1. Jak uruchomić

Wymagania: Docker z Docker Compose. Porty `3000`, `5432` i `6379` muszą być wolne.

```bash
docker compose up --build
```

Komenda buduje obraz i uruchamia PostgreSQL, Redis, jednorazowy krok `init` (migracje Drizzle i idempotentny seed), API oraz osobny proces workera. Uruchomienie stacku nie przetwarza spotkania automatycznie.

W drugim terminalu przetwórz przykładowe spotkanie:

```bash
docker compose run --rm demo
```

Demo wysyła `POST /meetings/:meetingId/processing`, czeka na wynik, odczytuje transkrypt, streszczenie i zadania jako uczestnik przez API i zapisuje cztery pliki w `artifacts/example-meeting/`: `transcript.md`, `summary.md`, `decisions.md` i `tasks.md`. Katalog jest ignorowany przez Git. Ponowne uruchomienie demo nie tworzy duplikatów.

### Przepływ przetwarzania

```mermaid
flowchart TD
  seed[Seed: spotkanie i uczestnicy] --> start[POST processing]
  start --> ready[recording-ready: atrapa zwraca stabilne id]
  ready --> asr[transcribe: atrapa zapisuje segmenty]
  asr --> filter[Filtr danych wychodzących: bez imion i e-maili]
  filter --> summary[summarize: atrapa streszczenia]
  summary --> validate[Walidacja struktury Zod]
  validate -->|poprawny| publish[Jedno streszczenie i jeden zestaw zadań]
  validate -->|niepoprawny| hold[Nic nie jest publikowane, transkrypt zostaje]
  publish --> read[Odczyty: transkrypt, streszczenie, zadania]
  read --> access{Czy wywołujący jest uczestnikiem?}
  access -->|tak| ok[200]
  access -->|nie| denied[404 not_found]
```

### Ręczne sprawdzenie kontroli dostępu

Po przetworzeniu spotkania odczyty wymagają nagłówka `X-User-Id` (lokalny zamiennik logowania Google). Identyfikatory z seeda (`backend/src/database/local-seed.ts`):

| Rola | `X-User-Id` |
| --- | --- |
| organizator, nie uczestniczył | `11111111-1111-4111-8111-111111111111` |
| pracownik 1 (uczestnik) | `22222222-2222-4222-8222-222222222222` |
| pracownik 2 (uczestnik) | `33333333-3333-4333-8333-333333333333` |
| klient (uczestnik) | `44444444-4444-4444-8444-444444444444` |

Spotkanie przykładowe: `55555555-5555-4555-8555-555555555555`.

```bash
# uczestnik: 200
curl -i -H "X-User-Id: 22222222-2222-4222-8222-222222222222" \
  http://localhost:3000/meetings/55555555-5555-4555-8555-555555555555/summary

# organizator, który nie uczestniczył: 404 not_found
curl -i -H "X-User-Id: 11111111-1111-4111-8111-111111111111" \
  http://localhost:3000/meetings/55555555-5555-4555-8555-555555555555/summary
```

Odpowiedź 404 nie rozróżnia braku spotkania, braku dostępu i braku wyniku, żeby odczyt nie ujawniał istnienia spotkania.

### Testy

W katalogu `backend/` (`npm install`, a dla testów e2e także `cp .env.example .env`):

```bash
npm run lint
npm run test
npm run test:e2e
```

Testy e2e wymagają działających PostgreSQL i Redis (na przykład z `docker compose up postgres redis`) i używają osobnej bazy `vinseo_test` oraz osobnego prefiksu kolejki.

## 2. Co działa, co jest atrapą, czego nie zrobiłem

### Działa naprawdę

- **Model danych:** spotkania, uczestnicy, segmenty transkrypcji, streszczenia, decyzje i zadania w PostgreSQL (Drizzle, migracje wersjonowane w repozytorium). Uprawnieniem jest uczestnictwo w spotkaniu.
- **Pipeline:** `recording-ready` -> `transcribe` -> `summarize-and-publish` w BullMQ, z API i workerem jako osobnymi procesami.
- **Idempotencja i awarie:** PostgreSQL jest źródłem prawdy, a wynik kroku jest zapisywany w tej samej transakcji co znacznik jego ukończenia. Redis tylko dostarcza zadania (payload to `meetingId` i nazwa kroku). Powtórne dostarczenie lub restart workera nie tworzy duplikatów ani nie gubi spotkania. Retry, backoff i timeout kroku są jawnie skonfigurowane.
- **Walidacja streszczenia:** wynik ma ustaloną strukturę sprawdzaną przez Zod. Niepoprawny wynik (proza, brak pola, zły mówca, e-mail zamiast identyfikatora) nie jest publikowany, a transkrypt pozostaje czytelny.
- **Ochrona danych wychodzących:** payload dla streszczenia zawiera tylko segmenty, lokalne identyfikatory mówców i role. Filtr odrzuca imiona, e-maile i mapowania mówców na osoby. Ma testy.
- **Kontrola dostępu:** każdy odczyt sprawdza uczestnictwo po stronie serwera i domyślnie odmawia. Organizator, który nie uczestniczył, nie ma dostępu. Testy obejmują przypadki dozwolone i odmowne.
- **API:** `GET /health`, `POST /meetings/{meetingId}/processing` oraz trzy odczyty (transkrypt, streszczenie, zadania). Kontrakt: [docs/api.md](docs/api.md).
- **Uruchomienie:** dwie komendy Docker Compose opisane wyżej.

### Atrapy

- **Źródło nagrań:** fałszywy adapter zwraca stabilny identyfikator i status „gotowe”. Nie ma pliku, ścieżki ani audio.
- **Transkrypcja i streszczenie:** deterministyczne adaptery korzystają z jednego syntetycznego spotkania (`backend/fixtures/example-meeting.json`): rozmowa agencji z siecią kawiarni, 177 segmentów, 11 decyzji, 16 zadań. Dane nie zawierają prawdziwych osób.
- **Tożsamość:** nagłówek `X-User-Id` zamiast logowania Google. Reguła uczestnictwa pozostanie ta sama po podmianie.

### Czego nie zrobiłem i dlaczego

Przy ograniczonym czasie wybrałem wiarygodny pipeline, kontrolę dostępu i testy zamiast szerokiego, powierzchownego zakresu. Poniższe elementy są zaplanowane w [docs/implementation-plan.md](docs/implementation-plan.md).

| Brak w wersji zero | Powód | Kiedy |
| --- | --- | --- |
| Google Meet, Dysk, logowanie Google | Zadanie nie wymaga działającej integracji. Adapter źródła nagrań jest gotowym miejscem podmiany. | Etap 2 |
| Prawdziwa transkrypcja i model streszczeń | Zadanie dopuszcza atrapy. Porty adapterów są zdefiniowane. | Etap 1 |
| Mapowanie mówców na osoby | Wymaga interfejsu. Mówcy zostają lokalnymi identyfikatorami. | Etap 2 |
| Zgody, retencja, usuwanie | Budowane przy przygotowaniu do wdrożenia na całą firmę. Opisane w [docs/privacy.md](docs/privacy.md). | Etap 1 i 3 |
| Wyszukiwanie i asystent z cytowaniem źródeł | Zadanie dopuszcza pseudokod. Zasady autoryzacji są opisane w [notes/search.md](notes/search.md). | Etap 4 |
| Powiadomienia, lista spotkań, interfejs użytkownika | Poza zakresem zadania. | Etap 2 i 4 |
| Endpoint statusu pipeline'u | Poza zatwierdzonym zakresem. Demo traktuje `404` jako „wynik jeszcze nie opublikowany”. | Etap 1 |

### Znane ograniczenia

- Timeout kroku (`Promise.race`) odrzuca próbę, ale nie przerywa pracy w tle. Jest to akceptowalne, bo zapisy są idempotentne i chronione ograniczeniami unikalności.
- `POST /meetings/{meetingId}/processing` i `GET /health` nie sprawdzają uczestnictwa. To założenie wersji zero (lokalne środowisko, brak treści w odpowiedzi), opisane w [docs/api.md](docs/api.md).
- Dokumentacja wersji zero świadomie zastępuje dwa fragmenty planu etapów: źródło nagrań bez pliku audio oraz odroczenie zgód i retencji.
- Specyfikacja OpenAPI jest generowana w testach kontrolerów. Lokalny interfejs Swagger nie jest uruchamiany.

## 3. Jak używałem AI

AI (Cursor) było asystentem do researchu i szybkiej implementacji małych, zatwierdzonych kroków: zbierało dokumentację i ceny dostawców, zestawiało opcje z zaletami, wadami i ryzykami oraz pisało kod według planu etapów. Decyzje o stosie, zakresie, modelu dostępu i kolejności prac podejmowałem sam. Model pracował według reguł zapisanych w `AGENTS.md`: najpierw analiza i plan, potem moje potwierdzenie, dopiero potem mała implementacja i weryfikacja. Korygowałem go między innymi przy argumencie o trenowaniu na audio, przy ocenie „dane w UE” jako wniosku prawnego, przy niezweryfikowanych twierdzeniach o API Google Meet i przy zakresie przypisywania mówców. Pełny opis, tabelę korekt i przykładowe prompty zawiera [docs/ai-usage.md](docs/ai-usage.md).

## 4. Mapa dokumentacji

| Plik | Zawartość |
| --- | --- |
| [part-a-doc.md](part-a-doc.md) | Dokument części A. |
| [part-a-doc-structure.md](part-a-doc-structure.md) | Szkielet i zasady redakcyjne dokumentu części A. |
| [docs/zadanie.md](docs/zadanie.md) | Treść zadania. |
| [docs/version-zero.md](docs/version-zero.md) | Zachowanie wersji zero. |
| [docs/specification.md](docs/specification.md) | Historyjki użytkownika wersji zero. |
| [docs/v0-api-building-plan.md](docs/v0-api-building-plan.md) | Plan budowy backendu w 10 etapach. |
| [docs/api.md](docs/api.md) | Kontrakt API. |
| [docs/data-model.md](docs/data-model.md) | Model danych. |
| [docs/backend-structure.md](docs/backend-structure.md) | Struktura modułów backendu. |
| [docs/authorization.md](docs/authorization.md) | Zasady dostępu do spotkań. |
| [docs/privacy.md](docs/privacy.md) | Prywatność i dane wychodzące. |
| [docs/tech-stack.md](docs/tech-stack.md) | Zatwierdzony stos technologiczny. |
| [docs/environments.md](docs/environments.md) | Środowiska i testowanie bez prawdziwych danych. |
| [docs/transcription-workflow.md](docs/transcription-workflow.md) | Docelowy przepływ nagranie -> transkrypcja. |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Etapy wdrożenia od wersji zero do całej firmy. |
| [docs/ai-usage.md](docs/ai-usage.md) | Jak używałem AI i co poprawiłem po modelu. |
| [notes/](notes/) | Notatki z researchu, decyzji i implementacji (w tym `notes/v0-implementation/`). |
