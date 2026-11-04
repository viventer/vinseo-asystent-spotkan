# Etap 2: PostgreSQL i Drizzle

## Cel

Podłączyć PostgreSQL jako źródło stanu i zapisać model danych version zero,
łącznie z lokalnym spotkaniem przykładowym.

## Wdrożone zmiany

- Dodano klienta Drizzle na sterowniku `pg`, bez obiektu schematu i bez
  `relations()`. Zapytania idą przez query builder.
- Dodano `DatabaseService` i `runInTransaction`. Transakcja jest miejscem, w
  którym wynik kroku i ślad jego ukończenia zapiszą się razem.
- Tabele leżą w `entities/*.table.ts` poszczególnych funkcji. Drizzle Kit
  zbiera je globem, bez wspólnego pliku schematu.
- Pierwsza migracja tworzy użytkowników, spotkania, uczestników, nagrania,
  segmenty, podsumowania, decyzje i zadania oraz ograniczenia z modelu danych.
- Seed jest idempotentny i trzyma stałe UUID. Zapisuje organizatora, dwóch
  pracowników, jednego klienta i jedno spotkanie. Organizator nie jest
  uczestnikiem.
- Po wdrożeniu schematu decyzje i zadania przeniesiono na spotkanie. Migracje
  `0001` i `0002` nie nadpisują już wykonanej migracji początkowej.

## Decyzje

- Sterownik `pg` jest oficjalną ścieżką Drizzle dla PostgreSQL. Pula łączy się
  leniwie, więc samo jej utworzenie nie odpytuje bazy i nie psuje `GET /health`.
- `ON DELETE RESTRICT` chroni historię spotkania przed usunięciem użytkownika
  albo podsumowania, które nadal jest potrzebne.
- Ograniczenia `CHECK` nie używają podzapytań, bo PostgreSQL ich tam nie
  dopuszcza. Niepuste elementy `speaker_ids` sprawdza `array_position`.
- Uczestnik i speaker to różne pojęcia. Uczestnictwo decyduje o dostępie.
  `speaker_id` jest lokalną etykietą transkrypcji, na przykład `speaker_1`.
  W version zero nie ma mapowania osoby na speakera. Później wystarczy osobna
  tabela przypisań `(meeting_id, speaker_id) -> user_id`, bez zmiany segmentów.
- Konto Google też nie zastąpi `users.id`. Późniejsza tabela tożsamości powiąże
  stabilne `sub` z Google z istniejącym użytkownikiem. Relacje spotkań zostaną
  na wewnętrznym UUID, bo adres e-mail może się zmienić.
- Decyzja i zadanie należą do spotkania. `summary_id` jest opcjonalne i oznacza
  tylko, że rekord powstał z podsumowania. Para `(summary_id, meeting_id)` musi
  wskazywać podsumowanie tego samego spotkania, więc nie da się podpiąć wyniku
  jednego spotkania do innego. Kolejność jest unikalna w ramach spotkania.
- Odczyt zadań nie wymaga opublikowanego podsumowania i przy braku rekordów
  zwraca pustą listę. Odczyt podsumowania nadal wymaga wiersza podsumowania,
  ale decyzje ładuje po spotkaniu, nie po `summary_id`.

## Weryfikacja

Migracje weszły na czystą bazę z Docker Compose. Dwukrotny seed zostawił
4 użytkowników, 1 spotkanie i 3 uczestników; organizator nie ma roli uczestnika.
Baza odrzuca pusty identyfikator speakera, czas końca wcześniejszy niż początek
oraz decyzję albo zadanie wskazujące podsumowanie innego spotkania. Rekord bez
`summary_id` przechodzi.
