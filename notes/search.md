# Wyszukiwanie i asystent spotkań

Rejestr decyzji dotyczący wyszukiwania transkrypcji spotkań i odpowiadania na pytania ze źródłami. Sporządzony 2026-11-02 na podstawie dyskusji i decyzji podjętych przed implementacją.

Ten rejestr opisuje planowaną funkcję w późniejszej wersji. Wyszukiwanie i asystent są wyraźnie poza zakresem pierwszej wersji.

## 1. Podsumowanie decyzji

### Wyszukiwanie odroczone względem pierwszej wersji

**Wybrano.** Pierwsza wersja nie będzie implementować wyszukiwania transkrypcji ani asystenta odpowiadającego na pytania.

**Powody.**

- Wyszukiwanie nie jest konieczne, aby pozostała część systemu działała poprawnie.
- Pozostałe funkcje zapewniają już wystarczającą wartość do zweryfikowania pomysłu na produkt za pomocą MVP: importowanie spotkania, jego przetwarzanie, przygotowanie polskiej transkrypcji, wygenerowanie ustrukturyzowanego podsumowania, wyodrębnienie zadań i egzekwowanie kontroli dostępu.
- Poprawna implementacja i testowanie wyszukiwania wymagałyby znacznie więcej czasu, ponieważ obejmują wiele przypadków brzegowych i różne typy pytań.
- Wyszukiwanie jest funkcją wrażliwą z punktu widzenia bezpieczeństwa: niepoprawny filtr pobierania danych lub wygenerowana odpowiedź może ujawnić spotkanie, fragment transkrypcji, nazwę klienta albo zadanie osobie bez dostępu.
- Jakości wyszukiwania nie można zweryfikować wyłącznie za pomocą testów frameworka; potrzebny jest reprezentatywny, niepoufny zestaw ewaluacyjny obejmujący język polski, angielskie nazwy kampanii, parafrazy, literówki, liczby, daty i pytania dotyczące wielu spotkań.

**Konsekwencja.** Pierwsza wersja nadal musi przechowywać stabilne identyfikatory spotkań, segmentów, podsumowań, zadań, mówców i uprawnień, aby można było dodać wyszukiwanie bez przeprojektowywania potoku przetwarzania.

**To nie jest decyzja o rezygnacji.** Nie oznacza to, że wyszukiwanie jest niepotrzebne w docelowym produkcie; oznacza, że wymagany poziom jakości i bezpieczeństwa jest zbyt wysoki dla zakresu implementacji pierwszej wersji.

## 2. Planowana technologia

Planowana implementacja pozostaje w ramach wybranej architektury TypeScript i PostgreSQL:

- **NestJS** będzie udostępniać API wyszukiwania oraz koordynować planowanie zapytań, autoryzację, pobieranie danych, wywołania modeli i walidację odpowiedzi.
- **PostgreSQL** pozostanie źródłem prawdy dla spotkań, uczestników, mapowań mówców, segmentów transkrypcji, podsumowań, zadań, uprawnień i odwołań do źródeł.
- `pg_trgm` będzie wspierać dopasowanie leksykalne nazw, nazw firm, tytułów, identyfikatorów kampanii, liczb i literówek.
- `pgvector` będzie przechowywać embeddingi i wspierać dopasowanie semantyczne parafraz oraz powiązanych terminów, takich jak „budget” i „media spend”.
- **Vercel AI SDK** zapewni niezależne od dostawcy API do generowania embeddingów i ustrukturyzowanych odpowiedzi, w tym walidację za pomocą Zod.
- **OpenAI** jest pierwszym kandydatem na dostawcę embeddingów i generowania odpowiedzi, z zastrzeżeniem takiej samej weryfikacji prawnej, regionalnego przetwarzania danych, retencji i jakości jak w przypadku pozostałych dostawców modeli.
- **Zod** będzie walidować sparsowany plan zapytania, wyodrębnione wartości, wygenerowaną odpowiedź i identyfikatory źródeł.

Ten wybór technologii nie upoważnia do dodawania `pgvector`, `pg_trgm`, dostawców modeli ani zależności wyszukiwania do pierwszej wersji.

