# Model transkrypcji

Rejestr decyzji dotyczący modelu speech-to-text i rozdzielenia mówców na zmiksowanym nagraniu z Meet. Sporządzony 2026-10-30 na podstawie researchu oraz wyboru dokonanego przed implementacją.

Ten plik jest pełnym zapisem. Dokument Part A powinien skrócić sekcję 7. Sekcja README dotycząca użycia AI powinna być zgodna z sekcją 6.

Model podsumowujący jest osobną decyzją i nie został opisany w tym pliku. Identyfikatory mówców, mapowanie na osoby oraz zakres danych, które model podsumowujący może zobaczyć, pozostają opisane w `notes/transcription-workflow-recap.md`. Ten plik wybiera wyłącznie model, który zamienia nagranie na segmenty.

Poniższe twierdzenia są oznaczone jako **Fakt** (sprawdzony względem źródła w podanym dniu) albo **Założenie** (niesprawdzone i możliwe do zmiany).

## 1. Wybór

**Wybrany do odpowiedzi pisemnej: AssemblyAI Universal-2**, na endpointcie EU, ze standardową diarizacją mówców, parą języków angielski i polski oraz najkrótszym okresem przechowywania dozwolonym przez API.

Wybór nie jest zamknięty. Zanim uznam go za ostateczny, trzeba wykonać dwie kontrole; każda z nich może doprowadzić do zmiany modelu albo całego podejścia:

1. Specjalista musi wyjaśnić różnicę w przechowywaniu danych między ElevenLabs i AssemblyAI. Nie będę traktować endpointu EU jako wniosku prawnego.
2. Potrzebuję przykładowej rozmowy, zbliżonej do prawdziwego spotkania Vinseo, przepuszczonej przez oba modele. Próbka musi pokazać, że model potrafi rozdzielić mówców na tego rodzaju nagraniu. Jeśli żaden model sobie z tym nie poradzi, podejście ze zmiksowanym plikiem trzeba zmienić.

## 2. Zweryfikowane fakty

Sprawdzone 2026-10-30. Ceny są cenami katalogowymi i nie obejmują podatku. Wolumen to wskazane w zadaniu 300 godzin spotkań miesięcznie. Poniższa kalkulacja zakłada jedną monofoniczną godzinę audio na godzinę spotkania. AssemblyAI rozlicza audio wielokanałowe za każdy kanał, więc plik stereo wysłany jako dwa kanały podwoiłby rachunek.

### Czego zadanie wymaga od tego wyboru

**Fakt.** Pytanie 4 w Part A wymaga wskazania narzędzi i modeli do transkrypcji, rozpoznawania mówców i podsumowań: jakości dla języka polskiego, kosztu, prywatności i utrzymania. Źródło: `docs/zadanie.md`.

**Fakt.** Spotkania odbywają się po polsku, z angielskimi nazwami kampanii i żargonem, zwykle trwają 45 minut, uczestniczy w nich 2–6 osób, a część z nich jest spoza firmy. Około 300 godzin miesięcznie. Źródło: `docs/zadanie.md`.

**Fakt.** Nagranie jest jednym zmiksowanym plikiem MP4. Rozdzielenie mówców w pierwszej wersji polega na diarizacji tego miksu i tworzeniu identyfikatorów mówców lokalnych dla spotkania. Własna zapisana transkrypcja Meet nie obejmuje języka polskiego. Źródło: `notes/transcription-workflow-recap.md`.

### Modele AssemblyAI i język polski

