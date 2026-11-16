import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates favicon, PWA icons (64/192/512), a maskable icon and the
// Apple touch icon from the single source SVG.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#6b4226' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#6b4226' } },
  },
  images: ['public/icon.svg'],
});
