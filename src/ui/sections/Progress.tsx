import { useEffect, useState } from 'preact/hooks';
import { progressSummary } from '../../progress/db';
import type { ProgressSummary } from '../../progress/record';
import { answersRecorded } from '../../state/practice';

/**
 * Progress. For now, the totals of what has been recorded (G-1), so it is
 * visible that answers are being stored. The heat map, streak and weak-spots
 * deck arrive in M8.
 */
export function Progress() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const recorded = answersRecorded.value;
  useEffect(() => {
    let current = true;
    void progressSummary().then((s) => current && setSummary(s));
    return () => {
      current = false;
    };
  }, [recorded]);

  const accuracy = summary && summary.answers > 0 ? Math.round((100 * summary.correct) / summary.answers) : null;

  return (
    <section class="page summary">
      <h1>Progress</h1>
      {summary && summary.answers === 0 ? (
        <p class="muted">Nothing recorded yet. Every card you answer in Practice is saved on this device.</p>
      ) : (
        <div class="summary-stats" aria-busy={!summary}>
          <Stat value={summary?.answers} label="answers recorded" />
          <Stat value={summary?.today} label="today" />
          <Stat value={summary?.cardsSeen} label="different cards" />
          <Stat value={accuracy === null ? undefined : `${accuracy}%`} label="right" />
        </div>
      )}
      <p class="muted small">The mastery heat map, practice streak and weak-spots deck will be built on these records.</p>
    </section>
  );
}

function Stat({ value, label }: { value: number | string | undefined; label: string }) {
  return (
    <div>
      <span class="stat">{value ?? '…'}</span>
      <span class="muted small">{label}</span>
    </div>
  );
}
