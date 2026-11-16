import { effect } from '@preact/signals';
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { drilling } from './state/practice';
import './state/theme'; // applies the theme as a side effect
import { App } from './ui/App';
import './ui/app.css';

render(<App />, document.getElementById('app')!);

// Service worker: precaches the whole app for offline use. A new version
// downloads in the background and is applied (with a reload) only when no
// drill is in progress; the session itself is saved, so nothing is lost.
let updateReady = false;
const applyUpdate = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true;
    if (!drilling.peek()) void applyUpdate(true);
  },
});
effect(() => {
  if (!drilling.value && updateReady) void applyUpdate(true);
});
