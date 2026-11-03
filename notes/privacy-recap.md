# Bezpieczeństwo i prywatność

Poniższy opis przedstawia założenia pierwszej wersji systemu. Nie jest opinią
prawną. Jestem programistą, a nie prawnikiem, dlatego nie podejmuję decyzji
prawnych wyłącznie na podstawie informacji znalezionych przez AI. Przed
uruchomieniem produkcyjnym założenia dotyczące RODO, zgód, dostawców i
retencji powinny zostać zweryfikowane przez specjalistę ds. ochrony danych lub
prawnika.

## Zgoda na nagrywanie

Nagrywane są wyłącznie spotkania, w których wszyscy uczestnicy wyrażą zgodę na
nagrywanie. Zgoda jest osobna od zgody na korzystanie z aplikacji.

Na początku spotkania klientom wyświetlane lub odczytywane jest pytanie o zgodę
na nagrywanie. Pracownicy wyrażają zgodę za pośrednictwem swojego konta w
aplikacji, połączonego z kontem Google Workspace. System powinien zapisać
informację o udzieleniu lub odmowie zgody, identyfikator uczestnika oraz czas
decyzji.

Jeżeli choć jedna osoba nie wyrazi zgody, nagranie nie powinno zostać
rozpoczęte. Jeżeli uczestnik wycofa zgodę w trakcie spotkania, nagrywanie
powinno zostać natychmiast przerwane, a nagranie usunięte. W praktyce trzeba
jeszcze potwierdzić, czy Google Meet udostępnia wystarczające możliwości
techniczne do wymuszenia takiego działania przez aplikację. Przy przyjętych
uprawnieniach aplikacja odczytuje dane i nagrania, ale nie ma uprawnień do
zarządzania spotkaniem. Jeżeli nie może zatrzymać nagrania sama, procedura
musi wymagać zatrzymania go przez prowadzącego, a aplikacja nie może pobrać
pliku utworzonego po wycofaniu zgody.

Mechanizm zgody powinien obejmować również uczestników dołączających później.
Do czasu uzyskania ich zgody nie powinni być traktowani jako objęci zgodą na
przetwarzanie.

Sama funkcja zgody w interfejsie nie rozstrzyga podstawy prawnej przetwarzania.
Należy ustalić, czy dla pracowników i klientów właściwa jest zgoda, prawnie
uzasadniony interes, wykonanie umowy czy inna podstawa. W szczególności trzeba
zweryfikować, czy zgoda pracownika może być uznana za dobrowolną w relacji
pracodawca–pracownik.

## Spotkania poufne

Poufne spotkania nie są nagrywane ani importowane do systemu. W pierwszej
wersji system może opierać się na ręcznej decyzji organizatora, ale lepszym
zabezpieczeniem jest dodatkowa etykieta w Google Calendar, na przykład
`confidential` albo `do-not-record`.

Etykieta może służyć jako zabezpieczenie warstwowe: jeżeli ktoś przypadkowo
włączy nagrywanie, system nie powinien pobrać ani przetworzyć takiego pliku.
Trzeba jednak potwierdzić, czy Google Meet rzeczywiście pozwala skonfigurować
etykietę lub regułę powodującą, że nagranie nie zostanie zapisane. Sama etykieta
w Kalendarzu nie jest automatycznie gwarancją techniczną.

Każde spotkanie może zostać przetworzone po ręcznej akceptacji. Domyślnie nie
ma jednak automatycznego importu spotkań poufnych ani spotkań bez kompletu
zgód.

## Dane przekazywane poza organizację

System korzysta wyłącznie z wcześniej zatwierdzonych dostawców zewnętrznych.
W planowanym wariancie:

- AssemblyAI służy do transkrypcji i diarizacji nagrania,
- osobny, zatwierdzony dostawca LLM tworzy streszczenie i zadania,
- Google Workspace pozostaje źródłem nagrania, uczestników i tożsamości.

Do dostawcy transkrypcji wysyłana jest tylko ścieżka audio, bez obrazu z pliku
MP4. Do dostawcy LLM wysyłane są segmenty wypowiedzi, lokalne identyfikatory
mówców (`speaker_1`, `speaker_2`) oraz role (`employee`, `client`,
`unknown`).

Do zewnętrznych modeli nie wysyłamy:

- imion i nazwisk,
- adresów e-mail,
- mapowania identyfikatora mówcy na osobę,
- pełnej listy uczestników jako legendy,
- danych, które nie są potrzebne do wykonania danego kroku.

Pseudonimizacja ogranicza zakres danych przekazywanych dostawcy, ale nie
czyni ich anonimowymi. Vinseo nadal może połączyć segment z konkretną osobą,
więc transkrypcja pozostaje daną osobową.

