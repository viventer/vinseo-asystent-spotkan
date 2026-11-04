# Etap 3: infrastruktura kolejkowania

## Cel

Przygotować kolejkę BullMQ z Redisem dla przetwarzania spotkań. Payload
zadania ma zawierać wyłącznie identyfikator spotkania i nazwę kroku.

## Wdrożone zmiany

- Dodano `@nestjs/bullmq` w wersji zgodnej z NestJS 12 oraz skonfigurowano
  `BullModule.forRootAsync` na podstawie `REDIS_URL`.
- Zarejestrowano kolejkę `meeting-processing` przez
  `BullModule.registerQueue`.
- Dodano `EnqueueService`, który używa `@InjectQueue` i przekazuje zadania do
  zarejestrowanej kolejki.
- Dodano dozwolone kroki pipeline’u:
  `recording-ready`, `transcribe` oraz `summarize-and-publish`.
- Dodano schemat Zod `jobPayloadSchema`. Wymaga on UUID spotkania i znanego
  kroku oraz odrzuca dodatkowe pola, na przykład transkrypcję.
- Podłączono `QueueModule` zarówno do modułu API, jak i modułu workera.
- Usunięto własny token kolejki, ręczne tworzenie instancji BullMQ, własne
  połączenie Redis oraz ręczne zamykanie kolejki. Lifecycle kolejki obsługuje
  `@nestjs/bullmq`.

## Decyzje

- Użyto `@nestjs/bullmq`, ponieważ integruje BullMQ z modułami, providerami
  i lifecycle NestJS, a nie zmienia samego mechanizmu dostarczania zadań.
- Konfiguracja Redisa pozostaje w `ConfigModule`, a `REDIS_URL` jest jedynym
  źródłem adresu połączenia.
- `maxRetriesPerRequest` ustawiono na `null`, zgodnie z wymaganiami BullMQ
  dla workera.
- Redis i BullMQ służą wyłącznie jako infrastruktura dostarczania i retry.
  Postęp pipeline’u nie jest zapisywany w Redisie.
- Retry, backoff, timeout i processor workera pozostają zakresem kolejnych
  kroków planu. Ten etap jedynie rejestruje kolejkę i umożliwia dodawanie
  zwalidowanych zadań.

## Weryfikacja

Testy schematu payloadu i `EnqueueService` przechodzą. Lint oraz build backendu
przechodzą. Sprawdzono, że `GET /health` działa bez dostępnego Redisa, a worker
zamyka się poprawnie z Redisem i bez niego. Na działającym Redisie dodano testowe
zadanie, zweryfikowano jego nazwę i payload, a następnie usunięto zadanie z
kolejki.
