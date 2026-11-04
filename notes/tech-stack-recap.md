# Stos technologiczny

Krótka notatka decyzyjna dotycząca implementacji. Sporządzona 2026-11-02. Zakres wyszukiwania nie obejmuje tej wersji.

## Pierwsza wersja testowa

Pierwsza wersja działa lokalnie w Dockerze i musi zademonstrować trzy historyjki użytkownika objęte zakresem oraz część B. Integracja z Google, rzeczywiste uwierzytelnianie, hosting i frontend są celowo zastąpione atrapami testowymi.

### NestJS i TypeScript

**Dlaczego wybrano**

- NestJS zapewnia przejrzystą strukturę modułów, guardów, providerów i workerów dla rozwijającej się aplikacji.
- TypeScript pasuje do planowanego frontendu Next.js i pozwala później współdzielić typy lub schematy Zod.
- Jest naturalnie dopasowany do BullMQ, Redis, API HTTP i workerów działających w tle.

**Koszty i ograniczenia**

- Wprowadza więcej struktury i plików niż małe API oparte na Fastify lub Express.
- Walidacja Zod nie jest domyślnym podejściem w NestJS i wymaga adaptera lub własnego pipe'a.
- Framework samodzielnie nie egzekwuje autoryzacji na poziomie spotkania; nadal potrzebne są guardy i testy polityk dostępu.

**Odrzucone alternatywy**

- Rozważano FastAPI ze względu na Pydantic i narzędzia ML w Pythonie, ale po uwzględnieniu Vercel AI SDK, Vitest i małego prawdopodobieństwa self-hosted transcription nie pozostała żadna rozstrzygająca przewaga.
- Express/Fastify wymagałyby ręcznego ustanowienia większej części struktury aplikacji.

### PostgreSQL, Drizzle ORM i Drizzle Kit

**Dlaczego wybrano**

- PostgreSQL niezawodnie modeluje spotkania, uczestników, segmenty, podsumowania, zadania, uprawnienia, historię mapowania i kroki pipeline'u.
- Drizzle przechowuje schemat i zapytania w TypeScript oraz jasno pokazuje aktualizacje warunkowe i transakcje.
- Ta sama konfiguracja bazy danych działa lokalnie i później z Neon.

**Koszty i ograniczenia**

- Drizzle jest bliżej SQL niż Prisma, więc relacje i składanie zapytań wymagają bardziej jawnego kodu.
- Zespół musi utrzymywać konwencje dotyczące organizacji schematu, transakcji i migracji.
- Aplikacja powinna korzystać z połączenia Neon przez pool, a polecenia migracji z połączenia bezpośredniego.

**Odrzucone alternatywy**

- Prisma odrzucono, ponieważ generowany klient i osobny język schematu dodają kolejną warstwę abstrakcji dla tego stosunkowo małego modelu.
- TypeORM nie wybrano, ponieważ encje oparte na dekoratorach zwiększałyby powiązanie z frameworkiem i zmniejszałyby jawność schematu bazy danych.

### BullMQ i Redis

**Dlaczego wybrano**

- BullMQ zapewnia dla NestJS ponowienia, opóźnienia, współbieżność, workery i obsługę nieudanych zadań.
- Redis i worker mogą działać w lokalnej konfiguracji Docker Compose.
- Zadania zawierają wyłącznie identyfikator spotkania i nazwę kroku; PostgreSQL pozostaje źródłem prawdy dla idempotencji.

**Koszty i ograniczenia**

- Trwałość Redis musi zostać skonfigurowana; w przeciwnym razie restart może spowodować utratę zadań oczekujących w kolejce.
- Worker jest osobnym, długotrwale działającym procesem i sam w sobie nie pasuje dobrze do usługi HTTP ze skalowaniem do zera.
- Dostarczanie co najmniej raz nadal wymaga sprawdzania stanu w bazie danych, aby zapobiec wielokrotnemu przetwarzaniu.

**Odrzucone alternatywy**

- RabbitMQ jest trwalszy i bardziej zorientowany na protokół, ale dodaje cięższy broker i więcej konfiguracji operacyjnej, niż wymaga to obciążenie.
- QStash pozostaje możliwą opcją na później, ale nie może być użyty w lokalnej, pierwszej wersji i przechowuje dane wiadomości w usłudze zewnętrznej.

### Vitest i Swagger/OpenAPI

**Dlaczego wybrano**

- Vitest zapewnia szybkie testy jednostkowe i integracyjne autoryzacji, idempotencji, walidacji schematów oraz filtra danych wysyłanych na zewnątrz.
- Swagger/OpenAPI pozwala zademonstrować API bez frontendu.

**Koszty i ograniczenia**

- Testy nie dowodzą, że Google, AssemblyAI lub dostawca modelu zachowuje się poprawnie, chyba że zostaną dodane testy kontraktowe.
- OpenAPI dokumentuje API, ale nie implementuje autoryzacji.

**Odrzucone alternatywy**

- Nie wybrano Jest, ponieważ Vitest lepiej i prościej pasuje do toolchainu TypeScript.
- Frontend odłożono, ponieważ nie jest wymagany w części B i ograniczyłby czas dostępny na testy bezpieczeństwa i pipeline'u.

