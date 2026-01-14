# QR Reader (Offline)

An **offline QR code reader** that decodes QR codes from **images**. Everything runs **locally in your browser**: drag & drop a screenshot/photo, choose a file, or paste an image from your clipboard.

## Demo

- GitHub Pages: `https://avil13.github.io/qr`

## Features

- **Drag & drop** a QR image
- **File picker** (upload an image)
- **Paste from clipboard** (Ctrl+V / Cmd+V) if your clipboard contains an image
- **Copy decoded text** to clipboard
- **Offline-first / privacy friendly**: no upload, no server-side processing

## How it works

Decoding is done in the browser with a two-step strategy:

1. **Native scanner first**: uses the browser’s built-in [`BarcodeDetector`](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) when available (usually the most reliable).
2. **Fallback (no dependencies)**: a custom TypeScript pipeline:
   - image load + thresholding
   - finder pattern detection
   - sampling a QR bit matrix
   - QR data decoding

The core logic lives in `src/lib/` and the UI is in `src/components/QRReader.vue`.

## Tech stack

- Vue 3 + Vite
- TypeScript
- Zero external QR decoding dependencies (custom fallback decoder)

## Getting started

Requirements:
- Node.js: `^20.19.0` or `>=22.12.0`

Install:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Optional:

```bash
npm run test:unit
npm run lint
```

## Project structure

```text
src/
  components/QRReader.vue    # UI: upload / paste / preview / copy result
  lib/                       # QR decode implementation (native + fallback)
  pages/HomePage.vue         # Page shell
  router/                    # Vue Router setup
```

## Notes / limitations

- This app **reads QR codes from images**. It does not currently scan from a live camera stream.
- `BarcodeDetector` support varies by browser; the app automatically falls back when it’s not available.

## License

MIT