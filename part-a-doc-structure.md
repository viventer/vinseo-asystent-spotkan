# Struktura dokumentu części A

Szkielet przyszłego `part-a-answers.md`. Określa, co trafi do każdej sekcji, w jakiej formie i na podstawie których notatek. Pełny tekst powstanie w kolejnym etapie.

## 1. Zasady redakcyjne

- Limit: maksymalnie 5 stron, czyli około 2500–3000 słów plus diagramy.
- Żadna sekcja nie może zająć więcej niż 0,6 strony. Suma budżetów wynosi 4,9 strony, a 0,1 strony zostaje jako zapas na nagłówek i formatowanie.
- Tabele „Rozważone i odrzucone” mają najwyżej 3–4 wiersze. Opcje odrzucone z oczywistego powodu łączymy w jeden wiersz.
- Akapit ma najwyżej 2–3 zdania. Treść podajemy głównie w punktach, tabelach i diagramach.
- Bez szczegółów implementacyjnych: bez nazw endpointów, zmiennych środowiskowych i parametrów API. Opisujemy narzędzie, jego działanie, uzasadnienie oraz zalety i wady.
- Oznaczenia: **Fakt** (sprawdzone), **Założenie**, **Do potwierdzenia** (wymaga decyzji Vinseo lub prawnika).
- Formułowanie w pierwszej osobie, np. „wybrałem”, „odrzuciłem, bo”. Tak dokument pokazuje, że decyzje są moje.
- Dokument po polsku, w Markdown, z diagramami Mermaid. Opis pracy z AI trafia do README, nie do części A. Autorstwo decyzji pokazują bloki „Rozważone i odrzucone”.

## 2. Szablon karty decyzji (sekcje 1–8)

- **Decyzja:** jedno zdanie.
- **Dlaczego:** 2–4 punkty.
- **Rozważone i odrzucone:** tabela z kolumnami opcja, zaleta i powód odrzucenia.
- **Świadome kompromisy:** wady, które akceptuję, i sposób ich ograniczenia.
- **Co zmieniłoby decyzję:** konkretny warunek, który by ją odwrócił.

## 3. Sekcje dokumentu

### 0. Streszczenie dla decydenta (0,3 strony)

- 6 punktów z kluczowymi decyzjami, rekomendowany wariant kosztowy z kwotą i 3 najważniejsze pytania do Vinseo.
- Legenda oznaczeń Fakt, Założenie i Do potwierdzenia.

### 1. Źródło nagrań i uprawnienia (0,5 strony)

Odpowiada na pytanie 1 zadania.

- Decyzja: oficjalny plik MP4 z Google Meet zapisany na Dysku organizatora. Dostęp przez konto usługi z delegacją domenową. Najwęższe zakresy tylko do odczytu nagrań i spotkań. Podszywanie się tylko pod organizatorów nagranych spotkań. Pobieranie dopiero, gdy plik jest gotowy.
- Bez osobnego diagramu: ścieżka nagrania jest widoczna na diagramie architektury w sekcji 6.
- Rozważone i odrzucone (4 wiersze):
  - bot dołączający do spotkania (własny klient albo dostawca botów),
  - transkrypcje Meet i Meet Media API (brak języka polskiego, brak stabilnego dostępu do audio),
  - szeroki zakres dostępu do całego Dysku,
  - zgoda OAuth od każdego użytkownika.
- Kompromis: delegacja domenowa daje duże uprawnienia. Opisać, jak ją ograniczamy.
- Źródła: `notes/transcription-workflow-recap.md` (D1 i sekcja 7), `docs/transcription-workflow.md`.

### 2. Bezpieczeństwo i prywatność (0,6 strony)

Odpowiada na pytanie 2 zadania.

