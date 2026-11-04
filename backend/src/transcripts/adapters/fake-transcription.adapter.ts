import { Injectable } from '@nestjs/common';
import type {
  TranscriptionAdapter,
  TranscriptionRequest,
  TranscriptionResult,
} from './transcription.adapter.js';

const sampleSegments = [
  {
    speakerId: 'speaker_1',
    startMs: 0,
    endMs: 4_200,
    text: 'Zaczynamy przegląd statusu wdrożenia.',
  },
  {
    speakerId: 'speaker_2',
    startMs: 4_200,
    endMs: 9_100,
    text: 'Integracja z magazynem jest gotowa do testów.',
  },
  {
    speakerId: 'speaker_3',
    startMs: 9_100,
    endMs: 13_800,
    text: 'Potrzebujemy ustalonego terminu odbioru.',
  },
  {
    speakerId: 'speaker_1',
    startMs: 13_800,
    endMs: 18_600,
    text: 'Proponuję zamknąć testy do końca przyszłego tygodnia.',
  },
  {
    speakerId: 'speaker_2',
    startMs: 18_600,
    endMs: 23_100,
    text: 'Zgadzam się na ten termin.',
  },
  {
    speakerId: 'speaker_3',
    startMs: 23_100,
    endMs: 28_400,
    text: 'Dokończę listę uwag do piątku.',
  },
  {
    speakerId: 'speaker_1',
    startMs: 28_400,
    endMs: 33_900,
    text: 'Ustalamy, że odbiór nastąpi po zakończeniu testów.',
  },
  {
    speakerId: 'speaker_2',
    startMs: 33_900,
    endMs: 39_200,
    text: 'Przygotuję środowisko testowe przed odbiorem.',
  },
  {
    speakerId: 'speaker_3',
    startMs: 39_200,
    endMs: 44_100,
    text: 'Potwierdzam udział w odbiorze.',
  },
  {
    speakerId: 'speaker_1',
    startMs: 44_100,
    endMs: 48_000,
    text: 'Zamykam spotkanie i zapisuję te ustalenia.',
  },
] as const satisfies TranscriptionResult['segments'];

@Injectable()
export class FakeTranscriptionAdapter implements TranscriptionAdapter {
  transcribe(_request: TranscriptionRequest): Promise<TranscriptionResult> {
    return Promise.resolve({
      segments: sampleSegments.map((segment) => ({ ...segment })),
    });
  }
}
