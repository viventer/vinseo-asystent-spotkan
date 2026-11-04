# Etap 5: nagrania

## Cel

Dodać obsługę sygnału, że nagranie spotkania jest gotowe. W version zero nie
tworzymy jeszcze pliku, ścieżki, URL-a ani danych audio.

## Odpowiedzialności

- `RecordingSourceAdapter` to port dla źródła nagrań. Ukrywa szczegóły
  konkretnego dostawcy i pozwala później podmienić fake na Google Drive lub
  magazyn plików.
- `FakeRecordingSourceAdapter` zwraca stabilny identyfikator
  `fake-recording:<meetingId>`. Nie tworzy żadnego medium.
- `RecordingsService` koordynuje adapter, walidację odpowiedzi i zapis
  znacznika gotowości.
- `RecordingsRepository` wykonuje zapytania do tabeli `recordings`, dzięki
  czemu serwis nie zna szczegółów Drizzle.
- `RecordingsModule` wiąże te elementy. Nie jest jeszcze podłączony do API ani
  workera, bo orkiestracja powstanie w późniejszym etapie.

## Najważniejsze decyzje

- Zewnętrzny identyfikator jest stabilny per spotkanie, a nie globalny.
  Pozwala to zachować jedno nagranie dla każdego spotkania przy jednoczesnym
  ograniczeniu `unique(external_id)`.
- Wiersz w `recordings` jest jednocześnie wynikiem kroku i informacją, że krok
  został ukończony. Nie dodajemy osobnego statusu w Redisie.
- Zapis jest transakcyjny i idempotentny. Powtórzenie lub równoległe wykonanie
  nie tworzy duplikatów.
- Odpowiedź adaptera jest walidowana przed zapisem, aby do version zero nie
  przedostały się nieuzgodnione dane o plikach lub mediach.

Implementację potwierdzono testami jednostkowymi, testami integracyjnymi
PostgreSQL, lintem, sprawdzeniem typów i buildem NestJS.