## 3. Zasady wyszukiwania

1. Autoryzacja odbywa się przed pobraniem danych i przed wysłaniem jakiegokolwiek tekstu do modelu.
2. Model nigdy nie przeszukuje korpusu obejmującego całą firmę i nigdy nie jest traktowany jako zaufany mechanizm egzekwowania uprawnień.
3. API wybiera materiał dowodowy; model zapisuje odpowiedź wyłącznie na podstawie tego materiału.
4. Cytaty ze źródeł są po wygenerowaniu wczytywane dosłownie z PostgreSQL, zamiast ufać tekstowi wygenerowanemu przez model.
5. Nazwy i adresy e-mail mówców pozostają w wewnętrznych tabelach mapowań i są rozwiązywane dopiero w odpowiedzi wyświetlanej uprawnionemu wywołującemu.
6. Nieprzypisani mówcy nie są zgadywani na podstawie listy uczestników.
7. Operacje matematyczne, zliczanie i porównania wykonuje kod aplikacji, a nie model.
8. Wynik o niskiej pewności lub niejednoznaczny powoduje zwrócenie prośby o doprecyzowanie albo odpowiedzi o niewystarczających danych zamiast zgadywania.

## 4. Przepływ indeksowania

1. Po zapisaniu segmentów transkrypcji worker grupuje sąsiednie segmenty w przeszukiwalne fragmenty zawierające identyfikator spotkania, zakres czasu, identyfikatory segmentów, identyfikatory mówców oraz tekst bez nazw osób i adresów e-mail.
2. Po pomyślnym przejściu walidacji przez ustrukturyzowane podsumowanie worker zapisuje decyzje i zadania wraz z identyfikatorami mówców, rolami i identyfikatorami segmentów źródłowych.
3. Worker generuje embeddingi dla fragmentów, decyzji i zadań, używając tego samego modelu embeddingowego, który jest używany dla zapytań.
4. PostgreSQL przechowuje embeddingi i tworzy indeksy leksykalne dla przeszukiwalnego tekstu.
5. Zmiana mapowania mówcy nie zmienia surowych fragmentów transkrypcji, ale może uruchomić ponowne wygenerowanie i indeksowanie powiązanych ustrukturyzowanych decyzji.
6. Każdy przeszukiwalny rekord zachowuje identyfikator spotkania, aby predykat autoryzacji można było zastosować do każdego zapytania pobierającego dane.

Transkrypcja jest przeszukiwalna, ale decyzje i zadania otrzymują wyższy priorytet rankingu, ponieważ zawierają więcej informacji istotnych dla pytań o ustalenia i odpowiedzialności.

## 5. Typowy przepływ zapytania

