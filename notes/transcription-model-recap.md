# Transcription model

Decision record for the speech-to-text model and for speaker separation on the mixed Meet recording. Written on 2026-10-30 from research and from the choice made before implementation.

This file is the full record. The Part A document should condense section 7. The README section on AI usage should follow section 6.

The summary model is a separate decision and is not in this file. Speaker ids, human mapping, and what the summary model is allowed to see stay as written in `notes/transcription-workflow-recap.md`. This file only picks the model that turns the recording into segments.

Claims below are marked **Fact** (checked against a source on the date given) or **Assumption** (not verified, and open to change).

## 1. The choice

**Chosen for the written answer: AssemblyAI Universal-2**, on the EU endpoint, with standard speaker diarization, the language pair English and Polish, and the shortest retention the API allows.

The choice is not closed. Two checks come before I treat it as settled, and either one can replace the model or the whole approach:

1. A specialist has to explain the storage difference between ElevenLabs and AssemblyAI. I will not treat the EU endpoint as a legal conclusion.
2. I need a sample conversation, close to a real Vinseo meeting, run through both models. The sample has to show that a model can separate speakers on this kind of audio. If neither can, the mixed-file approach has to change.

## 2. Verified facts

Checked on 2026-10-30. Prices are list prices, excluding tax. The volume is the assignment's 300 hours of meetings a month. The bill below assumes one mono hour of audio per hour of meeting. AssemblyAI bills multichannel audio per channel, so a stereo file sent as two channels would double that bill.

### What the assignment asks of this choice

**Fact.** Part A question 4 asks for the tools and models for transcription, speaker recognition, and summaries: quality for Polish, cost, privacy, and maintenance. Source: `docs/zadanie.md`.

**Fact.** Meetings are in Polish with English campaign names and jargon, usually 45 minutes, with 2–6 participants, some of them outside the company. About 300 hours a month. Source: `docs/zadanie.md`.

**Fact.** The recording is one mixed MP4. Speaker separation for the first version is diarization of that mix, producing speaker ids local to the meeting. Meet's own saved transcript does not include Polish. Source: `notes/transcription-workflow-recap.md`.

### AssemblyAI models and Polish

