import { section } from '../state/session';
import { NavBar } from './NavBar';
import { TopBar } from './TopBar';
import { Explore } from './sections/Explore';
import { Practice } from './sections/Practice';
import { Progress } from './sections/Progress';
import { Settings } from './sections/Settings';

const SECTION_COMPONENT = { practice: Practice, explore: Explore, progress: Progress, settings: Settings };

export function App() {
  const Current = SECTION_COMPONENT[section.value];
  return (
    <div class="shell">
      <TopBar />
      <NavBar />
      <main class="main">
        <Current />
      </main>
    </div>
  );
}