1. Endpoint NestJS otrzymuje identyfikator uwierzytelnionego użytkownika, pytanie oraz opcjonalny kontekst, taki jak spotkanie aktualnie otwarte w interfejsie.
2. Warstwa autoryzacji buduje zbiór spotkań, które użytkownik może odczytać.
3. Planista zapytań klasyfikuje pytanie jako obsługiwane pytanie dotyczące spotkania, prośbę o doprecyzowanie, porównanie, listę, zliczenie, zapytanie o metadane albo zapytanie nieobsługiwane.
4. Planista wyodrębnia potencjalne encje, zakresy czasu, odwołania do spotkań, tematy, oczekiwany format wyniku oraz wymagania dotyczące porównania lub zliczania.
5. API rozwiązuje nazwy i firmy względem uprawnionych osób i spotkań, używając dopasowania leksykalnego tolerującego literówki.
6. Jeśli nazwa ma wiele prawdopodobnych dopasowań, API prosi użytkownika o wybór zamiast zgadywać.
7. API rozwiązuje jawne zakresy czasu, zakresy względne, takie jak „ostatnie spotkanie”, spotkanie otwarte w interfejsie, tytuły, nazwy kampanii lub wiele jawnie wskazanych spotkań.
8. Jeśli pytanie zawiera wyłącznie temat i nie ma użytecznego zakresu, API prosi o klienta, spotkanie lub zakres czasu i nie wywołuje modelu.
9. API stosuje ustalony zakres i filtr autoryzacji przed pobraniem jakiegokolwiek rekordu transkrypcji, decyzji, zadania lub uczestnika.
10. Warstwa pobierania danych łączy semantyczne podobieństwo wektorowe z podobieństwem leksykalnym i scala rankingi.
11. Warstwa pobierania danych nadaje priorytet decyzjom i zadaniom, a następnie dodaje sąsiednie fragmenty transkrypcji jako materiał wspierający.
12. Materiał dowodowy od nieprzypisanych mówców jest wykluczany, gdy pytanie wymaga tożsamości osoby, a odpowiedź odnotowuje, że część rozmowy może być niekompletna.
13. Jeśli wynik punktowy materiału dowodowego jest niższy od skonfigurowanego progu, API zwraca informację, że dostępne spotkania nie zawierają odpowiedzi dostatecznie popartej dowodami.
14. Budowniczy promptu wysyła wyłącznie wybrany materiał dowodowy, lokalne identyfikatory mówców, role i pytanie, bez legendy mapującej mówców na osoby.
15. Model zwraca odpowiedź zwalidowaną przez Zod oraz odwołania do dostarczonych rekordów materiału dowodowego.
16. API odrzuca niepoprawny wynik, w odpowiednich przypadkach ponawia próbę raz i po drugim niepowodzeniu zwraca błąd bez publikowania niezwalidowanej odpowiedzi.
17. API przecina zwrócone odwołania z autoryzowanym zbiorem materiału dowodowego i odrzuca odwołania, które nie zostały dostarczone modelowi.
18. API pobiera z PostgreSQL dokładny tekst źródłowy, znaczniki czasu, metadane spotkania i mapowania mówców.
19. Serializer odpowiedzi rozwiązuje identyfikatory mówców na nazwy wyłącznie dla uprawnionego wywołującego.
20. Endpoint zwraca odpowiedź, cytaty ze źródeł, identyfikatory spotkań, znaczniki czasu oraz wszelkie komunikaty o ograniczeniach lub potrzebie doprecyzowania.

## 6. Obsługiwane typy pytań

### Pojedynczy fakt lub ustalenie

- **Dotyczy:** Jednego ustalenia, decyzji, zadania lub odpowiedzi w określonym spotkaniu, w odniesieniu do określonej osoby lub klienta albo w określonym zakresie czasu.
- **Obsługiwane przez planowany przepływ:** Tak; najpierw pobierane są decyzje i zadania, następnie używane są fragmenty transkrypcji jako materiał dowodowy i zwracane jest źródło.
- **Dodatkowa praca:** Brak poza wspólnym przepływem.

### Temat bez zakresu

- **Dotyczy:** Pytania takiego jak „Jaki budżet uzgodniliśmy?” bez osoby, spotkania, tytułu ani zakresu czasu.
- **Obsługiwane przez planowany przepływ:** Tak; przepływ zatrzymuje się przed pobraniem danych i prosi o więcej szczegółów.
- **Dodatkowa praca:** Brak poza walidacją zakresu zapytania.

### Względny lub jawny czas

- **Dotyczy:** „Na ostatnim spotkaniu”, „wczoraj”, „w tym miesiącu” lub nazwanego zakresu dat.
- **Obsługiwane przez planowany przepływ:** Tak; zakres jest rozwiązywany przed pobraniem danych i stosowany do uprawnionych spotkań.
- **Dodatkowa praca:** Przechowywanie wiarygodnych czasów rozpoczęcia spotkań oraz zdefiniowanie, że „ostatnie spotkanie” oznacza najnowsze spotkanie, w którym wywołujący uczestniczył i które może odczytać, chyba że decyzja produktowa zmieni tę definicję.

### Osoba, firma lub kampania z literówką

- **Dotyczy:** Niepoprawnie wpisanej lub odmienionej nazwy osoby, nazwy firmy, kodu kampanii albo tytułu.
- **Obsługiwane przez planowany przepływ:** Tak; `pg_trgm` jest łączone z pobieraniem semantycznym, a przy niejednoznacznych dopasowaniach użytkownik proszony jest o wybór.
- **Dodatkowa praca:** Utrzymywanie aliasów i niewielkiego słownika dziedzinowego, jeśli ewaluacja pokaże, że embeddingi i dopasowanie trójgramowe pomijają powtarzające się terminy branżowe.

