# Jak używałem AI przy tym zadaniu

Ten dokument odpowiada na trzeci punkt README z zadania: jak używałem AI i co musiałem poprawić po modelu. Opiera się wyłącznie na zapisach w repozytorium (`AGENTS.md`, `notes/`, `docs/`). Nie opisuję tu korekt, których nie ma w notatkach.

## Podział ról

- **AI (Cursor):** research, zestawianie opcji z zaletami, wadami i ryzykami, sprawdzanie dokumentacji dostawców, szybka implementacja małych, zatwierdzonych kroków.
- **Ja:** wybór rozwiązań, zakres, kolejność prac, akceptacja każdego kroku i odpowiedzialność za kod.

Preferencji modelu nie traktowałem jako decyzji. Rekomendacja modelu była dla mnie jedną z opcji do porównania.

## Jak kontrolowałem model

Zasady pracy zapisałem w `AGENTS.md`, który Cursor wczytuje przy każdej rozmowie:

- kolejność pracy: analiza, plan, dyskusja alternatyw, moje potwierdzenie, mała implementacja, weryfikacja, podsumowanie;
- model proponuje i opisuje wady oraz zalety, a decyzje zostawia mnie;
- model pyta przed większą zmianą albo zmianą sprzeczną z dokumentami w `docs/`;
- rozróżnienie faktów zweryfikowanych od założeń;
- tylko technologie z `docs/tech-stack.md`; technologie z późniejszych wersji pozostają nieużyte;
- pliki Markdown model zmienia tylko na moją wyraźną prośbę;
- każdy plan ma cel, zakres, nie-cele, założenia, alternatywy, ryzyka, kroki weryfikacji i pytania otwarte.

Dzięki temu diff każdego etapu był na tyle mały, że mogłem go przejrzeć przed przejściem dalej.

## Research

Model zbierał dokumentację, ceny i warunki dostawców. Gdy odpowiedź była streszczeniem, prosiłem o źródło i datę. Wyniki zapisywałem w notatkach:

- stos technologiczny: NestJS vs FastAPI, kolejki, ORM, dostawcy modeli (`notes/tech-stack-recap.md`);
- pozyskiwanie nagrań z Google Meet (`notes/transcription-workflow-recap.md`);
- wybór modelu transkrypcji: AssemblyAI vs ElevenLabs Scribe (`notes/transcription-model-recap.md`);
- prywatność i dostęp (`notes/privacy-recap.md`, `docs/privacy.md`, `docs/authorization.md`).

W sprawach prawnych (RODO, transfer danych, retencja) nie podejmowałem decyzji na podstawie samych odpowiedzi AI. Jestem programistą, a nie prawnikiem, więc te założenia oznaczyłem jako wymagające weryfikacji przez specjalistę (`notes/privacy-recap.md`).

## Implementacja

Kod części B powstał w dziesięciu małych etapach według `docs/v0-api-building-plan.md`. Dla każdego etapu jest notatka w `notes/v0-implementation/` z celem, zmianami, testami i sekcją „Decyzje i konsekwencje”. Przykłady decyzji, które zapisałem po etapach:

- port adaptera zamiast bezpośredniego użycia dostawcy (etapy 6 i 7), żeby provider nie przeciekał do logiki domenowej;
- skończony, konfigurowalny retry zamiast nieskończonego ponawiania (etap 9);
- brak deterministycznego `jobId`, bo idempotencja jest odpowiedzialnością PostgreSQL i serwisów (etapy 8 i 9);
- demo korzysta z API, a nie z bazy, żeby sprawdzać prawdziwą ścieżkę z autoryzacją (etap 10);
- brak endpointu statusu pipeline'u, bo wykraczał poza zatwierdzony zakres (etap 10).

Notatki etapów 1-10 opisują głównie decyzje, a nie osobne korekty po AI. Dlatego w części o poprawkach niżej opieram się na notatkach z researchu i projektowania.

## Co musiałem poprawić po modelu

