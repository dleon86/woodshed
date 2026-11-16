import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './state/theme'; // applies the theme as a side effect
import { App } from './ui/App';
import './ui/app.css';

render(<App />, document.getElementById('app')!);

// Service worker: precaches the whole app for offline use and updates itself
// in the background when a new version is deployed.
registerSW({ immediate: true });