- Zastrzeżenie w jednym zdaniu: to propozycja polityki, nie porada prawna.
- Zgody w 2 punktach: nagrywamy tylko przy zgodzie wszystkich uczestników (klienci na początku spotkania, pracownicy w aplikacji, spóźnieni uczestnicy też).
- Jedna wspólna tabela danych i retencji z kolumnami: rodzaj danych, gdzie trafia, jak długo jest przechowywany. Wiersze:
  - MP4 (u nas, 48 godzin),
  - audio (dostawca transkrypcji, usuwane po wyniku; u nas 7 dni),
  - segmenty z identyfikatorami mówców (LLM, bez przechowywania),
  - transkrypcja, streszczenie i zadania (u nas, 24 miesiące, Do potwierdzenia).
- Pod tabelą jedno zdanie: imiona, e-maile i mapowanie mówców nie wychodzą poza firmę.
- Tabela przypadków brzegowych (4 wiersze) z kolumnami sytuacja i zachowanie systemu: odchodzący pracownik, spotkanie poufne, odmowa nagrywania, wycofanie zgody.
- Rozważone i odrzucone jako jeden punkt zamiast tabeli: imiona w prompcie odrzucone na rzecz pseudonimów; świadomie nie nazywam tego „anonimizacją”.
- Źródła: `docs/privacy.md`, `notes/privacy-recap.md`, D5 w `notes/transcription-workflow-recap.md`.

### 3. Model dostępu (0,5 strony)

Odpowiada na pytanie 3 zadania.

- Decyzja: dostęp mają tylko uczestnicy spotkania. Organizator, który nie uczestniczył, nie ma dostępu. Domyślnie dostęp jest zablokowany, a identyfikator spotkania nie stanowi uprawnienia.
- Kompaktowy diagram Mermaid (poziomy, 5 węzłów): zapytanie, uwierzytelnienie, filtr uczestnictwa, dane lub model, ponowna weryfikacja źródeł.
- Wyszukiwanie i asystent: filtr przed wyszukiwaniem, nie po nim. Model nie egzekwuje uprawnień. Gdy brak dostępu, system daje neutralną odpowiedź.
- Rozważone i odrzucone (3 wiersze):
  - dostęp organizatora albo całego zespołu lub projektu,
  - uprawnienia egzekwowane w prompcie albo filtrowanie wyników po wyszukiwaniu,
  - nieodgadywalne adresy URL jako zabezpieczenie.
- Świadomy kompromis: nowa osoba w projekcie nie widzi historii. Jest to sprzeczne z celem z opisu problemu, więc jawne udostępnianie trafia do późniejszego etapu.
- Źródła: `docs/authorization.md`, `notes/search.md`.

### 4. Narzędzia i modele (0,6 strony)

Odpowiada na pytanie 4 zadania.

- Tabela porównawcza (4 wiersze) z kryteriami: jakość dla polskiego, koszt przy 300 godzinach, prywatność i utrzymanie. Wiersze:
  - Universal-2 (wybrany),
  - Scribe v2,
  - Whisper z pyannote,
  - jeden zbiorczy wiersz „odrzucone na starcie”: Universal-3.5 Pro i transkrypcje Meet (brak polskiego), gpt-4o-transcribe-diarize (zapowiedziane wycofanie).
- Ta tabela pełni funkcję bloku „Rozważone i odrzucone”.
- Decyzja o transkrypcji: AssemblyAI Universal-2 na endpointcie EU. Powodem są miejsce i czas przechowywania kopii, a nie dokładność ani prostota.
- Rozpoznawanie mówców w 2 punktach: diarizacja zmiksowanego pliku, potem ręczne przypisanie mówców przez uczestników. Profile głosowe są trwale poza zakresem.
- Streszczenia w 3 punktach: kryteria wyboru, 2–3 kandydatów, test na próbce. Wynik ma ustaloną strukturę, a niepoprawny wynik nie jest publikowany. Dokument nie wskazuje zwycięzcy.
- Co zmieniłoby decyzję: wynik nagrania próbnego albo opinia specjalisty o transferze danych.
- Źródła: `notes/transcription-model-recap.md` (sekcje 3, 5 i 7), D2–D4 i D8 w `notes/transcription-workflow-recap.md`, `notes/tech-stack-recap.md`.

