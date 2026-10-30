# Zadanie rekrutacyjne: Mid Fullstack Developer, Vinseo
## Firmowy asystent spotkań

Dziękujemy za rozmowę. Zostało nam jedno zadanie, które pokazuje, jak podchodzisz do realnego problemu: od potrzeby biznesowej, przez architekturę, po kod.

## 1. Problem

Vinseo to agencja e-commerce: prowadzimy kampanie reklamowe i sprzedaż klientów na Allegro i innych marketplace'ach. Pracujemy w Google Workspace. Codziennie mamy dziesiątki spotkań:
- wewnętrznych: zespoły, rozmowy 1:1, rekrutacje, zarząd.
- zewnętrznych: klienci, dostawcy usług

Ustalenia ze spotkań giną. Nikt nie pamięta, co obiecaliśmy klientowi dwa tygodnie temu, zadania z ustaleń nie trafiają do zespołu, a nowa osoba w projekcie nie ma skąd wziąć historii.

Decyzja jest podjęta: budujemy własne rozwiązanie i nie kupujemy gotowego narzędzia. Ma działać dla całej firmy i:
- po spotkaniu daje transkrypcję po polsku z podziałem na mówców, krótkie streszczenie i listę ustaleń i zadań (kto, co, do kiedy),
- pozwala zapytać: „co ustaliliśmy z klientem X w sprawie budżetu?” i dostać odpowiedź ze wskazaniem źródła,
- daje każdemu dostęp tylko do tych spotkań, które powinien widzieć,
- nie wynosi danych klientów tam, gdzie nie powinny trafić.

Narzędzie ma działać w organizacji, która korzysta z Google Workspace. Technologie, modele, hosting i sposób pozyskiwania nagrań wybierasz sam. Oczekujemy tylko, że uzasadnisz wybory.

### Założenia do obliczeń

Możesz je zmienić, jeśli uzasadnisz dlaczego.
- około 40 osób, z czego około 25 regularnie ma spotkania,
- około 300 godzin spotkań miesięcznie, średnio 45 minut, 2–6 uczestników,
- język polski z wtrąceniami angielskimi (nazwy kampanii, skróty branżowe),
- część uczestników jest spoza firmy (klienci).

## 2. Co oddajesz

### Część A: dokument (maks. 5 stron)

Pisz dla osoby, która ma podjąć decyzję. Ma ją zrozumieć bez czytania kodu. Dokument powinien odpowiedzieć na pytania:
1. Skąd bierzesz nagrania lub transkrypcje i jakie uprawnienia są do tego potrzebne? Jak najmniejszym zakresem dostępu da się to zrobić?
2. Bezpieczeństwo i prywatność. Zgody uczestników, szczególnie klientów, RODO, czas przechowywania danych, co trafia do zewnętrznych usług, a co nie. Sytuacje brzegowe: odchodzący pracownik, spotkanie poufne, osoba, która nie zgadza się na nagrywanie.
3. Model dostępu. Kto widzi które spotkanie i streszczenie? Jak zadbać, żeby wyszukiwanie lub asystent nie ujawnił treści osobie bez dostępu?
4. Wybór narzędzi i modeli do transkrypcji, rozpoznania mówców i streszczeń: jakość dla polskiego, koszt, prywatność, utrzymanie.
5. Koszt miesięczny w co najmniej dwóch wariantach. Pokaż obliczenia, nie tylko wynik.
6. Architektura. Komponenty, przepływ danych (diagram mile widziany), co się dzieje, gdy któryś krok się nie powiedzie.
7. Środowiska. Jak rozwijać i testować system bez dostępu do prawdziwych nagrań i danych firmy?
8. Plan wdrożenia w etapach od pierwszej wersji do całej firmy. Co jest w pierwszej wersji, czego świadomie w niej nie ma, po czym poznamy, że działa?
9. Ryzyka i pytania, które zadałbyś nam przed startem.

### Część B: szkielet kodu (repozytorium)

Nie oczekujemy działającej integracji z Google ani prawdziwych modeli. Chcemy zobaczyć, jak układasz system, który później rozwijałby zespół. Fragmenty poza zakresem mogą być pseudokodem albo zaślepką z opisem.

Musi działać:
1. Model danych: spotkania, uczestnicy, transkrypcje, streszczenia, zadania, uprawnienia.
2. Przetwarzanie spotkania krok po kroku, od pojawienia się nagrania do zapisanego streszczenia. Wymagania:
   - ponowne uruchomienie albo awaria w połowie nie tworzy duplikatów i nie gubi spotkań,
   - symulowane źródło nagrań zamiast prawdziwego Google,
   - transkrypcja może być atrapą zwracającą przykładowe dane. Krok streszczenia może korzystać z prawdziwego modelu albo z atrapy,
   - wynik streszczenia ma ustaloną strukturę i jest walidowany. Opisz albo obsłuż sytuację, gdy model zwróci coś niepoprawnego.
3. Ochrona danych przed wysłaniem na zewnątrz, jeśli w Twojej architekturze coś wychodzi poza firmę. Może to być maskowanie, filtrowanie albo inny mechanizm. Z testami.
4. Kontrola dostępu do spotkań i streszczeń plus jeden punkt dostępu (API albo inny interfejs), który ją egzekwuje. Z testami reguł.
5. Uruchomienie całości jedną lub kilkoma komendami wraz z przepuszczeniem przykładowego spotkania.

Może być pseudokodem lub zaślepką:
- prawdziwa integracja z Google Workspace,
- powiadomienia,
- wyszukiwanie i asystent z odpowiedziami ze źródłami,
- interfejs użytkownika.

W README:
- jak uruchomić,
- co działa, co jest atrapą, czego nie zrobiłeś i dlaczego,
- jak używałeś AI przy tym zadaniu i co musiałeś poprawić po modelu.

## 3. Zasady

- Czas: Masz 5 dni roboczych. Jeśli zabraknie czasu, wybierz, co odpuszczasz, i to opisz. Dobre priorytety oceniamy wyżej niż wszystko zrobione “po łebkach”.
- Technologie: dowolne. Wybierz to, w czym dowieziesz najlepsze rozwiązanie, i uzasadnij wybór.
- AI: korzystaj z dowolnych narzędzi. Tak pracujemy na co dzień. Odpowiadasz jednak za każdą linię 
- Oddanie: link do repozytorium (publicznego albo prywatnego z dostępem dla wskazanego przez nas użytkownika), dokument w repozytorium albo jako PDF.
- Pytania: możesz pisać w trakcie. Dopytywanie przy niejasnych wymaganiach to część pracy, nie minus.

Bierzemy pod uwagę: trafność i uzasadnienie decyzji, bezpieczeństwo danych i dostępów, realność kosztów, czytelność kodu i testy, umiejętność ograniczenia zakresu oraz jakość komunikacji.

Powodzenia!
