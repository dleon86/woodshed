import { SECTIONS, section } from '../state/session';
import { icons } from './icons';

const LABEL = { practice: 'Practice', explore: 'Explore', progress: 'Progress', settings: 'Settings' } as const;

/** Bottom tab bar on phones, side rail on wide screens (layout switches in CSS). */
export function NavBar() {
  return (
    <nav class="nav" aria-label="Sections">
      {SECTIONS.map((id) => {
        const Icon = icons[id]!;
        return (
          <a key={id} href={`#/${id}`} aria-current={section.value === id ? 'page' : undefined}>
            <Icon />
            <span>{LABEL[id]}</span>
          </a>
        );
      })}
    </nav>
  );
}
