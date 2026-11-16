import { exploreTonic, exploreType, openScale } from '../../state/explore';
import { InstrumentView } from '../views/InstrumentView';
import {
  type Key,
  SCALE_TYPES,
  type ScaleDegree,
  type ScaleType,
  enharmonicKey,
  isStandardKey,
  key,
  keyName,
  keySignature,
  noteId,
  noteName,
  parallelKey,
  relativeKey,
  sameNote,
  scale,
  scaleTonics,
  scaleTypeName,
  signatureCount,
} from '../../theory';

const TYPE_LABEL: Record<ScaleType, string> = {
  major: 'Major',
  'natural-minor': 'Natural',
  'harmonic-minor': 'Harmonic',
  'melodic-minor': 'Melodic',
};

/** Explore: free-play scale browser (PRD section 7). The chord tool joins it in M6. */
export function Explore() {
  const type = exploreType.value;
  const s = scale(exploreTonic.value, type);
  const sig = s.signature;

  return (
    <section class="page explore">
      <h1>Scales</h1>

      <div class="segmented" role="radiogroup" aria-label="Scale type">
        {SCALE_TYPES.map((t) => (
          <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => openScale(s.tonic, t)}>
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div class="tonic-grid" role="radiogroup" aria-label="Key">
        {scaleTonics(type).map((t) => (
          <button
            key={noteId(t)}
            type="button"
            role="radio"
            aria-checked={sameNote(t, s.tonic)}
            onClick={() => openScale(t, type)}
          >
            <span class="tonic-name">{noteName(t)}</span>
            <span class="tonic-count">{signatureCount(keySignature(key(t, s.key.mode)))}</span>
          </button>
        ))}
      </div>

      <article class="scale-card">
        <h2 class="scale-title">
          {noteName(s.tonic)} {scaleTypeName(type)}
        </h2>
        <p class="muted">
          {signatureCount(sig)}
          {sig.accidentals.length > 0 && ` · ${sig.accidentals.map(noteName).join(' ')}`}
        </p>

        <DegreeRow degrees={s.degrees} label={type === 'melodic-minor' ? 'Ascending' : undefined} />
        {type === 'melodic-minor' && <DegreeRow degrees={s.descending} label="Descending" />}

        <dl class="related">
          <Related label="Relative" k={relativeKey(s.key)} type={type} />
          <Related label="Parallel" k={parallelKey(s.key)} type={type} />
          <Related label="Enharmonic" k={enharmonicKey(s.key)} type={type} />
        </dl>
      </article>

      <InstrumentView show={{ notes: s.degrees.map((d) => d.note), root: s.tonic, key: s.key }} />
    </section>
  );
}

function DegreeRow({ degrees, label }: { degrees: readonly ScaleDegree[]; label?: string | undefined }) {
  return (
    <div class="degree-block">
      {label && <p class="degree-caption muted small">{label}</p>}
      <ol class="degree-row">
        {degrees.map((d) => (
          <li key={d.degree}>
            <span class="degree-note">{noteName(d.note)}</span>
            <span class="degree-label">{d.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A related key as a link that opens it. Minor scale types stay in their form; major ↔ minor switches type. */
function Related({ label, k, type }: { label: string; k: Key | undefined; type: ScaleType }) {
  if (!k) return null;
  // A parallel key can be theoretical (G♭ minor); show the playable twin instead.
  const shown = isStandardKey(k) ? k : enharmonicKey(k);
  if (!shown) return null;
  const nextType: ScaleType = shown.mode === 'major' ? 'major' : type === 'major' ? 'natural-minor' : type;
  return (
    <>
      <dt>{label}</dt>
      <dd>
        <button type="button" class="link" onClick={() => openScale(shown.tonic, nextType)}>
          {keyName(shown)}
        </button>
      </dd>
    </>
  );
}