Przed wyborem dostawców trzeba sprawdzić umowę powierzenia, lokalizację
przetwarzania, transfery poza EOG, podwykonawców, retencję, dostęp pracowników
supportu i możliwość usunięcia danych. Należy również potwierdzić, że
dostawcy nie wykorzystują danych Vinseo w sposób niezgodny z ustalonym celem.
To wymaga konsultacji prawnej i nie może zostać uznane za rozstrzygnięte na
podstawie samej dokumentacji technicznej dostawcy.

## Retencja danych

Przyjęte limity dla pierwszej wersji są następujące:

- kopia MP4: maksymalnie 48 godzin,
- wyodrębniony plik audio: tylko przez czas potrzebny do ręcznego mapowania
  mówców, maksymalnie 7 dni,
- transkrypcja, streszczenie i zadania: 24 miesiące,
- dane dostawcy zewnętrznego: usuwane tak szybko, jak pozwala na to jego
  konfiguracja i proces techniczny; po zapisaniu wyniku w bazie aplikacja
  wysyła żądanie usunięcia,
- backupy: usuwane zgodnie z odrębną polityką retencji backupów.

Okres 24 miesięcy jest założeniem technicznym, a nie decyzją prawną ani
ostateczną decyzją biznesową. Przed startem trzeba zapytać, jak długo Vinseo
rzeczywiście musi przechowywać transkrypcje, streszczenia i zadania, zwłaszcza
w kontekście historii współpracy z klientem.

Retencja powinna być egzekwowana automatycznie przez zadania porządkujące,
które usuwają dane pochodne i zapisują wynik operacji w audycie. Logi nie
powinny zawierać treści rozmów ani całych transkrypcji.

## Wycofanie zgody i usunięcie danych

Po wycofaniu zgody lub zaakceptowanym żądaniu usunięcia usuwane są wszystkie
dane związane ze spotkaniem:

- MP4 i plik audio,
- segmenty transkrypcji,
- streszczenie,
- zadania,
- mapowania mówców,
- indeksy wyszukiwania i inne dane pochodne,
- kopie przechowywane przez dostawców zewnętrznych, o ile dostawca je
  posiada.

Z aktywnych systemów dane są usuwane bezpośrednio. Backupy wygasają zgodnie z
przyjętą retencją backupów i nie są przywracane do środowiska produkcyjnego
bez ponownego zastosowania reguł usuwania. Tę procedurę, jej terminy i zakres
trzeba zaakceptować z osobą odpowiedzialną za ochronę danych.

## Dostęp do spotkań

W pierwszej wersji dostęp do spotkania, transkrypcji, streszczenia i zadań mają
wyłącznie uczestnicy tego spotkania. Organizator, który nie uczestniczył w
spotkaniu, nie otrzymuje dostępu tylko dlatego, że utworzył wydarzenie lub jest
oznaczony jako organizator w Google Calendar. To rozróżnienie jest świadomą
decyzją: organizacja spotkania nie oznacza automatycznie prawa do zapoznania się
z jego treścią.

Nie ma udostępniania spotkań ani transkrypcji osobom, które nie uczestniczyły w
rozmowie. Dotyczy to również później dołączających członków zespołu i osób,
które przejęły obsługę projektu. Sam fakt pracy w Vinseo, przynależności do
zespołu lub dostępu do kalendarza nie wystarcza. Możliwość udostępniania
transkrypcji innym osobom z zespołu pozostaje funkcjonalnością do omówienia
przed realizacją projektu, a nie zakresem pierwszej wersji.

Decyzja ogranicza ryzyko ujawnienia treści rozmów poufnych, rozmów 1:1,
rekrutacji i spotkań z klientami. Ma też konsekwencję operacyjną: nowa osoba
pracująca przy kliencie nie zobaczy automatycznie historycznych ustaleń. Jeżeli
w przyszłości biznes będzie potrzebował takiego dostępu, należy wprowadzić
jawny mechanizm udostępniania z audytem, datą nadania i możliwością odebrania,
a nie rozszerzać dostępu na podstawie roli organizatora lub członkostwa w
firmie.

Autoryzacja musi być wykonywana w API przed każdym odczytem transkrypcji,
streszczenia, zadania lub nagrania oraz przed wysłaniem jakiegokolwiek fragmentu
do modelu. Interfejs nie może być jedyną warstwą ochrony. Sprawdzenie powinno
opierać się na stabilnym identyfikatorze uwierzytelnionego konta Google, a nie
na nazwie lub adresie przekazanym w żądaniu. Każdy endpoint powinien odrzucać
dostęp domyślnie i sprawdzać uczestnictwo dla konkretnego identyfikatora
spotkania, aby zapobiec błędom typu IDOR.

