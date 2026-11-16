/**
 * Microphone input for pitch detection (PRD 6.5). Audio is analysed on the
 * device and never recorded or sent anywhere (P-10).
 */
import { type PitchReading, detectPitch, level } from './pitch';
import { listeningContext, resetAudio, setAudioSession } from './player';

/** P-9: the states a mic exercise must be able to show. */
export type MicState = 'off' | 'asking' | 'listening' | 'denied' | 'unavailable' | 'error';

/** 4096 samples is 85 ms at 48 kHz: long enough for more than two periods of bass low B. */
const BUFFER_SIZE = 4096;

export interface MicSession {
  stop(): void;
}

/**
 * Start listening. `onReading` gets the detected pitch (or null for silence
 * or noise) and the input loudness (0–1) about every animation frame;
 * `onState` reports permission and failure states. Resolves once listening
 * has started or failed.
 */
export async function startMic(
  onReading: (reading: PitchReading | null, loudness: number) => void,
  onState: (state: MicState, detail?: string) => void,
): Promise<MicSession> {
  const none: MicSession = { stop() {} };
  if (!navigator.mediaDevices?.getUserMedia) {
    onState('unavailable');
    return none;
  }
  onState('asking');
  let stream: MediaStream;
  try {
    // iOS only allows the mic alongside sound in the play-and-record session.
    setAudioSession('play-and-record');
    stream = await navigator.mediaDevices.getUserMedia({
      // The phone-call processing distorts instrument sound and hides low notes (PRD section 8).
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (e) {
    setAudioSession('playback');
    const name = e instanceof DOMException ? e.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') onState('denied');
    else if (name === 'NotFoundError' || name === 'OverconstrainedError') onState('unavailable');
    else onState('error', e instanceof Error ? e.message : String(e));
    return none;
  }

  // A context built before the mic was opened can keep delivering silence on iOS,
  // so analyse on a fresh one. (A page that is capturing may start audio without a tap.)
  resetAudio();
  const ctx = listeningContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = BUFFER_SIZE;
  source.connect(analyser); // not connected to the speakers: the mic is never played back
  const buffer = new Float32Array(BUFFER_SIZE);

  let frame = 0;
  const tick = () => {
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
    analyser.getFloatTimeDomainData(buffer);
    onReading(detectPitch(buffer, ctx.sampleRate), level(buffer));
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  onState('listening');

  return {
    stop() {
      cancelAnimationFrame(frame);
      source.disconnect();
      for (const track of stream.getTracks()) track.stop(); // releases the mic and its indicator
      setAudioSession('playback');
      resetAudio(); // playback starts again on a context made for the playback session
      onState('off');
    },
  };
}