### 5. Koszt miesięczny (0,6 strony)

Odpowiada na pytanie 5 zadania.

- Założenia: 300 godzin, około 400 spotkań po 45 minut, jedna ścieżka mono, kurs waluty z datą.
- Wariant A, zewnętrzne usługi: transkrypcja \(300 \times 0{,}17 = 51\) USD (AssemblyAI), LLM do streszczeń, zadań, wyszukiwania i asystenta (wzór: tokeny na spotkanie lub zapytanie pomnożone przez liczbę i cenę), embeddingi oraz hosting Cloud Run, Neon i magazyn plików.
- Wariant B, serwer VPS z GPU: na jednym wynajętym VPS działają model transkrypcji z diarizacją (Whisper i pyannote) oraz model AI do streszczeń, embeddingów i asystenta. Koszt to wynajem GPU (stała stawka miesięczna albo godziny pracy razy stawka), storage, kopie zapasowe i czas osoby utrzymującej. Nazwa: „modele zarządzane przez firmę na wynajętym GPU”. Zakup fizycznego serwera wymieniony tylko jako odrzucona opcja.
- Każdy wariant liczony w 3 scenariuszach wykorzystania AI:
  - Scenariusz 1: tylko transkrypcja, streszczenia i zadania (zakres wersji zero), bez wyszukiwania i asystenta.
  - Scenariusz 2: niższe wykorzystanie wyszukiwania i asystenta, niskie limity zużycia na pracownika (np. kilkanaście zapytań miesięcznie na osobę).
  - Scenariusz 3: wysokie wykorzystanie wyszukiwania i asystenta, wysokie limity zużycia na pracownika (np. kilkadziesiąt do ponad stu zapytań miesięcznie na osobę).
  - Konkretne limity zapytań, tokeny kontekstu na zapytanie i liczba aktywnych użytkowników (25 regularnych z 40) to jawne założenia do ustalenia na etapie treści.
  - Dla scenariuszy 2 i 3 kalkulacja rozdziela koszt godzin spotkań (stały) od kosztu zapytań (zależny od limitów).
- Razem 6 komórek kosztowych (2 warianty x 3 scenariusze).
- Obliczenia w jednej tabeli z wierszami pozycji kosztowych i kolumnami A1, A2, A3, B1, B2, B3, a pod nią wzory. Wariant B ma w scenariuszach 2 i 3 sprawdzić, czy jeden GPU wystarcza, albo wskazać potrzebę większej instancji.
- Wrażliwość jako 3 krótkie punkty pod tabelą: eksperymentalna diarizacja (+13,50 USD), keyterms (+15 USD), ponowne streszczenie po przypisaniu mówców.
- Porównanie pozakosztowe w jednym zdaniu: prywatność kontra obciążenie utrzymaniem.
- Luka do uzupełnienia na etapie treści: ceny LLM, GPU i hostingu wymagają researchu.
- Źródła: `notes/transcription-model-recap.md` (sekcja 2, ceny), `docs/tech-stack.md`.

### 6. Architektura i obsługa błędów (0,6 strony)

Odpowiada na pytanie 6 zadania.

- Diagram Mermaid przepływu (najwyżej 10 węzłów): Meet i Dysk, worker, dostawca transkrypcji, filtr danych wychodzących, LLM, walidacja, PostgreSQL, kolejka, API, UI.
- Tabela awarii (4 wiersze) z kolumnami sytuacja i zachowanie: plik niegotowy, dostawca niedostępny, niepoprawny wynik LLM, restart w połowie albo powtórne dostarczenie zadania.
- Zasada w jednym zdaniu: PostgreSQL jest źródłem prawdy, kolejka służy tylko do doręczania, a kroki są idempotentne.
- Rozważone i odrzucone jako jeden punkt zamiast tabeli: Redis jako stan procesu i przetwarzanie synchroniczne w żądaniu HTTP.
- Jedno zdanie o tym, które elementy część B realizuje w wersji zero.
- Źródła: `docs/version-zero.md`, `notes/tech-stack-recap.md`.