**Fact.** Universal-3.5 Pro supports 18 languages: English (global, Australian, British, US), Spanish, French, German, Italian, Portuguese, Arabic, Danish, Dutch, Finnish, Hebrew, Hindi, Japanese, Mandarin, Norwegian, Swedish, Turkish, and Vietnamese. Polish is not on that list. Language codes for the same 18 are published on the realtime language page. Sources: [Code switching](https://www.assemblyai.com/docs/pre-recorded-audio/code-switching), [Supported languages](https://www.assemblyai.com/docs/pre-recorded-audio/supported-languages), [Steer toward known languages](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/language-selection).

**Fact.** Universal-2 supports Polish. The language page puts Polish in the high-accuracy group, word error rate at or below 10%. On FLEURS, updated January 2026, Universal-2 scores 6.63% WER for Polish and 4.38% for English. Universal-3.5 Pro has no Polish score. The same page warns that public benchmarks can be inflated when a model was trained on the test set, and that a real evaluation should use one's own audio. Sources: [Supported languages](https://www.assemblyai.com/docs/pre-recorded-audio/supported-languages), [Benchmarks](https://www.assemblyai.com/docs/pre-recorded-audio/benchmarks).

**Fact.** If `speech_models` is omitted, it defaults to `["universal-3-5-pro", "universal-2"]`. Universal-3.5 Pro handles its 18 languages. Anything else falls back to Universal-2. Source: [Model selection](https://www.assemblyai.com/docs/pre-recorded-audio/select-the-speech-model).

**Fact.** Standard async diarization is an add-on of $0.02 per hour on Universal-3.5 Pro and on Universal-2. An experimental async diarization add-on is $0.065 per hour on both, described as better for many speakers or difficult audio. The diarization guide enables it with `speaker_labels`. The API requires `punctuate: true` when speaker labels are on. I did not find a table that says speaker labels work for every language. The language page says an unsupported feature, when the language is set by hand, fails the request, and the example error names `speaker_labels`. Sources: [pricing](https://www.assemblyai.com/pricing), last updated 2026-10-27, [Speaker diarization](https://www.assemblyai.com/docs/pre-recorded-audio/label-speakers), [Supported languages](https://www.assemblyai.com/docs/pre-recorded-audio/supported-languages).

**Fact.** On Universal-2, code switching is limited to two language codes, and one of them must be English. `["en", "pl"]` fits that rule. `language_codes` is not combined with `language_detection`. Source: [Code switching](https://www.assemblyai.com/docs/pre-recorded-audio/code-switching).

**Fact.** Keyterm prompting on Universal-2 async is $0.05 per hour, up to 200 terms. Source: [pricing](https://www.assemblyai.com/pricing).

### AssemblyAI price at 300 hours

**Fact.** Universal-2 is $0.15 per hour. With standard diarization the rate is $0.17 per hour. With experimental diarization it is $0.215 per hour. The EU endpoint is the same price. Source: [pricing](https://www.assemblyai.com/pricing).

| What is on                                    | Rate     | 300 hours |
| --------------------------------------------- | -------- | --------- |
| Universal-2 + standard diarization            | $0.17/h  | $51       |
| Universal-2 + experimental diarization        | $0.215/h | $64.50    |
| Universal-2 + standard diarization + keyterms | $0.22/h  | $66       |

**Assumption.** A fallback from Universal-3.5 Pro to Universal-2 is billed at the Universal-2 rate. The rate card is per model. I did not find a sentence that says the fallback is billed from `speech_model_used`. The request for this project sets `speech_models` to Universal-2 only, so the fallback price does not apply.

### AssemblyAI storage

**Fact.** The default endpoint processes audio in the United States. `api.eu.assemblyai.com` processes and stores audio and transcript data in the EU (Frankfurt, Stockholm, or Ireland). Account data and usage data stay in the United States. File names may be processed by CrowdStrike and Datadog in the United States. Support staff outside the EU may open the audio, and may use a US subprocessor to do it. Source: [Cloud endpoints and data residency](https://www.assemblyai.com/docs/pre-recorded-audio/select-the-region).

**Fact.** For pre-recorded transcription, with no custom time-to-live and no business-associate agreement: deletion of an uploaded audio file starts at 24 hours and is at most 48 hours. The finished transcript is deleted after 30 days. A time-to-live can be set down to one hour. That hour is when deletion starts in AWS. AssemblyAI says the bytes can take hours, and they have seen lags of a few days. A transcript can also be deleted by API. Zero retention of audio and transcript is described for streaming, sync speech-to-text, and dictation, not for this file-upload path. Some metadata stays for logs and billing. Source: [Data retention and model training](https://www.assemblyai.com/docs/data-retention-and-model-training).

**Fact.** The data-processing addendum effective 22 January 2026 says the customer acknowledges that AssemblyAI's primary processing is in the United States and that a transfer to the United States is necessary to provide the service. Transfers rely on the EU-US Data Privacy Framework where the recipient is certified, or on the EU standard contractual clauses. AssemblyAI's own FAQ says they are certified under the framework. Source: [Data processing addendum](https://www.assemblyai.com/legal/data-processing-addendum), [FAQ](https://www.assemblyai.com/docs/faq/has-assemblyai-certified-to-the-eu-us-data-privacy-framework).

**Fact.** The EU-US Data Privacy Framework adequacy decision is the Commission's decision of 10 July 2023. The General Court dismissed the challenge on 3 September 2025 (T-553/23). An appeal, C-703/25 P, was filed on 31 October 2025 and was still pending at the end of October 2026, with no judgment found. Sources: [General Court press release](https://curia.europa.eu/site/upload/docs/application/pdf/2025-09/cp250106en.pdf), [notice of appeal](https://eur-lex.europa.eu/eli/C/2025/6610/oj/eng).

**Fact.** AssemblyAI does not use submitted files for model training when the account uses the European servers, has a business-associate agreement, or has opted out. I am opting out. I did not use training as a reason to prefer one vendor. The comparison below is about where the copy sits and how long it sits. Source: [Data retention and model training](https://www.assemblyai.com/docs/data-retention-and-model-training).

### ElevenLabs Scribe v2

**Fact.** Scribe v2 is $0.22 per hour on the API rate card. Keyterm prompting is $0.05 per hour. Transcript editing is $0.07 per hour. The rate card has no separate line for diarization. The product description includes speaker diarization for up to 32 speakers. A marketing sentence on the speech-to-text page says Scribe starts from $0.40 per hour. That conflicts with the API rate card and with the FAQ on the pricing page, which both say $0.22. I used $0.22. The realtime model is $0.39 per hour and is not needed, because the file exists only after the meeting. A Pro subscription at $99 a month includes 450 hours, which is more than 300 hours times $0.22. Sources: [API pricing](https://elevenlabs.io/pricing/api), [Speech to text](https://elevenlabs.io/docs/overview/capabilities/speech-to-text).

| What is on                                        | Rate    | 300 hours |
| ------------------------------------------------- | ------- | --------- |
| Scribe v2, diarization included in the $0.22 rate | $0.22/h | $66       |
| Scribe v2 + keyterms                              | $0.27/h | $81       |

**Fact.** Scribe v2 lists Polish (`pol`) in the group "excellent", word error rate at or below 5%, the same group as English. ElevenLabs does not publish a separate Polish figure for v2. The Polish product page's table gives Scribe v1, not v2, a FLEURS score of 2.3% WER. I did not use 2.3% as a v2 result. Sources: [Speech to text](https://elevenlabs.io/docs/overview/capabilities/speech-to-text), [Polish speech to text](https://elevenlabs.io/speech-to-text/polish).

**Fact.** Scribe v2 can take one file that contains more than one language and detect the languages without a manual split. Keyterms on the batch model go up to 1000 terms. Sources: [Introducing Scribe v2](https://elevenlabs.io/blog/introducing-scribe-v2), [Speech to text](https://elevenlabs.io/docs/overview/capabilities/speech-to-text).

**Fact.** On a normal API account, customer data is stored in the United States. EU data residency is an Enterprise feature, on a separate workspace and a separate API host (`api.eu.residency.elevenlabs.io`). Residency limits where data is stored. Processing can still happen outside that region, including for support and moderation. Restricting processing to the EU also requires Zero Retention Mode. Zero Retention Mode is for selected Enterprise customers, is set per request with `enable_logging=false`, and covers speech-to-text audio and text. It does not cover the web UI. By default, speech-to-text history is on for the audio and the text. The docs do not give a number of days for that history on an active account. Deleting through the API removes the audio and the text from the database. Debugging and moderation logs may remain, and backups are kept for up to 30 days. The data-processing addendum says that for self-serve accounts ElevenLabs may delete content after 180 days of inactivity, and does not have to. Sources: [Data residency](https://elevenlabs.io/docs/overview/administration/data-residency), [Zero Retention Mode](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode), [DPA](https://elevenlabs.io/dpa).

### What the published Polish numbers do not say

**Fact.** FLEURS is read speech. A Meet recording is conversational, overlapping, and one mixed track. Neither vendor publishes a Polish speaker-error rate on meeting audio. A third-party FLEURS bench from July 2026 that includes Scribe v2 does not include Polish and does not include Universal-2. Its author uses Scribe and says so. Source: [koedesk STT Bench](https://koedesk.app/pl/benchmark/).

**Assumption.** The gap between "at or below 5%" and a published 6.63% on read speech does not predict which model will separate speakers on a Vinseo meeting. That is what the sample recording is for.

### Options I did not take into the final pair

**Fact.** OpenAI `gpt-4o-transcribe-diarize` is about $0.006 per minute, about $108 for 300 hours, and is scheduled to shut down on 26 February 2027. The replacement named for new transcription jobs does not cover speaker labels. Source: [OpenAI transcription guide](https://developers.openai.com/api/docs/guides/transcription), [pricing](https://developers.openai.com/api/docs/pricing).

**Fact.** `faster-whisper` and the Whisper weights allow commercial use (MIT). pyannote's code is MIT, and the Community-1 weights are CC-BY-4.0, so commercial use is allowed with attribution. A self-hosted stack can keep the audio on a machine the company controls. The cost is GPU time and someone to run it. I did not measure throughput, so I did not put a dollar figure on it. Source: [pyannote on self-hosting cost](https://www.pyannote.ai/blog/build-vs.-buy-the-real-cost-of-self-hosting-diarization), August 2026.

## 3. How I chose

I compared hosted models that can take one file and return text plus speaker labels, because that is what the mixed MP4 can support. The pair I finished with was Universal-2 and Scribe v2. Self-hosted Whisper plus pyannote stayed as the option if audio is not allowed to leave, or if the sample shows that neither hosted model can separate the speakers. OpenAI's diarization model dropped out on the shutdown date. Universal-3.5 Pro dropped out because it does not speak Polish.

I did not pick AssemblyAI because the request is simpler. Scribe is one call: the file, `scribe_v2`, and `diarize=true`. Universal-2 has to be pinned, punctuation has to be on before speaker labels work, and the language pair must not be combined with automatic language detection. For a 45-minute file both sides should return the result by webhook or polling, so the pipeline shape is the same. Ease of configuration was not the reason.

I also did not pick AssemblyAI because of a proven gap in Polish accuracy. Scribe's published band for Polish is tighter. Universal-2 is the only one of the two that prints a Polish number, and that number is on read speech. I treated those bands as a reason to test, not as a result.

The reason I did pick AssemblyAI is the copy on a normal API key. Universal-2 can be pointed at an EU host without a sales contract, and the uploaded audio is on a clock of about a day, the transcript on a clock of at most 30 days, shorter if a time-to-live is set. Scribe on a normal key keeps history in the United States until someone deletes it, and the EU-and-delete-immediately setup is Enterprise, with no public price. Fifteen dollars a month is the gap between $51 and $66. That is what the EU host and the deletion clock cost at this volume. With keyterms the gap is the same fifteen dollars, $66 against $81.

I refused one argument along the way. The first comparison treated "they may train on the audio" as a point for AssemblyAI. I will turn training off, so that point does not decide anything. The comparison had to be redone on place and retention only.

I also refused the EU endpoint as a legal result. Storing the working copy in the EU means that copy is not, by itself, a transfer to the United States, so it does not depend on the adequacy decision staying valid. It does not mean the recording stays in the EEA. Account data is in the US, support can open the file from outside the EU, and the addendum says a transfer to the US is part of the service. Remote access from a third country to data stored in the EEA is still a transfer under the European Data Protection Board's guidelines 05/2021. I can describe that in the document. I cannot sign it off. That is the specialist's question in section 8.

## 4. What the choice commits to

For the document and for a later real client, the intended request is:

- Host `https://api.eu.assemblyai.com`.
- `speech_models`: `["universal-2"]` only, so a default change cannot send Polish to Universal-3.5 Pro.
- `language_codes`: `["en", "pl"]`. Do not also set `language_detection`.
- `speaker_labels: true` and `punctuate: true`.
- A speaker range, not an exact count. The assignment says 2–6 participants, and an exact wrong count hurts diarization.
- Keyterms only if the sample shows English campaign names being rewritten as Polish. That adds $0.05 per hour, $15 a month at 300 hours.
- The shortest time-to-live the account allows, and a delete call after the segments are stored on our side.
- Training opted out, as a switch I set, not as the reason for the vendor.

**Assumption.** The bytes that leave are an audio extract of the MP4, not the video. The Meet file contains faces. The transcriber needs the sound. I did not make this a separate decision in the chat. It follows from sending the recording to an outside service.

The code in the assignment can keep this client behind a stub. The assignment does not require a live vendor. The choice is for the document. The stub should still return segments shaped the way this API does: start, end, text, and a speaker label local to the file.

## 5. What would change the choice

- The specialist says the EU endpoint does not change the transfer, and ElevenLabs Enterprise with EU residency and Zero Retention Mode is the configuration that actually matches the constraint. Then I ask for that price and compare it with $51. If Enterprise is unavailable, self-hosting is the remaining way to keep the audio in the company.
- One Polish file with `speaker_labels` is rejected. Universal-2 then fails the requirement, not just the benchmark.
- The sample recording is clearly better on Scribe, on the words and on the speaker breaks. Then I either accept a US copy with manual deletion, or I pay for Enterprise, or I stay with Universal-2 and write down the quality I am giving up.
- Both models fail the sample in the same way: one speaker split into two, two people glued together, English names lost. Then diarization of the mixed file is the wrong tool for this audio, and I reopen self-hosting only if there is a reason to think a different model would do better. A different capture path is a change to `notes/transcription-workflow-recap.md`, not a parameter on this request.
- Google adds Polish to saved Meet transcripts. Those entries already carry the Meet participant. They would replace diarization for meetings where transcription was turned on. That condition is already in the workflow record.

## 6. How AI was used

AI (Cursor, in this chat) gathered vendor docs, prices, and the legal terms, and compared Universal-2 with Scribe v2. I asked for sources when a claim was a summary. I dropped the training argument. I did not accept "AssemblyAI is better" until the difference was stated as a concrete copy: where it sits, and when it is deleted. The choice in section 1 is mine, including the two checks. The model's recommendation was AssemblyAI. I kept it, and I made the two flip conditions part of the decision instead of footnotes.

### What I asked the model to do

- Options for speech recognition, starting from ElevenLabs, including a path with no external API.
- The Universal-3.5 Pro language list, with a source. Whether Universal-2 and Universal-3.5 Pro support diarization. Whether the storage and legal terms actually differ. The cost of both AssemblyAI models with diarization.
- The legal difference again, with training left out, and then what EU storage changes in law.
- A direct cost comparison of Scribe v2 and Universal-2.
- Which model handles Polish better.
- Which API is easier to configure.
- A final comparison so I could decide.

### What I verified, because the first answer was not enough

- The 18 languages. I asked for the list and the source. The code-switching page names them. The realtime page gives the codes. Polish is absent. The first pass had said Universal-3.5 Pro might not include Polish. The list is the fact.
- Diarization. The pricing page, updated 2026-10-27, prices it on both Universal-2 and Universal-3.5 Pro. There is still no language-by-feature cell for Polish. That remains a test, not a fact.
- The EU endpoint. I did not take "data stays in the EU" as the end of the question. The residency page itself lists US account data, US subprocessors for file names, and support access from outside the region. The addendum says primary processing is in the United States.
- Scribe's Polish score. The 2.3% FLEURS figure is labeled Scribe v1 on the product page. v2 only has the band "at or below 5%".
- The $0.40 marketing line. The API rate card and the pricing FAQ say $0.22. I used the rate card.

### What I changed relative to the model's drafts

- Training on customer audio is not a reason for the choice. I will turn it off. The model had been using it as a point for AssemblyAI. I had that comparison redone.
- "Stored in the EU" is not a legal conclusion. The model explained the transfer rules and then, when I said I still did not see the advantage, stated it as the ordinary copy: EU and about a day, against US history until deleted. I kept that sentence and left the legal sign-off to a specialist.
- The recommendation was conditional on a sample and on a failed diarization check. I made both conditions explicit, and I added the specialist, before calling the choice final.

### Example prompts from this chat

A demand for sources, not a summary:

> Podaj listę języków jaką obsługuje assembly universal 3.5 pro, podaj źródło. Sprawdź czy modele universal-2 i universal-3.5 pro obsługują diaryzację. Sprawdź czy faktycznie jest różnica pomiędzy assemblyai i elevenlabs w kontekście przechowywania danych i innych sprawach prawnych.

Training set aside:

> Nie podnoś argumentu o używania nagrań do treningów, po prostu to wyłączę.

The decision, with the two checks:

> Ostatecznie wybieram assemblyAi z ważnym zastrzeżeniem - musiałbym poprosić o wyjaśnienie kwestii przechowywania danych elevenlabs vs assemblyai specjalistę. Oprócz tego potrzebowałbym jakiegoś przykładowego nagrania rozmowy, żeby móc przetestować, który model poradzi sobie z nim najlepiej i czy w ogóle jakiś sobie poradzi, czy trzeba inaczej podejść do rozwiązania tego problemu.

## 7. Part A, question 4: transcription and speaker recognition

This is the part that belongs in the decision document. The summary model is not answered here.

**Model.** AssemblyAI Universal-2, speech to text and speaker diarization in one request. Universal-3.5 Pro is the vendor's newer model and does not support Polish, so the request names Universal-2 and does not rely on the default fallback.

**Speaker recognition.** The Meet file is one mixed recording. The model labels stretches of audio as speaker A, B, C. Those labels are local to the file. They are not Google accounts. People on the meeting map a label to a participant afterwards, as in the workflow record. Meet cannot supply this split for Polish. Its saved transcripts do not include Polish.

**Quality for Polish.** Universal-2 is in the vendor's high-accuracy group, at or below 10% word error rate, and the vendor's FLEURS number for Polish is 6.63% (January 2026). English on the same set is 4.38%. FLEURS is read speech, not a meeting. Scribe v2 places Polish in a tighter band, at or below 5%, and does not publish a Polish number for v2. Neither vendor publishes how often the speaker label is wrong on overlapping meeting audio. I will not treat 6.63% as the error rate Vinseo will see. A sample recording decides whether the number is good enough, and whether either hosted model works on this audio.

**English inside Polish.** Campaign names and jargon are the assignment's case. Universal-2 can be pinned to English and Polish together, which is the maximum its code-switching allows. If the sample rewrites those names, keyterms are the next switch, at $0.05 per hour.

**Cost.** At 300 hours, one mono stream, standard diarization: $0.15 + $0.02 = $0.17 per hour, **$51 a month**. Experimental diarization, if the sample needs it, is $0.215 per hour, **$64.50**. Keyterms add $15, to **$66**. Scribe v2 at the API rate of $0.22 is **$66**, or **$81** with keyterms. The EU host does not change AssemblyAI's price. A stereo file billed per channel would double the AssemblyAI figure. The pipeline should send one mono track.

**Privacy.** The working copy of the audio and the transcript is processed in the EU when the client uses `api.eu.assemblyai.com`. Uploaded audio starts deletion after 24 hours. The transcript is kept up to 30 days, or less if a time-to-live is set, and it is deleted through the API once the segments are stored on our side. This is not zero retention, and it is not a closed EEA box. Account and billing data stay in the US. Support can open the recording from outside the EU. The addendum says a transfer to the United States is necessary for the service. Training is switched off and is not the basis of the choice. A specialist still has to say whether this is acceptable for client meetings. Until that answer, the document should describe the copy, not call it compliant.

**Maintenance.** There is no model to host and no GPU to watch. The operational work is pinning the model id, storing the vendor's job id so a retry does not create a second transcript, deleting the vendor's copy after a successful save, and noticing if the price or the language list changes. A vendor outage stops the step. It does not lose the meeting, because the recording id and the last finished step stay in our database. Self-hosting would move that work onto a GPU and onto model updates. I did not choose it for the first version. It remains the option if the audio is not allowed to leave, or if the sample shows the hosted models cannot do the job.

**What I am not claiming.** That Polish diarization is confirmed. That the recording never leaves the EEA. That 6.63% is the meeting error rate. That Scribe's 2.3% FLEURS score applies to v2. That this paragraph picks the summary model.

## 8. Questions before implementation

### To a specialist, before the vendor is treated as accepted

Please compare the two arrangements below and say which, if either, Vinseo can use for a recording of a client meeting. I need the difference in where the copy is stored and how long it is kept. I will turn off the use of customer audio for model training on whichever vendor we use, so training is not the question.

AssemblyAI, normal API key, EU endpoint:

- Audio and transcript are processed in the EU. Account data and usage data stay in the US. File names may go to US subprocessors. Support outside the EU may open the audio.
- Uploaded audio is deleted starting at 24 hours. The transcript is deleted after 30 days, or sooner with a time-to-live, down to about one hour plus AWS deletion lag. We would also delete by API after we have stored the segments.
- The addendum says primary processing is in the United States and that a transfer there is necessary. AssemblyAI says it is certified under the EU-US Data Privacy Framework. That decision is in force and under appeal (C-703/25 P).

ElevenLabs Scribe, normal API key:

- The copy is stored in the US. History is on. There is no published deletion period for an active account. An API delete removes the audio and the text. Logs and backups may remain, backups for up to 30 days.
- EU residency and Zero Retention Mode exist, and both are Enterprise. I do not have a public price.

What I need back:

- Does the EU endpoint mean the ordinary copy is not a transfer to the US, given that support can open it and the addendum assumes a US transfer?
- If both vendors are still a transfer, does AssemblyAI's deletion clock change anything Vinseo is allowed to do?
- If only ElevenLabs Enterprise would be acceptable, I need that said plainly, because it changes the vendor and the cost.

### To Vinseo, before any live call

- Can you give me, or approve, one sample recording that sounds like your meetings: Polish, English campaign names and jargon, two to six speakers, people talking over each other, one mixed track? It must not be a real client meeting.
- I will run that file through Universal-2 and through Scribe v2 and compare the words and the speaker breaks. If neither result is usable, I will come back with a different approach rather than tune the request.
- Is about $51 a month for transcription and diarization, before the summary model, inside the budget you have in mind? Experimental diarization would be about $64.50. Keyterms, if names need them, add about $15.
- If the sample is clearly better on Scribe, do you accept a copy stored in the US on a normal API key, or do you want the Enterprise configuration priced before I switch?

### A check I run myself, on a file with no client data

- One short Polish clip, `speaker_labels` on, `speech_models` set to Universal-2, sent to the EU endpoint. If the API returns the `speaker_labels` error from the language page, Universal-2 is out.
