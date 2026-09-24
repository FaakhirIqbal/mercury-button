export type MercuryQuality = 'auto' | 'full' | 'lite';

export interface MercuryButtonAPI {
  /** Library version. */
  readonly version: string;
  /** Enhance every `.mercury-button` inside `root` (or `root` itself). Safe to call repeatedly. */
  init(root?: Element | Document): void;
  /** Force a render tier for all buttons. Per-button `data-quality` still wins. */
  setQuality(mode: MercuryQuality): void;
  /** Let the mouse position simulate device tilt on desktop (demo/preview use). */
  setMouseTilt(enabled: boolean): void;
}

declare global {
  interface Window {
    MercuryButton: MercuryButtonAPI;
  }
}

export {};
