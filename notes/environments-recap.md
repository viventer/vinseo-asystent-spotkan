# Środowiska i dane testowe

Ta decyzja odpowiada na pytanie 7 z części A: jak rozwijać i testować system
bez dostępu do prawdziwych nagrań i danych firmy.

## Podsumowanie decyzji

System będzie rozwijany w oddzielnych środowiskach lokalnym, testowym,
stagingowym i produkcyjnym. Środowiska lokalne i testowe będą korzystać z
danych syntetycznych, fixture'ów i atrap dostawców. Staging będzie korzystał z
syntetycznych nagrań oraz, opcjonalnie, z minimalnych testów integracyjnych z
zatwierdzonymi dostawcami zewnętrznymi. Prawdziwe spotkania zostaną
wprowadzone dopiero w ramach małego, jawnie zatwierdzonego pilotażu, po
zweryfikowaniu zabezpieczeń technicznych i prywatności.

Żadna produkcyjna baza danych, nagrania, dane dostępowe, kolejki, lokalizacje
plików ani webhooki nie będą współdzielone ze środowiskami
nieprodukcyjnymi.

## Rozwój lokalny

Środowisko lokalne będzie uruchamiać API, workery, PostgreSQL i Redis przez
Docker Compose. Źródło nagrań, dostawca transkrypcji i dostawca LLM będą
ukryte za wymienialnymi adapterami. Lokalnie będą używane atrapy zwracające
deterministyczne fixture'y.

Zestaw fixture'ów będzie obejmował:

- rozmowy po polsku z angielskimi nazwami kampanii i branżowymi skrótami;
- kilku mówców i nakładające się wypowiedzi;
- brakujące nagrania i awarie dostawców;
- niepoprawny wynik modelu;
- ponowienia i wznowienie po awarii workera;
- wycofanie zgody i usuwanie danych;
- uczestników, osoby nieuczestniczące oraz organizatorów, którzy nie brali
  udziału.

## Testy automatyczne

Testy jednostkowe i integracyjne będą działać bez zewnętrznych modeli i
prawdziwych danych firmy. Sprawdzą:

- idempotentne przetwarzanie i wznowienie po awarii;
- ponowienia oraz trwałe błędy dostawców;
- walidację odpowiedzi modelu przez Zod;
- wycofanie zgody i usuwanie danych;
- wykonywaną po stronie serwera autoryzację z zasadą odmowy domyślnej;
- reguły dostępu uczestników i osób nieuczestniczących;
- filtrowanie uprawnień przed wyszukiwaniem, gdy wyszukiwanie zostanie
  zaimplementowane;
- że nieuprawniony kontekst nigdy nie jest wysyłany do modelu.

Dla interfejsów dostawców będą także osobne testy kontraktowe. Sprawdzą one,
czy rzeczywisty adapter spełnia ten sam kontrakt wejścia i wyjścia co atrapa.

## Środowisko testowe

Środowisko testowe będzie używać schematu i migracji produkcyjnych, ale jego
baza zostanie zasilona wyłącznie seedami i fixture'ami. Będzie mieć osobne
bazy, kolejki, magazyny plików, projekty u dostawców, klucze API i endpointy
webhooków.

Testy z dostawcami zewnętrznymi będą domyślnie wyłączone. Po włączeniu będą
korzystać wyłącznie z minimalnego syntetycznego audio lub tekstu oraz
dedykowanych danych dostępowych nieprodukcyjnych.

## Staging i pilotaż

Staging zostanie najpierw zweryfikowany na syntetycznych nagraniach. Weryfikacja
obejmie migracje, ponowienia, monitoring, retencję, usuwanie danych,
autoryzację oraz pełny przepływ od importu do streszczenia.

Przed użyciem produkcyjnym pracownicy będą mogli tworzyć fikcyjne spotkania
testowe za wyraźną zgodą uczestników. Nagrania posłużą do oceny realistycznej
jakości audio, polskiej mowy, angielskich terminów, przerw i diarizacji
mówców, bez używania danych klientów.

Dopiero po tej weryfikacji może rozpocząć się mały pilotaż prawdziwych spotkań
o niskiej wrażliwości. Każdy uczestnik musi udzielić wymaganej zgody. Początkowo
wykluczone zostaną spotkania poufne oraz dotyczące klientów, HR, zarządu,
kwestii prawnych lub finansowych. Pilotaż będzie miał krótką retencję, ręczną
weryfikację wyników, ograniczoną grupę użytkowników, procedury usuwania danych
i audyt.

## Rozważane alternatywy

### Wyłącznie dane syntetyczne

To najbezpieczniejsza i najprostsza opcja. Wystarcza do testowania pipeline'u,
modelu danych, awarii, walidacji i autoryzacji, ale nie pozwala potwierdzić
jakości transkrypcji ani diarizacji na prawdziwym audio.

### Zredagowane lub zanonimizowane transkrypcje

Zapewniają bardziej realistyczny język niż dane w pełni syntetyczne, ale trudno
zagwarantować skuteczną anonimizację. Mogą nadal być danymi osobowymi lub
poufnymi, a redakcja może usunąć kontekst potrzebny do oceny.

### Fikcyjne spotkania nagrane specjalnie do testów

To preferowany sposób oceny jakości audio przed pilotażem. Zapewnia realistyczne
nagrania bez używania prawdziwych informacji klientów, ale nadal wymaga zgody
uczestników, kontrolowanej retencji i usuwania danych.

### Bezpośredni pilotaż produkcyjny

Daje najbardziej realistyczną informację zwrotną, ale wiąże się z największym
ryzykiem prywatności i ryzykiem operacyjnym. Należy go odłożyć do czasu
zweryfikowania zabezpieczeń oraz umów z dostawcami.

## Ryzyka i ograniczenia

Syntetyczne fixture'y mogą być czystsze niż prawdziwe nagrania i nie
odzwierciedlać akcentów, hałasu, przerw, przełączania języków ani terminologii
klientów. Zachowanie dostawców może też różnić się od zachowania atrap. Te
braki zostaną uzupełnione przez fikcyjne spotkania nagrane specjalnie do
testów i ograniczony pilotaż, a nie przez kopiowanie danych produkcyjnych do
środowisk deweloperskich.
