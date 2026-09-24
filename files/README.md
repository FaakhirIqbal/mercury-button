# mercury-button

A liquid-metal glass button for the web. The metal sits inside a glass chamber, stays level with real gravity when the phone tilts, sloshes when it moves, and surges toward the spot you press. The volume is solved every frame, so the chamber always holds the same amount of liquid at any angle.

No dependencies. One CSS file, one JS file, about 7 KB + 10 KB minified.

**[Live demo](https://YOUR-USERNAME.github.io/mercury-button/)**

## Features

- Constant-volume liquid that follows device gravity (`deviceorientation`)
- Spring-damped slosh, press surge toward the touch point, splash and bead-off
- Two render tiers: full SVG lighting, and a lite tier that switches on automatically on weaker Android devices or when frame times drop
- Animation loop sleeps when nothing moves; off-screen buttons skip work
- BEM classes and CSS custom properties, so new colors and sizes need no JS
- Keyboard, focus-visible, `prefers-reduced-motion` and `prefers-reduced-transparency` support
- Works in iOS Safari, Android Chrome, WKWebView and Android WebView

## Install

**npm**

```bash
npm install mercury-button
```

```js
import 'mercury-button';
import 'mercury-button/css';
```

**CDN**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mercury-button@1/dist/mercury-button.min.css">
<script src="https://cdn.jsdelivr.net/npm/mercury-button@1/dist/mercury-button.min.js" defer></script>
```

**Manual:** copy `dist/mercury-button.min.css` and `dist/mercury-button.min.js` into your project.

## Usage

```html
<button class="mercury-button" type="button" data-fill="0.85">Push</button>
```

The script enhances every `.mercury-button` on page load. It injects its own SVG filters, so no extra markup is needed.

### Options

| Attribute | Values | Default | Description |
|---|---|---|---|
| `data-fill` | `0.05` - `0.98` | `0.85` | Liquid volume as a fraction of the chamber |
| `data-quality` | `full`, `lite` | auto | Force a render tier for this button |
| `data-haptics` | `off` | on | Disable the short vibration on press (Android) |

### Modifiers

| Class | Effect |
|---|---|
| `mercury-button--sm` | Small (164 x 56) |
| `mercury-button--lg` | Large (300 x 92) |
| `mercury-button--gold` | Gold metal |
| `mercury-button--lite` | Cheaper filter, no backdrop blur |

### Custom properties

| Property | Default | Description |
|---|---|---|
| `--mb-width` | `240px` | Button width |
| `--mb-height` | `76px` | Button height |
| `--mb-radius` | `24px` | Corner radius |
| `--mb-font-size` | `15px` | Label size |
| `--mb-metal` | `#aab3be` | Liquid color |
| `--mb-metal-rgb` | `190, 204, 222` | Same color as an RGB triplet, used for glass reflections |

### Make your own variant

```css
.mercury-button--copper {
  --mb-metal: #b87a55;
  --mb-metal-rgb: 214, 150, 110;
}
```

### JavaScript API

```js
MercuryButton.init(element);      // enhance buttons added after page load
MercuryButton.setQuality('lite'); // 'auto' | 'full' | 'lite'
MercuryButton.setMouseTilt(true); // desktop preview: mouse X simulates tilt
MercuryButton.version;            // '1.0.0'
```

`init` is safe to call more than once. Use it after rendering buttons from a framework, a modal or a fetch.

## Platform notes

- **iOS:** motion access needs permission. The first press on any button shows the system prompt. The page must be served over HTTPS.
- **Android:** tilt works with no prompt. Chrome only sends orientation events to secure pages (HTTPS or `localhost`).
- **WebView:** enable JavaScript. iOS WKWebView follows Safari's permission flow.
- **Desktop:** the liquid stays level unless you call `setMouseTilt(true)`.

## Browser support

Latest two versions of Chrome, Edge, Safari, Firefox, Samsung Internet, iOS Safari and Android WebView.

## Development

```bash
git clone https://github.com/YOUR-USERNAME/mercury-button.git
cd mercury-button
npm install
npm run dev        # builds, then serves at http://localhost:5173/demo/
```

Source lives in `src/`. `npm run build` writes minified files to `dist/`.

## Contributing

Pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

[MIT](LICENSE) © 2026 Fakhar
