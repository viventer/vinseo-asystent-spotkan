# Etap 4: użytkownicy i spotkania

## Cel

Dodać warstwę dostępu do użytkowników i spotkań oraz przygotować centralny
mechanizm sprawdzania, czy użytkownik uczestniczył w spotkaniu. Etap realizuje
zasadę deny-by-default z `docs/authorization.md`: znajomość identyfikatora
spotkania, bycie jego organizatorem albo bycie pracownikiem nie daje dostępu
bez odpowiedniego wiersza w `meeting_participants`.

Etap nie dodaje jeszcze endpointów odczytu transkrypcji, streszczeń ani zadań.
Moduły będą podłączone do `app.module.ts` w kroku 6, razem z pierwszymi
kontrolerami HTTP.

## Wdrożone zmiany

- Dodano `UsersRepository`, `UsersService` i `UsersModule`.
- Dodano `MeetingsRepository`, `MeetingAccessService` i `MeetingsModule`.
- Dodano typowany schemat `meetingReadRequestSchema` dla pary:
  `meetingId` oraz `callerUserId`.
- Dodano dekorator parametru `@CallerUserId()` oraz walidujący go
  `CallerUserIdPipe`.
- Dodano testy jednostkowe i integracyjne z PostgreSQL.
- Zaktualizowano `docs/backend-structure.md`, aby opisywał dekorator jako
  lokalny zastępnik tożsamości Google.

## UsersRepository i UsersService

`UsersRepository` jest jedynym miejscem w module users, które wykonuje zapytanie
Drizzle do tabeli `users`. Metoda `findById`:

1. przyjmuje identyfikator użytkownika,
2. wybiera tylko potrzebne kolumny: `id`, `display_name` i `email`,
3. dodaje warunek `users.id = id`,
4. zwraca pierwszy pasujący rekord albo `null`.

Repozytorium nie zawiera reguł biznesowych. Dzięki temu nie decyduje samo, czy
użytkownik może czytać dane spotkania.

`UsersService` jest warstwą aplikacyjną nad repozytorium. Przed wykonaniem
zapytania sprawdza identyfikator przez Zod. Niepoprawny UUID kończy się
`ApplicationError('invalid_request')`, a poprawny, lecz nieistniejący UUID
zwraca `null`.

Repozytorium przyjmuje opcjonalny `DatabaseExecutor`. Domyślnie używa głównego
połączenia, ale może też wykonać odczyt na obiekcie transakcji przekazanym przez
inny przypadek użycia. Pozwala to używać tej warstwy zarówno w zwykłym odczycie,
jak i w większej transakcji bez dostępu do bazy z poziomu serwisu.

## MeetingsRepository

`MeetingsRepository` wykonuje zapytanie do tabeli `meeting_participants`:

```text
SELECT role
FROM meeting_participants
WHERE meeting_id = :meetingId
  AND user_id = :callerUserId
LIMIT 1
```

Zwraca wyłącznie rolę `employee` albo `client`. Nie pobiera nazw użytkowników,
adresów e-mail ani danych spotkania. Nie sprawdza organizatora jako wyjątku,
ponieważ organizator-nieuczestnik ma być odrzucony. Liczy się wyłącznie
istnienie relacji uczestnictwa.

To zapytanie zabezpiecza również przed IDOR. Sam `meetingId` nie jest
uprawnieniem: identyfikator spotkania i identyfikator wywołującego są używane
razem w warunku zapytania.

## MeetingAccessService

`MeetingAccessService` jest jedynym miejscem, które udostępnia regułę dostępu
do spotkania innym modułom. Metoda `getParticipantRole`:

1. waliduje `meetingId` i `callerUserId` jako UUID,
2. pyta `MeetingsRepository` o relację uczestnictwa,
3. zwraca rolę uczestnika, jeśli relacja istnieje,
4. rzuca `not_found`, gdy relacji nie ma.

Jednolity błąd `not_found` jest zamierzony. Nie rozróżnia:

- nieistniejącego spotkania,
- użytkownika spoza spotkania,
- nieznanego użytkownika,
- organizatora, który nie uczestniczył w spotkaniu.

Dzięki temu API nie potwierdza osobie nieuprawnionej, że dane spotkanie
istnieje. Walidacja niepoprawnego UUID jest osobnym błędem
`invalid_request`.

## Dekorator `@CallerUserId()`

