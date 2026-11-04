# Etap 10: weryfikacja i lokalne uruchomienie

## Cel

Domknąć lokalne uruchamianie wersji zero oraz zweryfikować granice HTTP,
PostgreSQL, Redis i BullMQ. API i worker mają działać jako osobne, długo
żyjące procesy. Uruchomienie stacku nie przetwarza spotkania automatycznie.

## Docker Compose

Rozszerzono `docker-compose.yml` o kompletny lokalny stack:

- `postgres` z healthcheckiem i nazwanym wolumenem,
- `redis` z healthcheckiem,
- jednorazowy `init`, który czeka na zdrowie PostgreSQL i Redis, wykonuje
  migracje Drizzle oraz idempotentny seed,
- `api` z healthcheckiem `GET /health`,
- osobny `worker` BullMQ bez serwera HTTP,
- `demo` uruchamiane wyłącznie przez profil `demo`.

Dodano `backend/Dockerfile` wieloetapowy. Obraz buduje aplikację NestJS,
instaluje zależności produkcyjne w warstwie runtime i uruchamia procesy jako
użytkownik nieuprzywilejowany. `backend/.dockerignore` ogranicza kontekst
budowania.

Dodano `backend/src/database/migrate-cli.ts`, który uruchamia migracje przez
Drizzle API. Migracje i seed są wykonywane w `init`, a API i worker nie
zmieniają schematu przy starcie.

Podstawowa komenda:

```bash
docker compose up --build
```

Po jej wykonaniu API, worker, PostgreSQL i Redis pozostają uruchomione, ale
wyniki spotkania nie istnieją jeszcze w bazie.

## Izolacja testów

Testy integracyjne używają osobnej bazy `vinseo_test`, tworzonej przez
`docker/postgres/init-test-db.sql`. Używają również osobnego prefiksu kolejki
Redis (`vinseo-e2e` lub prefiksu testu pipeline'u).

Testy e2e uruchamiają się sekwencyjnie, ponieważ korzystają ze wspólnego
lokalnego PostgreSQL i Redis. Fixture'y spotkań mają osobne identyfikatory, aby
nie kolidować z przygotowanym spotkaniem demo.

## Komenda demo

```bash
docker compose run --rm demo
```

Demo korzysta wyłącznie z API:

1. wysyła `POST /meetings/:meetingId/processing`,
2. odczytuje jako uczestnik transkrypt, summary i tasks,
3. traktuje `404` jako informację, że pipeline jeszcze nie opublikował wyniku,
4. czeka do skonfigurowanego limitu czasu,
5. waliduje odpowiedzi istniejącymi schematami Zod,
6. zapisuje cztery pliki Markdown.

Demo nie czyta bazy bezpośrednio i nie omija `MeetingAccessService`.

Wyniki trafiają do:

```text
artifacts/example-meeting/transcript.md
artifacts/example-meeting/summary.md
artifacts/example-meeting/decisions.md
artifacts/example-meeting/tasks.md
```

Katalog `artifacts/example-meeting/` jest ignorowany przez Git. Demo radzi
sobie także z brakującym katalogiem bind mounta: gdy Docker utworzy go jako
root, kontener nadaje katalogowi własność użytkownika hosta (`DEMO_UID`,
`DEMO_GID`) i dopiero potem zapisuje pliki.

## Fixture długiego spotkania

Początkowy fake transkrypt był zbyt krótki do demonstracji. Dodano
`backend/fixtures/example-meeting.json` jako jedno źródło syntetycznego
spotkania agencji marketingowej z klientem — siecią kawiarni Ziarnisty.

Fixture zawiera:

- rozmowę trzech lokalnych mówców (`speaker_1`, `speaker_2`, `speaker_3`),
- wyniki października,
- kampanię zimową „Ciepły Początek”,
- budżet, kreację, influencerów, landing page, newsletter i raportowanie,
- ryzyka i końcowe ustalenia,
- transkrypt o długości około 19 minut,
- 177 segmentów,
- 11 decyzji,
- 16 zadań z terminami.

`backend/src/shared/fixtures/example-meeting-fixture.ts` odczytuje i waliduje
plik źródłowy. Fake adapter transkrypcji korzysta z części `transcript`, a fake
adapter summary z części `summary`. Każdy adapter dodatkowo waliduje dane
schematem własnego portu. Fixture jest kopiowany do obrazu Docker.

Summary, decyzje i zadania są przygotowanymi, deterministycznymi wynikami
odpowiadającymi treści rozmowy. Nie ma rzeczywistego modelu ani rzeczywistej
transkrypcji. W danych nie ma adresów e-mail, nazw użytkowników ani mapowania
lokalnych identyfikatorów mówców na osoby.

## Testy

Dodano test pełnej ścieżki HTTP, PostgreSQL i BullMQ:

```text
POST processing
  -> recording-ready
  -> transcribe
  -> summarize-and-publish
  -> GET transcript, summary, tasks
```

Test obejmuje pustą odpowiedź `202`, brak spotkania, uczestników,
organizatora-nieuczestnika, powtórne uruchomienie oraz brak duplikatów.

Testy adapterów sprawdzają również:

- długość i czas trwania długiego spotkania,
- trzy lokalne identyfikatory mówców,
- kolejność i brak nakładających się segmentów,
- zgodność decyzji i zadań z mówcami transkryptu,
- niezależną kopię wyników przy kolejnym odczycie,
- brak nazw, e-maili i mapowania osób.

Przeszły:

- `tsc --noEmit`,
- `oxlint --type-aware src/ test/`,
- pełny `vitest run` — 31 plików i 219 testów,
- testy e2e — 6 plików i 38 testów,
- `docker compose up --build` z czystą bazą,
- dwukrotne `docker compose run --rm demo`,
- restart workera i ponowne uruchomienie demo.

Po czystym uruchomieniu i przetworzeniu w bazie znaleziono:

- 1 marker nagrania,
- 177 segmentów transkryptu,
- 1 summary,
- 11 decyzji,
- 16 zadań.

Drugie uruchomienie demo zachowało te same liczby i identyczne pliki Markdown.
Odczyt jako organizator, który nie uczestniczył w spotkaniu, zwrócił `404
not_found`, a odczyt jako uczestnik zwrócił `200`.

## Decyzje i konsekwencje

- Demo korzysta z HTTP, a nie z bezpośredniego dostępu do PostgreSQL. Dzięki
  temu sprawdza rzeczywistą ścieżkę API i autoryzację.
- Testy e2e mają osobną bazę `vinseo_test`, aby nie mieszać danych testowych z
  lokalnym przykładem.
- Wyniki są deterministyczne i przechowywane w jednym fixture, żeby transkrypt,
  decyzje i zadania pozostały spójne.
- `artifacts/example-meeting/` nie jest commitowany, ponieważ jest wynikiem
  lokalnego uruchomienia demo.
- Nie dodano endpointu statusu pipeline'u. Demo wykorzystuje istniejące odczyty
  i interpretuje `404` jako brak opublikowanego wyniku.

## Poza zakresem

- prawdziwe nagranie audio lub wideo,
- prawdziwy provider transkrypcji,
- prawdziwy model podsumowujący,
- Google Meet, Google Drive i Google Login,
- status pipeline'u,
- UI, search i assistant,
- produkcyjne sekrety i dane osobowe.
