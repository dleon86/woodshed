import { isDone } from '../../cards';
import { session } from '../../state/practice';
import { DeckBuilder } from '../practice/DeckBuilder';
import { Drill } from '../practice/Drill';
import { SessionSummary } from '../practice/SessionSummary';

/** Practice: build a deck, drill it, see the summary (PRD 6.1, section 7). */
export function Practice() {
  const s = session.value;
  if (!s) return <DeckBuilder />;
  return isDone(s) ? <SessionSummary session={s} /> : <Drill session={s} />;
}