### Atrapy testowe

**Dlaczego wybrano**

- Fałszywe źródło nagrań, fałszywy provider transkrypcji i fałszywy provider podsumowań sprawiają, że pełny przepływ można odtwarzać bez danych klientów i zewnętrznych poświadczeń.
- Fałszywe podsumowanie zwraca tę samą strukturę walidowaną przez Zod co rzeczywisty provider.

**Koszty i ograniczenia**

- Atrapa nie pozwala zademonstrować jakości transkrypcji w języku polskim ani rzeczywistej jakości diarization.
- Awarie, przekroczenia czasu i limity zapytań specyficzne dla providera wymagają osobnych testów.

**Odrzucone alternatywy**

- Rzeczywiste integracje z Google i AI odłożono, ponieważ zadanie wyraźnie dopuszcza stuby, a pierwsza wersja musi działać lokalnie.

## Późniejsze wersje

### AssemblyAI Universal-2 i ffmpeg

**Dlaczego wybrano**

- AssemblyAI Universal-2 obsługuje język polski, przełączanie między językiem polskim i angielskim oraz diarization mówców.
- Endpoint UE i krótka konfiguracja retencji zmniejszają obawy dotyczące prywatności, ale ich nie eliminują.
- ffmpeg wyodrębnia jedną monofoniczną ścieżkę audio z Meet MP4 przed wysłaniem; dzięki temu nie wysyłamy obrazu i nie płacimy za wiele kanałów audio.

**Koszty i ograniczenia**

- Audio i transkrypcja opuszczają infrastrukturę firmy, co wymaga przeglądu prawnego, DPA, kontroli retencji i monitorowania dostawcy.
- Diarization tworzy lokalne identyfikatory mówców, a nie zweryfikowane tożsamości Google, dlatego nadal konieczne jest ręczne mapowanie.
- ffmpeg i duże pliki tymczasowe wymagają odpowiedniej przestrzeni dyskowej i CPU workera.

**Odrzucone alternatywy**

- Natywną transkrypcję Meet odrzucono, ponieważ język polski nie jest obsługiwany w językach zapisywanej transkrypcji.
- Bota Meet i wycofane Meet Media API odrzucono ze względu na ryzyko związane z prywatnością, utrzymaniem, wsparciem i cyklem życia.
- Self-hosted Whisper/pyannote pozostawiono jako rozwiązanie awaryjne, ale nie wybrano go do pierwszej implementacji.

### Google Meet REST API, Drive API i delegowane konto usługi

**Dlaczego wybrano**

- Meet udostępnia metadane nagrania, a Drive — bajty MP4.
- `meetings.space.readonly` i `drive.meet.readonly` mają węższy zakres niż pełny dostęp do Drive.
- Domain-wide delegation może podszywać się wyłącznie pod zatwierdzonych organizatorów spotkań.

**Koszty i ograniczenia**

- Aplikacja musi czekać na `FILE_GENERATED`; spotkanie może nie mieć nagrania albo organizator może je usunąć.
- Domain-wide delegation jest wrażliwe i wymaga ścisłej kontroli podszywania się, audytu, retencji i usuwania.
- Ta integracja identyfikuje uczestników, ale nie identyfikuje automatycznie zdiaryzowanych głosów.

**Odrzucone alternatywy**

- Bota przeglądarkowego i nagrywanie z laptopa odrzucono jako nieobsługiwane lub operacyjnie kruche.
- Google OAuth dla pracowników nie służy do pobierania nagrań; są to odrębne granice zaufania.

### Vercel AI SDK i dostawcy modeli

**Dlaczego wybrano**

- SDK pasuje do stosu TypeScript/NestJS i obsługuje ustrukturyzowane dane wyjściowe z Zod.
- Te same przykładowe segmenty można testować z OpenAI, Anthropic, Google, Mistral lub innym kompatybilnym providerem.
- Ostateczny wybór powinien opierać się na jakości języka polskiego, poprawności danych wyjściowych, opóźnieniu, prywatności i koszcie, a nie na założeniu dotyczącym konkretnego dostawcy.
- OpenAI z przetwarzaniem regionalnym w UE jest pierwszym kandydatem, z zastrzeżeniem przeglądu prawnego i dostępności tej opcji na koncie.

**Koszty i ograniczenia**

- Każdy provider ma inną jakość modelu, sposób obsługi ustrukturyzowanych danych wyjściowych, ceny, retencję i zasady przetwarzania regionalnego.
- Abstrakcje providerów nie eliminują potrzeby stosowania filtra danych wysyłanych na zewnątrz; imiona, nazwiska i adresy e-mail muszą pozostać poza promptami.
- Porównanie modeli wymaga reprezentatywnych, nieklienckich danych przykładowych i powtarzalnych kryteriów oceny.

**Odrzucone alternatywy**