`X-User-Id` jest lokalnym zastępnikiem przyszłej tożsamości Google Workspace.
Dekorator znajduje się w
`backend/src/shared/decorators/caller-user-id.decorator.ts`.

Technicznie składa się z dwóch elementów:

- fabryki utworzonej przez NestJS `createParamDecorator`, która pobiera
  `request.headers['x-user-id']` z bieżącego żądania,
- `CallerUserIdPipe`, który waliduje pobraną wartość przez `z.uuid()`.

Dekorator nie podejmuje decyzji o dostępie do spotkania. Jego zadaniem jest
tylko przekształcenie nagłówka transportowego w zwalidowany identyfikator
użytkownika. Uczestnictwo sprawdza później `MeetingAccessService`.

Brak nagłówka, tablica wartości nagłówka albo wartość niebędąca UUID kończy się
`ApplicationError('unauthenticated')` i statusem HTTP 401.

W kontrolerze parametr powinien być deklarowany w tej kolejności:

```typescript
read(
  @CallerUserId() callerUserId: string,
  @Param('meetingId', ParseUuidPipe) meetingId: string,
) {}
```

NestJS zapisuje metadane parametrów od prawej do lewej i wykonuje ich pipe’y w
tej kolejności. Umieszczenie `@Param(..., ParseUuidPipe)` po prawej stronie
sprawia, że niepoprawny identyfikator ścieżki daje `invalid_request` (400)
przed sprawdzeniem nagłówka. Jest to zgodne z kontraktem `docs/api.md`.

Później dekorator zostanie zastąpiony przez prawdziwe uwierzytelnianie Google
Workspace. `MeetingAccessService` pozostanie bez zmian, ponieważ nadal będzie
otrzymywał stabilny identyfikator użytkownika.

## Moduły i zależności

`UsersModule` eksportuje `UsersService`, a `MeetingsModule` eksportuje
`MeetingAccessService`. Repozytoria są providerami wewnętrznymi modułów.
Moduły korzystają z `DatabaseModule`, ale nie są jeszcze importowane przez
`AppModule`; nastąpi to razem z kontrolerami w kroku 6.

Warstwy mają kierunek:

```text
controller -> service -> repository -> Drizzle/PostgreSQL
```

Kontrolery i przyszłe moduły nie powinny wstrzykiwać repozytoriów ani wykonywać
zapytań bezpośrednio.

## Testy

Dodano testy jednostkowe sprawdzające:

- znalezienie użytkownika i brak użytkownika,
- odrzucenie niepoprawnego UUID użytkownika,
- role `employee` i `client`,
- odmowę dostępu nieuczestnikowi,
- odmowę organizatorowi, który nie uczestniczył,
- odmowę nieznanemu użytkownikowi,
- odmowę po zmianie `meetingId`,
- przekazywanie transakcyjnego executora do repozytorium,
- brakujący, niepoprawny i powtórzony nagłówek `X-User-Id`.

Test dekoratora uruchamia minimalny kontroler NestJS i potwierdza kolejność
odpowiedzi 400/401 dla rzeczywistych żądań HTTP.

Test integracyjny:

- uruchamia migracje na PostgreSQL,
- wykonuje lokalny seed,
- sprawdza rzeczywiste odczyty użytkowników i relacji uczestnictwa,
- potwierdza dostęp pracowników i klienta,
- potwierdza odmowę organizatora, nieznanego użytkownika i zmienionego
  identyfikatora spotkania.

## Weryfikacja

Przeszły:

- `oxlint --type-aware src/ test/`,
- `tsc -p tsconfig.json --noEmit`,
- `nest build`,
- testy jednostkowe: 39 testów,
- test integracyjny PostgreSQL: 8 testów.

## Decyzje i konsekwencje

- Wybrano `@CallerUserId()` zamiast guarda, ponieważ kontrakt API wymaga
  rozróżnienia błędu niepoprawnego `meetingId` od braku uwierzytelnienia.
- Kontrola uczestnictwa zwraca rolę, chociaż w obecnym v0 nie jest jeszcze
  używana przez endpoint. Dzięki temu przyszłe funkcje mogą wykorzystać rolę
  bez ponownego projektowania repozytorium.
- Nie dodano osobnego wyjątku ani odpowiedzi dla organizatora. Organizator
  otrzymuje dostęp tylko wtedy, gdy ma także rekord uczestnika.
- Nie dodano tabel, migracji ani zmian w seedzie. Wszystkie wymagane dane
  istniały już po poprzednich etapach.
