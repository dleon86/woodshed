import type { LabelStyle } from '../../state/views';
import { type Note, degreeLabel, intervalBetween, intervalId, noteName, sameNote } from '../../theory';

/** V-5: the label for a highlighted note, measured from the root. */
export function labelFor(note: Note, root: Note, style: LabelStyle): string {
  if (style === 'none') return '';
  if (style === 'names') return noteName(note);
  if (sameNote(note, root)) return style === 'degrees' ? '1' : 'R';
  try {
    const iv = intervalBetween(root, note);
    return style === 'degrees' ? degreeLabel(iv) : intervalId(iv);
  } catch {
    return noteName(note); // a spelling no label can describe; never seen with v1 content
  }
}

/** How a highlighted note is drawn. */
export type Role = 'root' | 'focus' | 'note';

export function roleOf(note: Note, root: Note, focus: Note | undefined): Role {
  if (focus) return sameNote(note, focus) ? 'focus' : 'note';
  return sameNote(note, root) ? 'root' : 'note';
}