- Pydantic AI nie wybrano po przeniesieniu backendu do TypeScript; Vercel AI SDK zapewnia w wybranym środowisku równoważne porównywanie modeli i integrację z Zod.
- Nie uznano jednego providera za rozwiązanie ostateczne przed przetestowaniem jakości względem wymagań dotyczących kosztu i prywatności.

### Next.js, Auth.js with Google i Vercel

**Dlaczego wybrano**

- Next.js i Auth.js zapewniają planowany interfejs dla pracowników oraz logowanie przez Google Workspace.
- Auth.js identyfikuje pracownika; NestJS nadal sprawdza dostęp do każdego spotkania, transkrypcji, klipu i działania mapowania.
- Vercel jest praktycznym miejscem wdrożenia dla Next.js i środowisk preview.

**Koszty i ograniczenia**

- Auth.js nie implementuje autoryzacji spotkań i wymaga starannej walidacji tokenów i sesji.
- Frontend i API mają odrębne kwestie wdrożenia oraz cookie/CORS.
- Odpowiedzi zawierające dane spotkań nie mogą zostać nieprawidłowo udostępnione przez cache CDN.

**Odrzucone alternatywy**

- Firebase Authentication nie wybrano, ponieważ Firebase Authentication przechowuje dane uwierzytelniania w Stanach Zjednoczonych.
- Firebase App Hosting nie wybrano, ponieważ nie usunąłby potrzeby osobnego wdrożenia API i wiązałby frontend z kolejną platformą.
- Frontend nie jest częścią pierwszej wersji testowej.

### Google Cloud Run, Neon i GitHub Actions

**Dlaczego wybrano**

- Cloud Run hostuje API NestJS i może uruchamiać osobno wdrożonego workera.
- Neon zapewnia zarządzany PostgreSQL, pooling, branching i prostą ścieżkę przejścia z lokalnego PostgreSQL.
- GitHub Actions uruchamia testy i migracje przed wdrożeniem.

**Koszty i ograniczenia**

- Limity żądań Cloud Run i zachowanie związane ze skalowaniem do zera wymagają osobnego workera dla długotrwałych kroków.
- Pooling Neon, bezpośrednie połączenia migracyjne, kopie zapasowe i retencja wymagają jawnej konfiguracji.
- Poświadczenia wdrożeniowe, sekrety, regiony, logi i kopie zapasowe stają się odpowiedzialnością produkcyjną.

**Odrzucone alternatywy**

- VPS nie wybrano jako domyślnego rozwiązania, ponieważ przenosi na zespół obsługę TLS, poprawek, skalowania, kopii zapasowych i nadzoru nad workerem.
- Firebase hosting nie wybrano dla backendu, ponieważ nie zastępuje workera NestJS ani wdrożenia PostgreSQL.
- Te usługi celowo nie występują w pierwszej wersji lokalnej.

## Ryzyka i pytania przed implementacją

- Czy firma może zgodnie z prawem wysyłać audio ze spotkań klientów i segmenty transkrypcji do AssemblyAI oraz dostawców modeli? Jakie DPA, mechanizm transferu, region, zasady retencji i usuwania są wymagane?
- Który provider modelu zwycięży w kontrolowanym teście polskich spotkań z angielskimi terminami i identyfikatorami mówców? Jaki próg jakości i kosztu jest akceptowalny?
- Czy ręczne mapowanie mówców jest akceptowaną procedurą firmową i kto może mapować spotkanie po odejściu pracownika?
- Które spotkania nigdy nie mogą być importowane i jaki sygnał oznacza spotkanie poufne lub odmowę nagrania?
- Jakie są dokładne okresy retencji dla MP4, wyodrębnionego audio, segmentów, podsumowań, zadań, historii mapowania, logów, kopii zapasowych i nieudanych zadań?
- Którzy użytkownicy Google Workspace mogą być impersonowani i jak będą audytowane domain-wide delegation oraz pobieranie danych?
- Czy wybrane wdrożenie Cloud Run obsłuży workera, przestrzeń dla ffmpeg, ponowienia i oczekiwaną współbieżność bez utraty kroku?
- Czy trwałość Redis i idempotencja PostgreSQL zostaną przetestowane w przypadku awarii workera między każdą parą kroków pipeline'u?
- W jaki sposób sekrety, logi providerów, dane QStash/BullMQ i logi aplikacji będą chronione przed zawieraniem treści spotkań?
- Kto będzie odpowiadać za produkcyjną obsługę Redis, workera, kopii zapasowych Neon, migracji i odzyskiwania po incydentach?

## Jak wykorzystano AI

AI wykorzystano do porównania NestJS i FastAPI, oceny kolejek, opcji uwierzytelniania, hostingu, ORM-ów i dostawców modeli, a także do identyfikacji ryzyk związanych z prywatnością, autoryzacją, ponowieniami, przechowywaniem i wdrażaniem.

Przed wyborem technologii prosiłem o przedstawienie alternatyw, żądałem weryfikacji aktualnej dokumentacji dostawców i kwestionowałem wnioski oparte wyłącznie na konwencjach frameworków lub dopasowaniu do oferty pracy. Ostateczne decyzje podjąłem samodzielnie, zachowując jawność istotnych założeń i otwartych pytań prawnych.