### Wypowiedź konkretnej osoby

- **Dotyczy:** „Co Bartek powiedział o budżecie?”
- **Obsługiwane przez planowany przepływ:** Tak, gdy mówca został ręcznie przypisany do tej osoby; pobierane są wyłącznie segmenty powiązane z tym mapowaniem.
- **Dodatkowa praca:** Nie wnioskować o mówcy na podstawie listy uczestników i informować, gdy wykluczono nieprzypisane wypowiedzi.

### Ostatnie spotkanie bez wskazania osoby

- **Dotyczy:** „Jaki budżet uzgodniliśmy na ostatnim spotkaniu?”
- **Obsługiwane przez planowany przepływ:** Tak; używane jest najnowsze uprawnione spotkanie z odpowiedniego zbioru spotkań wywołującego i wyszukiwanie odbywa się wyłącznie w nim.
- **Dodatkowa praca:** Uwidocznić regułę zakresu w odpowiedzi, zwracając datę i tytuł wybranego spotkania.

### Porównanie dwóch spotkań

- **Dotyczy:** „O jaki procent klient X zmniejszył budżet kampanii?”
- **Obsługiwane przez planowany przepływ:** Nie w pełni w podstawowym przepływie pojedynczego wyniku, ponieważ pytanie wymaga dwóch zgodnych wartości z różnych spotkań.
- **Dodatkowa praca:** Dodać plan porównania, który pobiera wiele spotkań, wyodrębnia kwotę, walutę, okres, kampanię i datę, łączy porównywalne wartości, oblicza procent w kodzie aplikacji i cytuje oba spotkania.

### Szereg czasowy

- **Dotyczy:** Sposobu, w jaki budżet lub decyzja zmieniały się na przestrzeni kilku spotkań.
- **Obsługiwane przez planowany przepływ:** Nie w pełni w podstawowym przepływie pojedynczego wyniku, ponieważ musi zachować wiele wartości uporządkowanych chronologicznie.
- **Dodatkowa praca:** Dodać plan szeregu, który zwraca uporządkowane wyodrębnione wartości z jednym źródłem lub większą ich liczbą dla każdej wartości.

### Wiele jawnie wskazanych spotkań

- **Dotyczy:** Pytania porównującego lub podsumowującego co najmniej dwa konkretne spotkania albo daty.
- **Obsługiwane przez planowany przepływ:** Częściowo; jeden resolver zakresu jest niewystarczający dla wielu niezależnych zakresów.
- **Dodatkowa praca:** Umożliwić listę zakresów i pobierać materiał dowodowy osobno dla każdego z nich przed połączeniem odpowiedzi.

### Wiele tematów w jednym pytaniu

- **Dotyczy:** „Co ustaliliśmy w sprawie budżetu i kto odpowiada za kreację?”
- **Obsługiwane przez planowany przepływ:** Częściowo; jeden ranking może nadać nadmierny priorytet jednemu tematowi.
- **Dodatkowa praca:** Podzielić pytanie na podzapytania, pobrać dane niezależnie dla każdego z nich i połączyć zwalidowane wyniki.

### Lista wszystkich decyzji lub zadań

- **Dotyczy:** Każdego zadania lub ustalenia w określonym spotkaniu albo zakresie czasu.
- **Obsługiwane przez planowany przepływ:** Nie przez przepływ odpowiedzi top-k, ponieważ ranking podobieństwa nie jest kompletnym zbiorem wyników.
- **Dodatkowa praca:** Dodać plan listy z filtrowaniem SQL, paginacją, stabilnym porządkiem i jawną gwarancją kompletności.

### Zliczanie lub agregacja

- **Dotyczy:** „Ile spotkań wspominało o budżecie?” lub „Ile zadań jest przeterminowanych?”
- **Obsługiwane przez planowany przepływ:** Nie przez pobieranie top-k, ponieważ odpowiedź wymaga kompletnego przefiltrowanego zbioru.
- **Dodatkowa praca:** Dodać plan agregacji za pomocą SQL albo zwalidowanego ustrukturyzowanego wyodrębniania, a następnie agregację po stronie kodu.