**Fakt.** Universal-3.5 Pro obsługuje 18 języków: angielski (globalny, australijski, brytyjski, amerykański), hiszpański, francuski, niemiecki, włoski, portugalski, arabski, duński, niderlandzki, fiński, hebrajski, hindi, japoński, mandaryński, norweski, szwedzki, turecki i wietnamski. Polskiego nie ma na tej liście. Kody języków dla tych samych 18 języków są opublikowane na stronie dotyczącej języków realtime. Źródła: [Code switching](https://www.assemblyai.com/docs/pre-recorded-audio/code-switching), [Supported languages](https://www.assemblyai.com/docs/pre-recorded-audio/supported-languages), [Steer toward known languages](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/language-selection).

**Fakt.** Universal-2 obsługuje język polski. Strona języków umieszcza polski w grupie wysokiej dokładności, z word error rate na poziomie nie większym niż 10%. W FLEURS, zaktualizowanym w styczniu 2026 roku, Universal-2 osiąga 6.63% WER dla języka polskiego i 4.38% dla angielskiego. Universal-3.5 Pro nie ma wyniku dla języka polskiego. Ta sama strona ostrzega, że publiczne benchmarki mogą zawyżać wyniki, gdy model był trenowany na zbiorze testowym, oraz że prawdziwa ewaluacja powinna używać własnego audio. Źródła: [Supported languages](https://www.assemblyai.com/docs/pre-recorded-audio/supported-languages), [Benchmarks](https://www.assemblyai.com/docs/pre-recorded-audio/benchmarks).

**Fakt.** Jeśli `speech_models` zostanie pominięte, domyślnie przyjmuje wartość `["universal-3-5-pro", "universal-2"]`. Universal-3.5 Pro obsługuje swoje 18 języków. Wszystko inne przechodzi do Universal-2. Źródło: [Model selection](https://www.assemblyai.com/docs/pre-recorded-audio/select-the-speech-model).

**Fakt.** Standardowa diarizacja asynchroniczna jest dodatkiem w cenie $0.02 za godzinę zarówno dla Universal-3.5 Pro, jak i Universal-2. Eksperymentalny dodatek do asynchronicznej diarizacji kosztuje $0.065 za godzinę dla obu modeli i jest opisywany jako lepszy przy wielu mówcach lub trudnym audio. Przewodnik dotyczący diarizacji włącza ją przez `speaker_labels`. API wymaga `punctuate: true`, gdy włączone są etykiety mówców. Nie znalazłem tabeli potwierdzającej, że etykiety mówców działają dla każdego języka. Strona języków mówi, że nieobsługiwana funkcja, gdy język zostanie ustawiony ręcznie, powoduje odrzucenie żądania, a przykładowy błąd wymienia `speaker_labels`. Źródła: [pricing](https://www.assemblyai.com/pricing), ostatnia aktualizacja 2026-10-27, [Speaker diarization](https://www.assemblyai.com/docs/pre-recorded-audio/label-speakers), [Supported languages](https://www.assemblyai.com/docs/pre-recorded-audio/supported-languages).

**Fakt.** W Universal-2 code switching jest ograniczony do dwóch kodów języków, a jednym z nich musi być angielski. `["en", "pl"]` spełnia tę regułę. `language_codes` nie łączy się z `language_detection`. Źródło: [Code switching](https://www.assemblyai.com/docs/pre-recorded-audio/code-switching).

**Fakt.** Keyterm prompting w Universal-2 async kosztuje $0.05 za godzinę i obejmuje maksymalnie 200 terminów. Źródło: [pricing](https://www.assemblyai.com/pricing).

### Cena AssemblyAI przy 300 godzinach

**Fakt.** Universal-2 kosztuje $0.15 za godzinę. Ze standardową diarizacją stawka wynosi $0.17 za godzinę. Z eksperymentalną diarizacją wynosi $0.215 za godzinę. Endpoint EU ma tę samą cenę. Źródło: [pricing](https://www.assemblyai.com/pricing).

| Co obejmuje                                    | Stawka   | 300 godzin |
| ---------------------------------------------- | -------- | ---------- |
| Universal-2 + standardowa diarizacja           | $0.17/h  | $51        |
| Universal-2 + eksperymentalna diarizacja       | $0.215/h | $64.50     |
| Universal-2 + standardowa diarizacja + keyterms | $0.22/h | $66        |

**Założenie.** Przejście awaryjne z Universal-3.5 Pro do Universal-2 jest rozliczane według stawki Universal-2. Cennik podaje stawkę dla modelu. Nie znalazłem zdania mówiącego, że koszt fallbacku jest naliczany na podstawie `speech_model_used`. Żądanie w tym projekcie ustawia `speech_models` wyłącznie na Universal-2, więc cena fallbacku nie ma zastosowania.

### Przechowywanie danych w AssemblyAI

**Fakt.** Domyślny endpoint przetwarza audio w Stanach Zjednoczonych. `api.eu.assemblyai.com` przetwarza i przechowuje audio oraz dane transkrypcji w UE (Frankfurt, Sztokholm lub Irlandia). Dane konta i dane dotyczące użycia pozostają w Stanach Zjednoczonych. Nazwy plików mogą być przetwarzane przez CrowdStrike i Datadog w Stanach Zjednoczonych. Personel wsparcia spoza UE może otworzyć audio i może użyć do tego subprocessora z USA. Źródło: [Cloud endpoints and data residency](https://www.assemblyai.com/docs/pre-recorded-audio/select-the-region).

**Fakt.** W przypadku transkrypcji nagrania, bez własnego time-to-live i bez business-associate agreement: usuwanie przesłanego pliku audio zaczyna się po 24 godzinach i następuje najpóźniej po 48 godzinach. Gotowa transkrypcja jest usuwana po 30 dniach. Time-to-live można ustawić na zaledwie jedną godzinę. Ta godzina oznacza moment rozpoczęcia usuwania w AWS. AssemblyAI informuje, że usunięcie bajtów może trwać kilka godzin, a opóźnienia sięgały kilku dni. Transkrypcję można również usunąć przez API. Zero retention audio i transkrypcji opisano dla streamingu, synchronicznego speech-to-text i dyktowania, a nie dla ścieżki przesyłania pliku. Część metadanych pozostaje w logach i danych rozliczeniowych. Źródło: [Data retention and model training](https://www.assemblyai.com/docs/data-retention-and-model-training).

**Fakt.** Addendum dotyczący przetwarzania danych, obowiązujący od 22 stycznia 2026 roku, mówi, że klient przyjmuje do wiadomości, iż podstawowe przetwarzanie AssemblyAI odbywa się w Stanach Zjednoczonych oraz że transfer do Stanów Zjednoczonych jest konieczny do świadczenia usługi. Transfery opierają się na EU-US Data Privacy Framework, jeśli odbiorca posiada certyfikację, albo na standardowych klauzulach umownych UE. Własne FAQ AssemblyAI mówi, że firma posiada certyfikację w ramach tego systemu. Źródła: [Data processing addendum](https://www.assemblyai.com/legal/data-processing-addendum), [FAQ](https://www.assemblyai.com/docs/faq/has-assemblyai-certified-to-the-eu-us-data-privacy-framework).

**Fakt.** Decyzja Komisji o adekwatności EU-US Data Privacy Framework pochodzi z 10 lipca 2023 roku. Sąd Generalny oddalił skargę 3 września 2025 roku (T-553/23). Odwołanie, C-703/25 P, wniesiono 31 października 2025 roku i pod koniec października 2026 roku nadal oczekiwało na rozstrzygnięcie; nie znaleziono wyroku. Źródła: [General Court press release](https://curia.europa.eu/site/upload/docs/application/pdf/2025-09/cp250106en.pdf), [notice of appeal](https://eur-lex.europa.eu/eli/C/2025/6610/oj/eng).

**Fakt.** AssemblyAI nie wykorzystuje przesłanych plików do trenowania modeli, gdy konto korzysta z serwerów europejskich, ma business-associate agreement albo zrezygnowało z takiego użycia. Rezygnuję z niego. Nie użyłem trenowania jako powodu, by preferować jednego dostawcę. Poniższe porównanie dotyczy tego, gdzie znajduje się kopia i jak długo tam pozostaje. Źródło: [Data retention and model training](https://www.assemblyai.com/docs/data-retention-and-model-training).

### ElevenLabs Scribe v2

**Fakt.** Scribe v2 kosztuje $0.22 za godzinę według cennika API. Keyterm prompting kosztuje $0.05 za godzinę. Edycja transkrypcji kosztuje $0.07 za godzinę. Cennik nie ma osobnej pozycji za diarizację. Opis produktu obejmuje diarizację mówców dla maksymalnie 32 mówców. Zdanie marketingowe na stronie speech-to-text mówi, że Scribe zaczyna się od $0.40 za godzinę. Jest to sprzeczne z cennikiem API i FAQ na stronie cenowej, które oba podają $0.22. Użyłem $0.22. Model realtime kosztuje $0.39 za godzinę i nie jest potrzebny, ponieważ plik istnieje dopiero po spotkaniu. Subskrypcja Pro za $99 miesięcznie obejmuje 450 godzin, czyli więcej niż 300 godzin pomnożone przez $0.22. Źródła: [API pricing](https://elevenlabs.io/pricing/api), [Speech to text](https://elevenlabs.io/docs/overview/capabilities/speech-to-text).

| Co obejmuje                                      | Stawka  | 300 godzin |
| ------------------------------------------------ | ------- | ---------- |
| Scribe v2, diarizacja w cenie $0.22              | $0.22/h | $66        |
| Scribe v2 + keyterms                             | $0.27/h | $81        |

**Fakt.** Scribe v2 umieszcza polski (`pol`) w grupie „excellent”, z word error rate nie większym niż 5%, w tej samej grupie co angielski. ElevenLabs nie publikuje osobnego wyniku dla języka polskiego dla v2. Tabela na polskiej stronie produktu podaje wynik FLEURS 2.3% WER dla Scribe v1, a nie v2. Nie użyłem 2.3% jako wyniku v2. Źródła: [Speech to text](https://elevenlabs.io/docs/overview/capabilities/speech-to-text), [Polish speech to text](https://elevenlabs.io/speech-to-text/polish).

**Fakt.** Scribe v2 może przyjąć jeden plik zawierający więcej niż jeden język i wykrywać języki bez ręcznego podziału. Keyterms w modelu batch obejmują maksymalnie 1000 terminów. Źródła: [Introducing Scribe v2](https://elevenlabs.io/blog/introducing-scribe-v2), [Speech to text](https://elevenlabs.io/docs/overview/capabilities/speech-to-text).

**Fakt.** Na zwykłym koncie API dane klienta są przechowywane w Stanach Zjednoczonych. Rezydencja danych w UE jest funkcją Enterprise, w osobnym workspace i przez osobny host API (`api.eu.residency.elevenlabs.io`). Rezydencja ogranicza miejsce przechowywania danych. Przetwarzanie nadal może odbywać się poza tym regionem, w tym na potrzeby wsparcia i moderacji. Ograniczenie przetwarzania do UE wymaga również Zero Retention Mode. Zero Retention Mode jest dostępny dla wybranych klientów Enterprise, jest ustawiany dla każdego żądania przez `enable_logging=false` i obejmuje audio oraz tekst speech-to-text. Nie obejmuje web UI. Domyślnie historia speech-to-text jest włączona dla audio i tekstu. Dokumentacja nie podaje liczby dni przechowywania tej historii na aktywnym koncie. Usunięcie przez API usuwa audio i tekst z bazy danych. Logi debugowania i moderacji mogą pozostać, a kopie zapasowe są przechowywane do 30 dni. Addendum dotyczące przetwarzania danych mówi, że w przypadku kont self-serve ElevenLabs może usunąć treści po 180 dniach bezczynności, ale nie musi tego zrobić. Źródła: [Data residency](https://elevenlabs.io/docs/overview/administration/data-residency), [Zero Retention Mode](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode), [DPA](https://elevenlabs.io/dpa).

### Czego nie mówią opublikowane polskie wyniki

**Fakt.** FLEURS jest mową czytaną. Nagranie z Meet jest rozmową, z nakładającymi się wypowiedziami i jedną zmiksowaną ścieżką. Żaden z dostawców nie publikuje wskaźnika błędów mówców dla języka polskiego na audio ze spotkań. Zewnętrzny benchmark FLEURS z lipca 2026 roku, obejmujący Scribe v2, nie zawiera języka polskiego ani Universal-2. Jego autor korzysta z Scribe i wyraźnie to zaznacza. Źródło: [koedesk STT Bench](https://koedesk.app/pl/benchmark/).

**Założenie.** Różnica między „at or below 5%” a opublikowanym wynikiem 6.63% dla mowy czytanej nie przewiduje, który model lepiej rozdzieli mówców na spotkaniu Vinseo. Temu służy nagranie próbne.

### Opcje, których nie włączyłem do końcowej pary

**Fakt.** OpenAI `gpt-4o-transcribe-diarize` kosztuje około $0.006 za minutę, czyli około $108 za 300 godzin, i ma zostać wyłączony 26 lutego 2027 roku. Wskazany zamiennik dla nowych zadań transkrypcji nie obsługuje etykiet mówców. Źródło: [OpenAI transcription guide](https://developers.openai.com/api/docs/guides/transcription), [pricing](https://developers.openai.com/api/docs/pricing).

**Fakt.** `faster-whisper` i wagi Whisper pozwalają na użycie komercyjne (MIT). Kod pyannote jest objęty MIT, a wagi Community-1 są objęte CC-BY-4.0, więc użycie komercyjne jest dozwolone z podaniem autorstwa. Stos samodzielnie hostowany może utrzymać audio na maszynie kontrolowanej przez firmę. Kosztem jest czas GPU i osoba odpowiedzialna za uruchamianie rozwiązania. Nie mierzyłem przepustowości, więc nie podałem kwoty w dolarach. Źródło: [pyannote on self-hosting cost](https://www.pyannote.ai/blog/build-vs.-buy-the-real-cost-of-self-hosting-diarization), sierpień 2026.

## 3. Jak dokonałem wyboru

Porównałem hostowane modele, które mogą przyjąć jeden plik i zwrócić tekst wraz z etykietami mówców, ponieważ właśnie to może obsłużyć zmiksowany plik MP4. Końcowa para to Universal-2 i Scribe v2. Samodzielnie hostowane Whisper wraz z pyannote pozostało opcją na wypadek, gdyby audio nie mogło opuszczać firmy albo gdyby próbka pokazała, że żaden hostowany model nie potrafi rozdzielić mówców. Model diarizacji OpenAI odpadł ze względu na datę wyłączenia. Universal-3.5 Pro odpadł, ponieważ nie obsługuje języka polskiego.

Nie wybrałem AssemblyAI dlatego, że żądanie jest prostsze. Scribe to jedno żądanie: plik, `scribe_v2` i `diarize=true`. Universal-2 trzeba przypiąć, przed działaniem etykiet mówców trzeba włączyć interpunkcję, a pary języków nie można łączyć z automatycznym wykrywaniem języka. Dla pliku 45-minutowego obie strony powinny zwrócić wynik przez webhook albo polling, więc kształt pipeline'u jest taki sam. Łatwość konfiguracji nie była powodem wyboru.

Nie wybrałem też AssemblyAI z powodu potwierdzonej różnicy w dokładności języka polskiego. Opublikowany przedział dla języka polskiego w Scribe jest węższy. Universal-2 jest jedynym z tych dwóch modeli, dla którego podano polską liczbę, a ta liczba dotyczy mowy czytanej. Potraktowałem te przedziały jako powód do testu, a nie jako wynik.

Powodem wyboru AssemblyAI jest kopia danych przy zwykłym kluczu API. Universal-2 można skierować do hosta EU bez umowy sprzedażowej, a przesłane audio jest przechowywane przez około dobę, zaś transkrypcja najwyżej 30 dni, krócej po ustawieniu time-to-live. Scribe przy zwykłym kluczu przechowuje historię w Stanach Zjednoczonych do czasu jej usunięcia, a konfiguracja EU z natychmiastowym usuwaniem jest funkcją Enterprise, bez publicznej ceny. Piętnaście dolarów miesięcznie to różnica między $51 a $66. W tym wolumenie właśnie tyle kosztują host EU i zegar usuwania. Przy keyterms różnica nadal wynosi piętnaście dolarów: $66 wobec $81.

Po drodze odrzuciłem jeden argument. Pierwsze porównanie traktowało „mogą trenować na audio” jako punkt na korzyść AssemblyAI. Wyłączę trenowanie, więc ten punkt nie rozstrzyga. Porównanie trzeba było powtórzyć wyłącznie pod kątem miejsca i czasu przechowywania.

Odrzuciłem również endpoint EU jako wynik prawny. Przechowywanie kopii roboczej w UE oznacza, że sama ta kopia nie jest transferem do Stanów Zjednoczonych, więc nie zależy od utrzymania ważności decyzji o adekwatności. Nie oznacza to, że nagranie pozostaje w EOG. Dane konta są w USA, wsparcie może otworzyć plik spoza UE, a addendum mówi, że transfer do USA jest częścią usługi. Zdalny dostęp z państwa trzeciego do danych przechowywanych w EOG nadal jest transferem według wytycznych Europejskiej Rady Ochrony Danych 05/2021. Mogę opisać to w dokumencie. Nie mogę zatwierdzić tego prawnie. To pytanie do specjalisty w sekcji 8.

## 4. Do czego zobowiązuje ten wybór

Na potrzeby dokumentu i późniejszego prawdziwego klienta zamierzone żądanie wygląda tak:

- Host `https://api.eu.assemblyai.com`.
- Wyłącznie `speech_models`: `["universal-2"]`, aby zmiana wartości domyślnej nie wysłała języka polskiego do Universal-3.5 Pro.
- `language_codes`: `["en", "pl"]`. Nie ustawiaj jednocześnie `language_detection`.
- `speaker_labels: true` i `punctuate: true`.
- Zakres liczby mówców, nie dokładna liczba. Zadanie mówi o 2–6 uczestnikach, a dokładna błędna liczba pogarsza diarizację.
- Keyterms tylko wtedy, gdy próbka pokaże, że angielskie nazwy kampanii są przepisywane jako polskie. Dodaje to $0.05 za godzinę, czyli $15 miesięcznie przy 300 godzinach.
- Najkrótszy time-to-live dozwolony przez konto oraz żądanie usunięcia po zapisaniu segmentów po naszej stronie.
- Rezygnacja z trenowania ustawiona jako przełącznik, a nie jako powód wyboru dostawcy.

**Założenie.** Wysyłane bajty to wyodrębnione audio z MP4, a nie wideo. Plik z Meet zawiera twarze. Transkrybent potrzebuje dźwięku. Nie uczyniłem z tego osobnej decyzji w rozmowie. Wynika to z wysłania nagrania do zewnętrznej usługi.

Kod zadania może trzymać tego klienta za stubem. Zadanie nie wymaga działającego dostawcy. Wybór jest potrzebny do dokumentu. Stub powinien jednak zwracać segmenty w kształcie używanym przez to API: start, end, text i etykietę mówcy lokalną dla pliku.

## 5. Co zmieniłoby ten wybór

- Specjalista powie, że endpoint EU nie zmienia transferu, a ElevenLabs Enterprise z EU residency i Zero Retention Mode jest konfiguracją, która rzeczywiście spełnia ograniczenie. Wtedy poproszę o tę cenę i porównam ją z $51. Jeśli Enterprise jest niedostępne, self-hosting pozostaje sposobem na utrzymanie audio w firmie.
- Jeden polski plik z `speaker_labels` zostanie odrzucony. Wtedy Universal-2 nie spełnia wymagania, a nie tylko przegrywa benchmark.
- Nagranie próbne okaże się wyraźnie lepsze w Scribe, zarówno pod względem słów, jak i przerw między mówcami. Wtedy albo zaakceptuję kopię w USA z ręcznym usunięciem, albo zapłacę za Enterprise, albo pozostanę przy Universal-2 i zapiszę, z jakiej jakości rezygnuję.
- Oba modele zawiodą na próbce w ten sam sposób: jeden mówca zostanie podzielony na dwóch, dwie osoby zostaną sklejone, a angielskie nazwy znikną. Wtedy diarizacja zmiksowanego pliku jest niewłaściwym narzędziem dla tego audio, a do self-hostingu wrócę tylko wtedy, gdy będzie powód sądzić, że inny model poradzi sobie lepiej. Inna ścieżka przechwytywania to zmiana w `notes/transcription-workflow-recap.md`, a nie parametr tego żądania.
- Google doda język polski do zapisanych transkrypcji Meet. Te wpisy już zawierają uczestnika Meet. Zastąpiłyby diarizację dla spotkań, na których włączono transkrypcję. Ten warunek jest już zapisany w dokumencie workflow.

## 6. Jak użyto AI

AI (Cursor, w tej rozmowie) zebrało dokumentację dostawców, ceny i warunki prawne oraz porównało Universal-2 z Scribe v2. Prosiłem o źródła, gdy twierdzenie było podsumowaniem. Odrzuciłem argument dotyczący trenowania. Nie zaakceptowałem stwierdzenia „AssemblyAI jest lepsze”, dopóki różnica nie została przedstawiona jako konkretna kopia: gdzie się znajduje i kiedy jest usuwana. Wybór w sekcji 1 należy do mnie, łącznie z dwiema kontrolami. Rekomendacją modelu było AssemblyAI. Zachowałem ją i uczyniłem oba warunki zmiany częścią decyzji, a nie przypisami.

### Co zleciłem modelowi

- Opcje rozpoznawania mowy, zaczynając od ElevenLabs, w tym ścieżkę bez zewnętrznego API.
- Listę języków Universal-3.5 Pro wraz ze źródłem. Czy Universal-2 i Universal-3.5 Pro obsługują diarizację. Czy warunki przechowywania i prawne rzeczywiście się różnią. Koszt obu modeli AssemblyAI z diarizacją.
- Ponowne sprawdzenie różnicy prawnej, z pominięciem trenowania, a następnie tego, co przechowywanie w UE zmienia w prawie.
- Bezpośrednie porównanie kosztów Scribe v2 i Universal-2.
- Który model lepiej obsługuje język polski.
- Które API łatwiej skonfigurować.
- Końcowe porównanie, żebym mógł podjąć decyzję.

### Co zweryfikowałem, ponieważ pierwsza odpowiedź nie wystarczyła

- 18 języków. Poprosiłem o listę i źródło. Strona code-switching je wymienia. Strona realtime podaje kody. Polskiego na niej nie ma. Pierwsza wersja mówiła, że Universal-3.5 Pro może nie obejmować języka polskiego. Lista jest faktem.
- Diarizację. Cennik, zaktualizowany 2026-10-27, wycenia ją dla Universal-2 i Universal-3.5 Pro. Nadal nie ma komórki język–funkcja dla języka polskiego. To pozostaje testem, a nie faktem.
- Endpoint EU. Nie uznałem „dane pozostają w UE” za koniec pytania. Sama strona dotycząca rezydencji wymienia dane konta w USA, subprocessory z USA dla nazw plików oraz dostęp wsparcia spoza regionu. Addendum mówi, że podstawowe przetwarzanie odbywa się w Stanach Zjednoczonych.
- Wynik Scribe dla języka polskiego. Wartość 2.3% FLEURS na stronie produktu jest oznaczona jako wynik Scribe v1. v2 ma tylko przedział „at or below 5%”.
- Marketingową wartość $0.40. Cennik API i FAQ dotyczące cen podają $0.22. Użyłem cennika.

### Co zmieniłem względem wersji roboczych modelu

- Trenowanie na audio klienta nie jest powodem wyboru. Wyłączę je. Model używał tego jako argumentu na rzecz AssemblyAI. Zleciłem ponowne porównanie.
- „Przechowywane w UE” nie jest wnioskiem prawnym. Model wyjaśnił zasady transferu, a gdy powiedziałem, że nadal nie widzę przewagi, ujął ją jako zwykłą kopię: UE i około doby wobec historii w USA do czasu usunięcia. Zachowałem to zdanie, a zatwierdzenie prawne pozostawiłem specjaliście.
- Rekomendacja była warunkowa: zależała od próbki i od nieudanego testu diarizacji. Uczyniłem oba warunki jawnymi i dodałem specjalistę, zanim nazwałem wybór ostatecznym.

### Przykładowe prompty z tej rozmowy

Żądanie źródeł, a nie podsumowania:

> Podaj listę języków jaką obsługuje assembly universal 3.5 pro, podaj źródło. Sprawdź czy modele universal-2 i universal-3.5 pro obsługują diaryzację. Sprawdź czy faktycznie jest różnica pomiędzy assemblyai i elevenlabs w kontekście przechowywania danych i innych sprawach prawnych.

Odrzucenie argumentu o trenowaniu:

> Nie podnoś argumentu o używania nagrań do treningów, po prostu to wyłączę.

Decyzja z dwiema kontrolami:

> Ostatecznie wybieram assemblyAi z ważnym zastrzeżeniem - musiałbym poprosić o wyjaśnienie kwestii przechowywania danych elevenlabs vs assemblyai specjalistę. Oprócz tego potrzebowałbym jakiegoś przykładowego nagrania rozmowy, żeby móc przetestować, który model poradzi sobie z nim najlepiej i czy w ogóle jakiś sobie poradzi, czy trzeba inaczej podejść do rozwiązania tego problemu.

## 7. Part A, pytanie 4: transkrypcja i rozpoznawanie mówców

To jest część, która należy do dokumentu decyzyjnego. Model podsumowujący nie jest tu wybierany.

**Model.** AssemblyAI Universal-2, speech to text i diarizacja mówców w jednym żądaniu. Universal-3.5 Pro jest nowszym modelem dostawcy i nie obsługuje języka polskiego, dlatego żądanie wskazuje Universal-2 i nie polega na domyślnym fallbacku.

**Rozpoznawanie mówców.** Plik z Meet jest jednym zmiksowanym nagraniem. Model oznacza fragmenty audio jako speaker A, B, C. Etykiety te są lokalne dla pliku. Nie są kontami Google. Uczestnicy spotkania później mapują etykietę na uczestnika, zgodnie z dokumentem workflow. Meet nie może dostarczyć takiego podziału dla języka polskiego. Jego zapisane transkrypcje nie obejmują języka polskiego.

**Jakość dla języka polskiego.** Universal-2 znajduje się w grupie wysokiej dokładności dostawcy, z word error rate nie większym niż 10%, a wynik FLEURS dostawcy dla języka polskiego wynosi 6.63% (styczeń 2026). Angielski na tym samym zbiorze osiąga 4.38%. FLEURS to mowa czytana, a nie spotkanie. Scribe v2 umieszcza polski w węższym przedziale, nie większym niż 5%, i nie publikuje wyniku dla języka polskiego dla v2. Żaden dostawca nie publikuje, jak często etykieta mówcy jest błędna przy nakładającym się audio ze spotkania. Nie będę traktować 6.63% jako błędu, którego doświadczy Vinseo. Nagranie próbne rozstrzyga, czy wynik jest wystarczający oraz czy którykolwiek hostowany model działa na tym audio.

**Angielski wewnątrz języka polskiego.** Nazwy kampanii i żargon to przypadek opisany w zadaniu. Universal-2 można przypiąć jednocześnie do angielskiego i polskiego, co jest maksimum dozwolonym przez jego code switching. Jeśli próbka przepisuje te nazwy, następnym przełącznikiem są keyterms w cenie $0.05 za godzinę.

**Koszt.** Przy 300 godzinach, jednym strumieniu mono i standardowej diarizacji: $0.15 + $0.02 = $0.17 za godzinę, **$51 miesięcznie**. Eksperymentalna diarizacja, jeśli próbka jej wymaga, kosztuje $0.215 za godzinę, **$64.50**. Keyterms dodają $15, do **$66**. Scribe v2 przy stawce API $0.22 kosztuje **$66**, albo **$81** z keyterms. Host EU nie zmienia ceny AssemblyAI. Plik stereo rozliczany za kanał podwoiłby kwotę AssemblyAI. Pipeline powinien wysyłać jedną ścieżkę mono.

**Prywatność.** Kopia robocza audio i transkrypcji jest przetwarzana w UE, gdy klient korzysta z `api.eu.assemblyai.com`. Usuwanie przesłanego audio zaczyna się po 24 godzinach. Transkrypcja jest przechowywana do 30 dni albo krócej, jeśli ustawiono time-to-live, i jest usuwana przez API po zapisaniu segmentów po naszej stronie. Nie jest to zero retention ani zamknięta skrzynka EOG. Dane konta i rozliczeń pozostają w USA. Wsparcie może otworzyć nagranie spoza UE. Addendum mówi, że transfer do Stanów Zjednoczonych jest konieczny do świadczenia usługi. Trenowanie jest wyłączone i nie stanowi podstawy wyboru. Specjalista nadal musi powiedzieć, czy jest to akceptowalne dla spotkań z klientami. Do tego czasu dokument powinien opisywać kopię, a nie nazywać rozwiązania zgodnym z prawem.

**Utrzymanie.** Nie ma modelu do hostowania ani GPU do monitorowania. Praca operacyjna polega na przypięciu identyfikatora modelu, zapisaniu identyfikatora zadania dostawcy, aby ponowienie nie utworzyło drugiej transkrypcji, usunięciu kopii u dostawcy po udanym zapisie oraz zauważeniu zmiany ceny albo listy języków. Awaria dostawcy zatrzymuje ten krok. Nie powoduje utraty spotkania, ponieważ identyfikator nagrania i ostatni ukończony krok pozostają w naszej bazie danych. Self-hosting przeniósłby tę pracę na GPU i aktualizacje modeli. Nie wybrałem go dla pierwszej wersji. Pozostaje opcją, jeśli audio nie może opuszczać firmy albo jeśli próbka pokaże, że hostowane modele nie potrafią wykonać zadania.

**Czego nie twierdzę.** Że diarizacja języka polskiego jest potwierdzona. Że nagranie nigdy nie opuszcza EOG. Że 6.63% to błąd na spotkaniu. Że wynik Scribe 2.3% FLEURS dotyczy v2. Że ten akapit wybiera model podsumowujący.

## 8. Pytania przed implementacją

### Do specjalisty, zanim uznamy dostawcę za zaakceptowanego

Proszę porównać poniższe dwa rozwiązania i powiedzieć, które z nich, jeśli którekolwiek, Vinseo może wykorzystać do nagrania spotkania z klientem. Potrzebuję różnicy w miejscu przechowywania kopii i czasie jej przechowywania. Wyłączę użycie audio klientów do trenowania modeli u wybranego dostawcy, więc trenowanie nie jest przedmiotem pytania.

AssemblyAI, zwykły klucz API, endpoint EU:

- Audio i transkrypcja są przetwarzane w UE. Dane konta i dane dotyczące użycia pozostają w USA. Nazwy plików mogą trafić do subprocessorów w USA. Wsparcie spoza UE może otworzyć audio.
- Przesłane audio jest usuwane od 24 godzin. Transkrypcja jest usuwana po 30 dniach albo wcześniej przy użyciu time-to-live, nawet po około jednej godzinie plus opóźnienie usuwania AWS. My również usunęlibyśmy ją przez API po zapisaniu segmentów.
- Addendum mówi, że podstawowe przetwarzanie odbywa się w Stanach Zjednoczonych i że transfer tam jest konieczny. AssemblyAI mówi, że posiada certyfikację w ramach EU-US Data Privacy Framework. Ta decyzja obowiązuje i jest przedmiotem odwołania (C-703/25 P).

ElevenLabs Scribe, zwykły klucz API:

- Kopia jest przechowywana w USA. Historia jest włączona. Nie ma opublikowanego okresu usuwania dla aktywnego konta. Usunięcie przez API usuwa audio i tekst. Logi i kopie zapasowe mogą pozostać, a kopie zapasowe do 30 dni.
- EU residency i Zero Retention Mode istnieją i oba są funkcjami Enterprise. Nie mam publicznej ceny.

Potrzebuję odpowiedzi na następujące pytania:

- Czy endpoint EU oznacza, że zwykła kopia nie jest transferem do USA, skoro wsparcie może ją otworzyć, a addendum zakłada transfer do USA?
- Jeśli w przypadku obu dostawców nadal występuje transfer, czy zegar usuwania AssemblyAI zmienia coś, co Vinseo może zrobić?
- Jeśli akceptowalny byłby wyłącznie ElevenLabs Enterprise, potrzebuję jasnego stwierdzenia, ponieważ zmienia to dostawcę i koszt.

### Do Vinseo, przed jakąkolwiek rozmową na żywo

- Czy możecie przekazać albo zatwierdzić jedno przykładowe nagranie brzmiące jak wasze spotkania: język polski, angielskie nazwy kampanii i żargon, od dwóch do sześciu mówców, nakładające się wypowiedzi, jedna zmiksowana ścieżka? Nie może to być prawdziwe spotkanie z klientem.
- Przepuszczę ten plik przez Universal-2 i Scribe v2 oraz porównam słowa i podziały między mówcami. Jeśli żaden wynik nie będzie użyteczny, wrócę z innym podejściem, zamiast dostrajać żądanie.
- Czy około $51 miesięcznie za transkrypcję i diarizację, przed modelem podsumowującym, mieści się w zakładanym przez was budżecie? Eksperymentalna diarizacja kosztowałaby około $64.50. Keyterms, jeśli będą potrzebne dla nazw, dodają około $15.
- Jeśli próbka będzie wyraźnie lepsza w Scribe, czy akceptujecie kopię przechowywaną w USA na zwykłym kluczu API, czy chcecie najpierw wycenić konfigurację Enterprise?

### Kontrola, którą wykonam samodzielnie, na pliku bez danych klienta

- Jeden krótki polski klip, z włączonym `speaker_labels`, z `speech_models` ustawionym na Universal-2, wysłany do endpointu EU. Jeśli API zwróci błąd `speaker_labels` ze strony języków, Universal-2 odpada.