### 7. Środowiska (0,3 strony)

Odpowiada na pytanie 7 zadania.

- Środowiska local, test, staging i prod. Dane syntetyczne, atrapy dostawców oraz fikcyjne spotkania nagrane do testów. Bez kopiowania danych produkcyjnych.
- Rozważone i odrzucone: wyłącznie dane syntetyczne, zanonimizowane prawdziwe transkrypcje, pilotaż od razu na produkcji.
- Źródła: `docs/environments.md`, `notes/environments-recap.md`.

### 8. Plan wdrożenia (0,4 strony)

Odpowiada na pytanie 8 zadania.

- Zamiast diagramu i osobnych list: jedna tabela etapów 0–4 z kolumnami etap, co jest, kryterium przejścia dalej.
- Lista „pierwsza wersja świadomie bez”: wyszukiwanie, asystent, powiadomienia, udostępnianie i profile głosowe.
- Mierniki sukcesu: zero nieautoryzowanych dostępów, brak duplikatów, opinie pilotażu, koszt w budżecie.
- Rozważone i odrzucone jako jeden punkt: wdrożenie dla całej firmy od razu oraz zaczynanie od integracji z Meet i Dyskiem przed sprawdzeniem jakości transkrypcji i streszczeń.
- Źródła: `docs/implementation-plan.md`, `notes/implementation-plan-recap.md`.

### 9. Ryzyka i pytania do Vinseo (0,5 strony)

Odpowiada na pytanie 9 zadania.

- Tabela 5 ryzyk z kolumnami ryzyko, wpływ i ograniczenie: jakość diarizacji, transfer danych do USA (łącznie z ważnością decyzji o adekwatności), delegacja domenowa, brak historii dla nowych osób, koszt LLM.
- Najwyżej 8 pytań w trzech grupach: biznes (budżet, udostępnianie), prawo (podstawa prawna, DPIA, retencja), Workspace (edycja, automatyczne nagrywanie, sale konferencyjne).
- Źródła: sekcja 4 w `notes/transcription-workflow-recap.md`, sekcja 8 w `notes/transcription-model-recap.md`, sekcja „Open decisions” w `docs/privacy.md`.

## 4. Budżet stron

| Sekcja | Strony |
| --- | ---: |
| 0. Streszczenie | 0,3 |
| 1. Źródło nagrań | 0,5 |
| 2. Prywatność | 0,6 |
| 3. Model dostępu | 0,5 |
| 4. Narzędzia i modele | 0,6 |
| 5. Koszt | 0,6 |
| 6. Architektura | 0,6 |
| 7. Środowiska | 0,3 |
| 8. Plan wdrożenia | 0,4 |
| 9. Ryzyka i pytania | 0,5 |
| **Razem** | **4,9** |

## 5. Lista kontrolna

- [ ] Każde z 9 pytań z `docs/zadanie.md` ma przypisaną sekcję.
- [ ] Każda sekcja 1–8 ma blok „Rozważone i odrzucone”.
- [ ] Koszty pokazują obliczenia.
- [ ] Dokument mieści się w limicie 5 stron, a żadna sekcja nie przekracza 0,6 strony.
- [ ] Są 2 diagramy Mermaid (dostęp i architektura). Pozostałe treści mają formę tabel i punktów.

## 6. Otwarte

- Ceny LLM i GPU do wariantów kosztowych zostaną uzupełnione na etapie pisania treści.
- Limity zapytań i liczba aktywnych użytkowników do potwierdzenia.
