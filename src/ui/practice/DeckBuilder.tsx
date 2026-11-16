import type { ComponentChildren } from 'preact';
import { type Family, FAMILIES, FAMILY_INFO, V1_INTERVALS, paperDeck } from '../../cards';
import {
  SESSION_LENGTHS,
  deckCards,
  deckConfig,
  sessionLength,
  start,
  updateDeck,
} from '../../state/practice';
import {
  type Direction,
  SCALE_TYPES,
  intervalName,
  keySignature,
  majorKeyFor,
  noteName,
  parseInterval,
  scaleTypeName,
  signatureCount,
} from '../../theory';

const GROUPS = [
  ['keys', 'Key cards'],
  ['scales', 'Scale cards'],
  ['intervals', 'Interval cards'],
] as const;

const KEY_FILTERS = [
  ['all', 'All'],
  ['flats', '♭ keys'],
  ['sharps', '♯ keys'],
  ['custom', 'Pick'],
] as const;

const DIRECTION_OPTIONS: ReadonlyArray<readonly [string, readonly Direction[]]> = [
  ['Up', ['up']],
  ['Down', ['down']],
  ['Both', ['up', 'down']],
];

const WORDINGS = [
  ['names', 'Names'],
  ['numerals', 'Numerals'],
  ['both', 'Both'],
] as const;

const ALL_FIFTHS = Array.from({ length: 15 }, (_, i) => i - 7);

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Deck builder (F-4): pick card families, keys, scale types and intervals. */
export function DeckBuilder() {
  const config = deckConfig.value;
  const count = deckCards.value.length;
  const length = sessionLength.value;
  const sessionCount = length === 0 ? count : Math.min(length, count);
  const uses = (group: 'keys' | 'scales' | 'intervals') =>
    config.families.some((f) => FAMILY_INFO[f].group === group);
  const paper = paperDeck();

  return (
    <section class="page builder" aria-labelledby="practice-title">
      <h1 id="practice-title">Practice</h1>

      <button type="button" class="preset" onClick={() => start(paper, 0)}>
        <span class="preset-title">Paper deck</span>
        <span class="muted small">The original {paper.length} cards: key signatures and fifths</span>
      </button>

      <h2 class="builder-heading">Or build a deck</h2>

      {GROUPS.map(([group, label]) => (
        <Field key={group} label={label}>
          <div class="chips">
            {FAMILIES.filter((f) => FAMILY_INFO[f].group === group).map((f) => (
              <FamilyChip key={f} family={f} on={config.families.includes(f)} />
            ))}
          </div>
        </Field>
      ))}

      <Field label="Which keys">
        <Segmented
          label="Which keys"
          options={KEY_FILTERS}
          value={config.keys}
          onChange={(keys) => updateDeck({ keys })}
        />
        {config.keys === 'custom' && (
          <div class="tonic-grid" aria-label="Pick keys">
            {ALL_FIFTHS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={config.customKeys.includes(f)}
                onClick={() => updateDeck({ customKeys: toggle(config.customKeys, f) })}
              >
                <span class="tonic-name">{noteName(majorKeyFor(f).tonic)}</span>
                <span class="tonic-count">{signatureCount(keySignature(majorKeyFor(f)))}</span>
              </button>
            ))}
          </div>
        )}
      </Field>

      {(uses('keys') || uses('scales')) && (
        <Field label="Scale types" hint="Minor types add the minor keys to key cards">
          <div class="chips">
            {SCALE_TYPES.map((t) => (
              <Chip
                key={t}
                on={config.scaleTypes.includes(t)}
                onClick={() => updateDeck({ scaleTypes: toggle(config.scaleTypes, t) })}
              >
                {scaleTypeName(t)}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      {uses('intervals') && (
        <Field label="Intervals">
          <div class="chips interval-chips">
            {V1_INTERVALS.map((id) => (
              <Chip
                key={id}
                on={config.intervals.includes(id)}
                title={intervalName(parseInterval(id))}
                onClick={() => updateDeck({ intervals: toggle(config.intervals, id) })}
              >
                {id}
              </Chip>
            ))}
          </div>
          <Segmented
            label="Direction"
            options={DIRECTION_OPTIONS.map(([name]) => [name, name] as const)}
            value={DIRECTION_OPTIONS.find(([, d]) => d.join() === config.directions.join())?.[0] ?? 'Up'}
            onChange={(name) =>
              updateDeck({ directions: DIRECTION_OPTIONS.find(([n]) => n === name)?.[1] ?? ['up'] })
            }
          />
          <Segmented
            label="Wording"
            options={WORDINGS}
            value={config.wording}
            onChange={(wording) => updateDeck({ wording })}
          />
          <p class="muted small">Numerals: “E♭ V” for a perfect 5th above E♭. Ascending only.</p>
        </Field>
      )}

      <div class="start-bar">
        <Segmented
          label="Session length"
          options={SESSION_LENGTHS.map((n) => [n, n === 0 ? 'All' : String(n)] as const)}
          value={length}
          onChange={(n) => (sessionLength.value = n)}
        />
        <button type="button" class="primary" disabled={count === 0} onClick={() => start(deckCards.value)}>
          {count > 0
            ? `Start · ${sessionCount} of ${count} cards`
            : config.keys === 'custom' && config.customKeys.length === 0
              ? 'Pick at least one key'
              : 'No cards match: choose a card type'}
        </button>
      </div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ComponentChildren }) {
  return (
    <fieldset class="field">
      <legend>{label}</legend>
      {hint && <p class="muted small">{hint}</p>}
      {children}
    </fieldset>
  );
}

function Chip(props: { on: boolean; onClick: () => void; title?: string; children: ComponentChildren }) {
  return (
    <button type="button" class="chip" aria-pressed={props.on} title={props.title} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function FamilyChip({ family, on }: { family: Family; on: boolean }) {
  const info = FAMILY_INFO[family];
  return (
    <button
      type="button"
      class="chip family-chip"
      aria-pressed={on}
      onClick={() => updateDeck({ families: toggle(deckConfig.value.families, family) })}
    >
      <span>{info.label}</span>
      <span class="chip-example">{info.example}</span>
    </button>
  );
}

function Segmented<T extends string | number>(props: {
  label: string;
  options: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div class="segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map(([value, text]) => (
        <button
          key={String(value)}
          type="button"
          role="radio"
          aria-checked={props.value === value}
          onClick={() => props.onChange(value)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