### Metadane spotkania

- **Dotyczy:** Uczestników, daty spotkania, tytułu, organizatora lub informacji, czy dana osoba uczestniczyła.
- **Obsługiwane przez planowany przepływ:** Nie przez samo pobieranie transkrypcji.
- **Dodatkowa praca:** Dodać plan metadanych oparty bezpośrednio na autoryzowanych tabelach relacyjnych.

### Sprzeczne ustalenia

- **Dotyczy:** Różne spotkania zawierają niezgodne wartości budżetu lub decyzje.
- **Obsługiwane przez planowany przepływ:** Nie w sposób niezawodny, jeśli zachowywany jest tylko najwyżej sklasyfikowany wynik.
- **Dodatkowa praca:** Pobrać wszystkie istotne ustrukturyzowane decyzje w zakresie, wykryć niezgodne wartości i przedstawić oba źródła zamiast po cichu wybierać jedno.

### Pytanie uzupełniające

- **Dotyczy:** „A ile wynosiło to wcześniej?” po poprzedniej odpowiedzi.
- **Obsługiwane przez planowany przepływ:** Nie bez stanu konwersacji.
- **Dodatkowa praca:** Utrwalać lub przekazywać do następnego żądania poprzedni zwalidowany plan zapytania, encję, temat i zakres źródeł.

### Dokładny cytat lub weryfikacja

- **Dotyczy:** Sprawdzenia, czy wypowiedziano konkretne sformułowanie i gdzie to nastąpiło.
- **Obsługiwane przez planowany przepływ:** Tak dla pobranego materiału dowodowego, z dokładnym tekstem wczytanym z transkrypcji.
- **Dodatkowa praca:** Oznaczyć, czy źródłem jest surowy segment transkrypcji, czy wygenerowana ustrukturyzowana decyzja.

### Pytanie spoza domeny spotkań

- **Dotyczy:** Pytania niezwiązanego ze spotkaniami, transkrypcjami, ustaleniami lub zadaniami.
- **Obsługiwane przez planowany przepływ:** Nie bez jawnego klasyfikatora domeny.
- **Dodatkowa praca:** Dodać wczesną odpowiedź dla nieobsługiwanej intencji i nie wykonywać pobierania danych.

### Porada lub rekomendacja

- **Dotyczy:** Tego, co firma powinna zrobić, a nie tego, co zostało uzgodnione.
- **Obsługiwane przez planowany przepływ:** Nie jako odpowiedź na fakt dotyczący spotkania; nieograniczone doradztwo wykraczałoby poza kontrakt materiału dowodowego.
- **Dodatkowa praca:** Albo odrzucić żądanie, albo zdefiniować osobny, wyraźnie oznaczony tryb porad z innymi zasadami produktowymi i bezpieczeństwa.

### Status realizacji zadania

- **Dotyczy:** Informacji, czy uzgodnione zadanie zostało faktycznie wykonane.
- **Obsługiwane przez planowany przepływ:** Nie, jeśli system przechowuje wyłącznie informację o przypisaniu zadania.
- **Dodatkowa praca:** Dodać źródło statusu zadania lub integrację; w przeciwnym razie informować, że system zna ustalenie, ale nie stan jego realizacji.

## 7. Przypadki brzegowe i wymagane zachowanie

