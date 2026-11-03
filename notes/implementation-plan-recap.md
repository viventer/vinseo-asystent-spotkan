# Plan wdrożenia

## Założenie

Wdrożenie dzielimy na cztery kolejne poziomy: koncept i kod zadania,
prototyp API z prawdziwymi usługami AI, wewnętrzne MVP oraz wdrożenie firmowe.
Dopiero po zebraniu feedbacku ustalamy zakres kolejnych funkcji.

## Etap 0: koncept i zakres zadania

- opisać problem biznesowy i oczekiwany przepływ użytkownika;
- opisać architekturę, model danych, pipeline i obsługę awarii;
- opisać źródło nagrań, wybór narzędzi i modeli oraz koszty;
- opisać prywatność, zgody, retencję i reguły dostępu;
- opisać środowiska oraz sposób testowania bez danych firmy;
- opisać ryzyka, pytania otwarte, etapy wdrożenia i kryteria sukcesu;
- przygotować kod z części B:
  - model danych i API,
  - pipeline przetwarzania,
  - walidację struktury wyniku,
  - autoryzację,
  - ochronę danych wysyłanych poza system,
  - testy idempotencji, awarii i dostępu;
- użyć atrapy transkrypcji i streszczenia wyłącznie do weryfikacji szkieletu;
- pominąć symulowane źródło nagrań i nagrania testowe, ponieważ przy atrapach
  transkrypcji nie weryfikują jeszcze istotnej funkcjonalności.

## Etap 1: prototyp API

- dodać bucket w Google Cloud Storage jako źródło nagrań;
- zintegrować prawdziwą transkrypcję i diarizację w AssemblyAI;
- zintegrować prawdziwe API modelu AI do streszczeń, decyzji i zadań;
- zapisywać polską transkrypcję z lokalnymi identyfikatorami mówców;
- zapisywać zwalidowane streszczenia i zadania w ustalonej strukturze;
- zachować retry, idempotencję, statusy przetwarzania i obsługę błędów;
- dodać retencję i usuwanie nagrań oraz danych pochodnych;
- testować na zatwierdzonych, niepoufnych nagraniach;
- zweryfikować jakość transkrypcji, diarizacji, streszczeń i zadań;
- nie implementować jeszcze przypisywania mówców do uczestników;
- nie implementować jeszcze integracji z Google Meet i Google Drive.

## Etap 2: wewnętrzne MVP

- dodać integrację z Google Meet i Google Drive;
- dodać logowanie przez Google Workspace;
- dodać prosty frontend:
  - listę spotkań,
  - status przetwarzania,
  - transkrypcję,
  - streszczenie i zadania,
  - ekran przypisywania mówców;
- umożliwić uczestnikowi spotkania przypisanie mówcy do uczestnika;
- obsłużyć role `employee`, `client` i `unknown`;
- pozostawić nierozpoznanych mówców jako lokalne identyfikatory;
- egzekwować autoryzację spotkania po stronie API;
- uruchomić pilotaż na kilku niskowrażliwych spotkaniach wewnętrznych;
- wykluczyć spotkania klientów, HR, rekrutacyjne, zarządu, prawne,
  finansowe i poufne;
- zebrać feedback oraz pomiary jakości, czasu, błędów i kosztów.

## Etap 3: przygotowanie i wdrożenie dla całej firmy

Przed wdrożeniem dla całej firmy należy:

- potwierdzić, że system nie ma nieusuniętych krytycznych luk;
- potwierdzić wystarczającą jakość transkrypcji, diarizacji, streszczeń i
  zadań;
- potwierdzić działanie integracji, retry, usuwania, retencji i backupów;
- uruchomić monitoring API, workerów, kolejki, bazy, storage i dostawców;
- ustalić właściciela systemu, instrukcje i procedurę incydentów;
- przygotować obsługę dostępu dla całej firmy zgodnie z zasadą dostępu
  uczestników.

Po spełnieniu tych warunków można wdrożyć system dla całej firmy.

## Etap 4: działanie po wdrożeniu i rozwój na podstawie feedbacku

- zbierać feedback od użytkowników;
- monitorować rzeczywistą jakość, błędy, czas przetwarzania i koszty;
- monitorować próby nieuprawnionego dostępu i incydenty;
- analizować, które problemy i potrzeby powinny mieć najwyższy priorytet;
- dopiero wtedy określić zakres:
  - wyszukiwarki transkrypcji,
  - asystenta odpowiadającego na pytania ze źródłami,
  - edycji transkrypcji,
  - scalania i dzielenia mówców,
  - powiadomień i integracji z systemem zadań,
  - jawnego udostępniania danych osobom spoza spotkania;
- każdą nową funkcję testować osobno pod kątem jakości, bezpieczeństwa,
  prywatności i kosztu.

## Kryteria przejścia dalej

- brak nieautoryzowanego dostępu lub ujawnienia danych;
- działający i idempotentny pipeline;
- poprawna walidacja wyników AI;
- użyteczna transkrypcja, diarizacja, streszczenia i zadania;
- akceptowalny czas i koszt przetwarzania;
- pozytywny feedback użytkowników MVP;
- brak nierozwiązanych krytycznych problemów bezpieczeństwa i prywatności.