### Wyszukiwanie i asystent

Wyszukiwarka przeszukuje wyłącznie streszczenia spotkań, których użytkownik
jest uczestnikiem. Filtrowanie uprawnień musi nastąpić przed wyszukiwaniem, a
nie dopiero po znalezieniu wyników. W przeciwnym razie system mógłby ujawnić
tytuł spotkania, istnienie rozmowy, fragment treści albo wynik podobieństwa
wektorowego, mimo że końcowy dokument zostałby później ukryty.

Bezpieczny przepływ wygląda następująco:

1. API uwierzytelnia użytkownika i ustala jego identyfikator.
2. Warstwa dostępu ogranicza zbiór spotkań do tych, w których użytkownik
   uczestniczył.
3. Wyszukiwanie pełnotekstowe lub wektorowe działa tylko na tym zbiorze.
4. Wyniki oraz źródła są ponownie sprawdzane przed zwróceniem odpowiedzi.
5. Asystent otrzymuje wyłącznie dozwolone fragmenty i nie dostaje całej bazy.

Asystent nie może samodzielnie decydować, czy użytkownik ma prawo do danych.
Model może generować odpowiedź tylko z autoryzowanego kontekstu, a link do
źródła również musi ponownie sprawdzać uprawnienia. Przy braku dostępu należy
zwrócić neutralną informację, bez potwierdzania istnienia ukrytego spotkania.

Trzeba zabezpieczyć również cache odpowiedzi, historię rozmowy z asystentem,
indeksy wektorowe, podpowiedzi wyszukiwania, eksporty, powiadomienia i logi.
Odebranie dostępu musi wykluczyć dane z kolejnych wyszukiwań oraz unieważnić
cache. Audyt powinien rejestrować odczyty i próby nieautoryzowanego dostępu,
ale nie powinien przechowywać pełnych transkrypcji.

## Odchodzący pracownik

Po odejściu pracownika jego dostęp do Google Workspace i aplikacji jest
natychmiast odbierany. Dane historyczne spotkań nie są automatycznie usuwane,
ponieważ mogą być częścią historii projektu lub współpracy z klientem.

Mapowanie wypowiedzi takiej osoby może pozostać w historii spotkania. Inny
uczestnik spotkania, który nadal ma do niego dostęp, może skorygować mapowanie.
Osoba, która nie uczestniczyła w rozmowie, nie powinna otrzymać prawa do
przypisywania głosu tylko dlatego, że przejęła projekt.

## Historia zmian i audyt

System zachowuje pełną historię mapowania mówców: kto, kiedy i jakie
przypisanie utworzył, zmienił lub usunął. Jest to potrzebne, ponieważ błędne
mapowanie może zmienić autora wypowiedzi albo właściciela zadania.

Przed startem projektu trzeba również ustalić zakres audytu technicznego.
Chodzi o odpowiedź na pytanie, jakie operacje system ma rejestrować, na
przykład:

- pobranie nagrania,
- uruchomienie i zakończenie przetwarzania,
- odczyt danych,
- zmiana uprawnień,
- mapowanie mówcy,
- eksport lub udostępnienie danych,
- usunięcie danych,
- błąd albo próba dostępu bez uprawnień.

Audyt powinien rejestrować użytkownika, czas, typ operacji i identyfikator
obiektu, ale nie treść nagrania ani pełną transkrypcję. Właściciel procesu
audytowego i obsługi incydentów pozostaje pytaniem do zespołu przed realizacją
projektu.

## DPIA i konsultacja specjalistyczna

Przed każdym użyciem produkcyjnym należy wykonać analizę skutków dla ochrony
danych (DPIA), jeżeli specjalista uzna ją za wymaganą, oraz zaakceptować
ryzyko związane z nagrywaniem rozmów z klientami i automatycznym
przetwarzaniem treści.

Do konsultacji ze specjalistą pozostają przede wszystkim:

1. właściwa podstawa prawna dla pracowników i klientów,
2. treść obowiązku informacyjnego,
3. dopuszczalność wymagania zgody pracownika,
4. umowy powierzenia i transfery danych do dostawców,
5. ostateczne okresy retencji,
6. procedura realizacji żądań usunięcia,
7. zakres wymaganej DPIA,
8. zgodność mechanizmu wycofania zgody z możliwościami Google Meet.

Nie deklaruję, że rozwiązanie jest zgodne z RODO na podstawie samego projektu
technicznego. Projekt ogranicza zakres danych, stosuje zasadę najmniejszych
uprawnień i przewiduje usuwanie danych, ale formalna ocena zgodności należy do
wyznaczonego specjalisty.