- **Brak dostępnych pasujących spotkań:** zwrócić brak wyniku bez ujawniania, czy istnieje niedostępne spotkanie.
- **Niejednoznaczna osoba lub firma:** poprosić użytkownika o wybranie kandydata i nie wywoływać modelu.
- **Brak użytecznego zakresu:** poprosić o osobę, klienta, spotkanie, tytuł, kampanię lub zakres czasu i nie wywoływać modelu.
- **Brak dostatecznie podobnego materiału dowodowego:** stwierdzić, że dostępny zakres nie zawiera odpowiedzi popartej dowodami, zamiast zgadywać.
- **Istnieje tylko jedna strona porównania:** podać znalezioną wartość i poprosić o drugi okres lub spotkanie.
- **Różne waluty, okresy lub kampanie:** nie obliczać porównania, dopóki użytkownik nie doprecyzuje danych lub rekordy nie staną się porównywalne.
- **Zerowa wartość bazowa w obliczeniu procentowym:** zwrócić wartości bez procentu i wyjaśnić, że procent jest niezdefiniowany.
- **Nieprzypisany mówca:** nie przypisywać automatycznie osoby i wyraźnie zaznaczyć, że materiał dowodowy może być niekompletny.
- **Sprzeczne wartości:** zacytować sprzeczne spotkania i zapytać, która interpretacja lub jaki okres jest właściwy.
- **Model zwraca źródło, którego nie otrzymał:** odrzucić odwołanie i potraktować odpowiedź jako nieprawidłową.
- **Wynik modelu dwukrotnie nie przechodzi walidacji Zod:** zwrócić błąd bez zapisywania ani wyświetlania niezwalidowanej odpowiedzi.
- **Imię i nazwisko osoby występuje jako zwykłe słowo tematyczne:** nie rozwiązywać go do mówcy bez silnego dopasowania encji i dowodów kontekstowych.
- **Liczby i kody:** zachować pobieranie leksykalne obok embeddingów, ponieważ dokładne liczby, identyfikatory kampanii i skróty nie są wiarygodnie reprezentowane wyłącznie przez podobieństwo semantyczne.
- **Usunięte lub wygasłe źródło:** zwrócić wynik ustrukturyzowany tylko wtedy, gdy zezwala na to polityka przechowywania źródeł; w przeciwnym razie poinformować, że źródło nie jest już dostępne.

## 8. Rozważane alternatywy

### Wyszukiwanie wyłącznie w ustrukturyzowanych podsumowaniach

Jest tańsze i prostsze, ale pomija dokładne cytaty, zastrzeżenia i szczegóły, które podsumowanie pominęło, więc jest niewystarczające jako ostateczny projekt.

### Wyszukiwanie wyłącznie w surowych transkrypcjach

Zachowuje pełność i źródła, ale generuje więcej szumu i ułatwia wybranie luźnej wypowiedzi zamiast potwierdzonego ustalenia.

### Wysyłanie całej historii do LLM

Pozwala uniknąć indeksu wyszukiwania w małym prototypie, ale słabo skaluje się, kosztuje więcej, ułatwia pominięcie szczegółów i nie pozwala bezpiecznie egzekwować kontroli dostępu wewnątrz promptu.

### Użycie Elasticsearch, Typesense lub osobnego hostowanego silnika wyszukiwania

Są to możliwe rozwiązania, jeśli wyszukiwanie stanie się duże lub będzie wymagać zaawansowanego autouzupełniania, ale dodają drugi magazyn danych, synchronizację, koszt operacyjny i kolejną granicę autoryzacji bez wyraźnej korzyści przy oczekiwanej początkowej skali.

## 9. Plan weryfikacji dla późniejszej wersji

Przed implementacją funkcji należy przygotować niepoufny zestaw ewaluacyjny z pytaniami i oczekiwanymi rekordami źródłowymi, obejmujący:

- polską fleksję, literówki i angielskie terminy marketingowe;
- dokładne kwoty, waluty, wartości procentowe, identyfikatory kampanii i daty;
- pytania dotyczące jednego spotkania, wielu spotkań, list, zliczeń, porównań i pytań uzupełniających;
- niejednoznaczne nazwy, brak zakresu, sprzeczne decyzje i nieprzypisanych mówców;
- użytkowników z różnymi uprawnieniami do spotkań;
- próby pobrania niedostępnych spotkań lub sfabrykowania źródeł.

Należy mierzyć pełność odzyskiwania, precyzję źródeł, wierność odpowiedzi, odsetek próśb o doprecyzowanie, odsetek nieautoryzowanych wyników, opóźnienie i koszt pytania. Odsetek nieautoryzowanych wyników musi wynosić zero przed włączeniem funkcji dla rzeczywistych danych klientów.