| Co zaproponował model | Co zrobiłem | Dlaczego |
| --- | --- | --- |
| Przewaga AssemblyAI, bo „mogą trenować na audio”. | Odrzuciłem argument i kazałem powtórzyć porównanie. | Wyłączę trenowanie, więc nie rozstrzyga wyboru. Porównanie zostało oparte na miejscu i czasie przechowywania kopii. |
| „Dane są przechowywane w UE” jako wniosek prawny. | Nie przyjąłem tego jako rozstrzygnięcia. | Dane konta są w USA, wsparcie może mieć dostęp spoza UE, a ocena transferu należy do specjalisty. Zostawiłem pytanie do specjalisty. |
| Streszczenie, że Meet Media API jest najlepszym sposobem na audio per uczestnik, a baner „brak nowych rejestracji” jako stan API. | Kazałem sprawdzić źródło. | Informacje o wydaniu z 2026-10-28 mówią o wycofaniu API, a endpointy znikają 2027-01-15. Ta opcja odpadła. |
| Streszczenie modelu o obsłudze polskiego w natywnych transkrypcjach Meet. | Nie przyjąłem go bez źródła. | Strona pomocy Meet (sprawdzona 2026-10-30) nie wymienia polskiego wśród obsługiwanych języków. Transkrypcję robimy sami. |
| Pierwsze porównania AssemblyAI vs ElevenLabs bez rozbicia na konkretne kopie danych. | Zażądałem opisu: gdzie jest kopia i kiedy jest usuwana. | Samo „AssemblyAI jest lepsze” nie wystarczało do decyzji. |
| Przypisywanie mówców do osób przez organizatora. | Zmieniłem na dowolnego wewnętrznego uczestnika z dostępem. | Organizator często nie uczestniczy w spotkaniu, a w tym projekcie nie ma dostępu, jeśli nie był uczestnikiem. |
| Imiona w prompcie LLM (pełne, samo imię, imię z inicjałem). | Odrzuciłem po porównaniu wariantów z identyfikatorami. | Imiona i e-maile zostają tylko w naszym API. Model dostaje lokalne identyfikatory mówców i rolę. |
| Scalanie, dzielenie i oznaczanie mówców jako „mixed” w pierwszej wersji. | Zachowałem na później. | Najpierw trzeba sprawdzić jakość diarizacji. Backchanneling jest zadaniem modelu, a nie filtrem na ekranie przypisywania. |
| Rekomendacja AssemblyAI. | Zachowałem ją, ale dodałem dwa jawne warunki zmiany decyzji: opinia specjalisty o przechowywaniu danych i test na przykładowym nagraniu (w tym diarizacja polskiego). | Rekomendacja była warunkowa. Warunki są częścią decyzji, a nie przypisem. |
| Sprzeczność między `docs/implementation-plan.md` a założeniami wersji zero (źródło nagrań, zgody i retencja). | Rozstrzygnąłem ją w `docs/version-zero.md`. | Wersja zero ma marker „nagranie gotowe” bez pliku audio. Zgody, retencja i usuwanie wchodzą przy wdrożeniu na całą firmę. |

## Przykładowe prompty

Prośba o źródła zamiast streszczenia:

> To media api jest na 100% niedostępne? zweryfikuj tą informację i podaj źródło.

Odrzucenie argumentu modelu:

> Nie podnoś argumentu o używania nagrań do treningów, po prostu to wyłączę.

Korekta kierunku:

> Każdy pracownik firmy, który był uczestnikiem spotkania może wykonać dopasowanie, nie tylko organizator.

Decyzja z warunkami:

> Ostatecznie wybieram assemblyAi z ważnym zastrzeżeniem - musiałbym poprosić o wyjaśnienie kwestii przechowywania danych elevenlabs vs assemblyai specjalistę. Oprócz tego potrzebowałbym jakiegoś przykładowego nagrania rozmowy, żeby móc przetestować, który model poradzi sobie z nim najlepiej i czy w ogóle jakiś sobie poradzi, czy trzeba inaczej podejść do rozwiązania tego problemu.

## Weryfikacja i odpowiedzialność

Za każdą linię kodu odpowiadam ja. Po każdym etapie sprawdzałem wynik narzędziami, nie samą deklaracją modelu:

- sprawdzenie typów (`tsc --noEmit`) i linter (`oxlint`);
- testy jednostkowe i e2e na PostgreSQL, Redis i BullMQ (osobna baza `vinseo_test`);
- uruchomienie `docker compose up --build` z czystą bazą, dwukrotne `docker compose run --rm demo` i restart workera, żeby sprawdzić brak duplikatów i brak utraty spotkania (opis w `notes/v0-implementation/phase-10.md`);
- ręczne sprawdzenie, że organizator, który nie uczestniczył, dostaje `404 not_found`, a uczestnik `200`.

Czego AI nie zastąpiło: oceny prawnej, wyboru zakresu na 5 dni pracy i decyzji, co świadomie odpuszczam (lista w README).
