import { useEffect } from 'preact/hooks';
import { micError, micState, startMicCheck, stopMicCheck, tuner } from '../../state/sound';
import { pitchFromMidi, pitchName } from '../../theory';

/** P-9: what to tell the player in each mic state. */
const STATE_TEXT = {
  off: 'Tap Start, allow the microphone, then play one note.',
  asking: 'Waiting for microphone permission…',
  listening: 'Listening. Play one note and hold it.',
  denied:
    'Microphone access was refused. Allow it for this site in the browser’s site settings (on iPad: Settings → Safari → Microphone), then try again.',
  unavailable: 'No microphone was found on this device.',
  error: 'The microphone could not be started.',
} as const;

/**
 * Rough mic check (PRD section 9, M4): a bare tuner readout to find permission
 * and playback/mic problems on real devices early. The real tuner is M7.
 */
export function MicCheck() {
  const state = micState.value;
  const reading = tuner.value;
  const on = state === 'listening' || state === 'asking';
  // Leaving Settings releases the microphone.
  useEffect(() => stopMicCheck, []);

  return (
    <div class="setting mic-check">
      <div>
        <h2>Mic check</h2>
        <p class="muted">A test of pitch detection on this device. Sound is analysed here and never recorded or sent.</p>
      </div>
      <button type="button" class={on ? 'secondary' : 'primary'} onClick={() => (on ? stopMicCheck() : void startMicCheck())}>
        {on ? 'Stop' : 'Start'}
      </button>
      <div class="mic-readout" role="status" aria-live="polite">
        {state === 'listening' && reading ? (
          <>
            <span class="mic-note">{pitchName(pitchFromMidi(reading.midi))}</span>
            <span class="mic-cents" data-off={Math.abs(reading.cents) > 10}>
              {reading.cents === 0 ? 'in tune' : `${Math.abs(reading.cents)} cents ${reading.cents > 0 ? 'sharp' : 'flat'}`}
            </span>
            <span class="muted small">{reading.hz.toFixed(1)} Hz</span>
          </>
        ) : (
          <p class="muted">
            {STATE_TEXT[state]}
            {state === 'error' && micError.value ? ` (${micError.value})` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
