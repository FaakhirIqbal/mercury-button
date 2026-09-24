/*!
 * mercury-button v1.0.0
 * Liquid-metal glass button with tilt physics.
 * MIT License - https://github.com/FaakhirIqbal/mercury-button
 */
(() => {
  'use strict';

  const DEG = Math.PI / 180;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const weakDevice =
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

  const K = reduceMotion ? 400 : 60;     // spring stiffness
  const C = reduceMotion ? 40 : 4.2;     // damping - lower sloshes longer
  const MIN_HOLD = 380;                  // quick taps still show the surge
  const wrap = (d) => ((d + 540) % 360) - 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* Volume solver
     Area of the WxH chamber lying below a surface at local height s,
     for a tank rotated by (sn, cs). Sutherland-Hodgman on 4 corners. */
  const poly = new Float64Array(16);
  function liquidArea(s, sn, cs, W, H) {
    const w = W / 2, h = H / 2;
    const xs = [-w, w, w, -w], ys = [-h, -h, h, h];
    let n = 0;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) & 3;
      const vp = -xs[i] * sn + ys[i] * cs - s;
      const vq = -xs[j] * sn + ys[j] * cs - s;
      if (vp >= 0) { poly[n++] = xs[i]; poly[n++] = ys[i]; }
      if ((vp >= 0) !== (vq >= 0)) {
        const t = vp / (vp - vq);
        poly[n++] = xs[i] + t * (xs[j] - xs[i]);
        poly[n++] = ys[i] + t * (ys[j] - ys[i]);
      }
    }
    let a = 0;
    for (let k = 0; k < n; k += 2) {
      const m = (k + 2) % n;
      a += poly[k] * poly[m + 1] - poly[m] * poly[k + 1];
    }
    return Math.abs(a) / 2;
  }

  // One button
  class MercuryButton {
    constructor(el) {
      this.el = el;
      this.fill = clamp(parseFloat(el.dataset.fill) || 0.85, 0.05, 0.98);
      this.haptics = el.dataset.haptics !== 'off';
      this.angle = 0; this.vel = 0;
      this.written = NaN;
      this.surface = 0;
      this.visible = true;
      this.pressedAt = 0;
      this.build();
      this.measure();
      this.solve(0, true);
      this.bind();
    }

    build() {
      const el = this.el;
      const text = el.textContent.trim();
      el.textContent = '';
      el.style.setProperty('--mb-fill', this.fill);
      el.insertAdjacentHTML('beforeend',
        '<span class="mercury-button__liquid" aria-hidden="true">' +
          '<span class="mercury-button__tank">' +
            '<span class="mercury-button__pool"></span>' +
            '<span class="mercury-button__surge"></span>' +
            '<span class="mercury-button__drop mercury-button__drop--1"></span>' +
            '<span class="mercury-button__drop mercury-button__drop--2"></span>' +
            '<span class="mercury-button__drop mercury-button__drop--3"></span>' +
            '<span class="mercury-button__drop mercury-button__drop--4"></span>' +
          '</span>' +
        '</span>' +
        '<span class="mercury-button__reflect" aria-hidden="true"></span>' +
        '<span class="mercury-button__glow" aria-hidden="true"></span>' +
        '<span class="mercury-button__gauge" aria-hidden="true"></span>');
      const label = document.createElement('span');
      label.className = 'mercury-button__label';
      label.textContent = text;
      el.appendChild(label);
      this.chamber = el.querySelector('.mercury-button__liquid');
    }

    measure() {
      this.W = this.chamber.clientWidth || 234;
      this.H = this.chamber.clientHeight || 70;
      this.solve(this.angle, true);
    }

    // Place the surface so the chamber stays exactly `fill` full at this angle
    solve(deg, force) {
      if (!force && Math.abs(deg - this.written) < 0.02) return;
      this.written = deg;
      const r = deg * DEG, sn = Math.sin(r), cs = Math.cos(r);
      const goal = this.fill * this.W * this.H;
      let lo = -(this.W + this.H), hi = this.W + this.H;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (liquidArea(mid, sn, cs, this.W, this.H) > goal) lo = mid; else hi = mid;
      }
      this.surface = (lo + hi) / 2;
      const s = this.el.style;
      s.setProperty('--mb-tilt', deg.toFixed(2) + 'deg');
      s.setProperty('--mb-surface', this.surface.toFixed(2) + 'px');
    }

    // Returns true while still moving
    step(dt, target) {
      const diff = wrap(target - this.angle);
      this.vel += (K * diff - C * this.vel) * dt;
      this.angle += this.vel * dt;
      if (this.visible) this.solve(this.angle, false);
      return Math.abs(diff) > 0.03 || Math.abs(this.vel) > 0.03;
    }

    bind() {
      const el = this.el;
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        Motion.enable();                       // iOS permission needs a gesture
        this.aim(e.clientX, e.clientY);
        this.press();
      });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('keydown', (e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          const r = el.getBoundingClientRect();
          this.aim(r.left + r.width / 2, r.top);
          this.press();
        }
      });
      el.addEventListener('keyup', (e) => {
        if (e.key === ' ' || e.key === 'Enter') this.release();
      });
    }

    aim(x, y) {
      const r = this.el.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const a = this.angle * DEG;
      const lx = dx * Math.cos(a) + dy * Math.sin(a);
      const ly = -dx * Math.sin(a) + dy * Math.cos(a);
      const s = this.el.style;
      s.setProperty('--mb-gx', (clamp(dx / r.width + 0.5, 0, 1) * 100).toFixed(1) + '%');
      s.setProperty('--mb-gy', (clamp(dy / r.height + 0.5, 0, 1) * 100).toFixed(1) + '%');
      s.setProperty('--mb-lx', lx.toFixed(1) + 'px');
      s.setProperty('--mb-ly', Math.min(ly - 8, this.surface - 10).toFixed(1) + 'px');
    }

    press() {
      clearTimeout(this.releaseTimer);
      clearTimeout(this.deferTimer);
      const cl = this.el.classList;
      cl.remove('is-releasing');
      void this.el.offsetWidth;
      cl.add('is-pressed');
      this.pressedAt = performance.now();
      Active.add(this);
      if (this.haptics && navigator.vibrate) { try { navigator.vibrate(8); } catch (_) {} }
      if (!reduceMotion) { this.vel += (Math.random() - 0.5) * 30; Loop.wake(); }
    }

    release() {
      if (!this.el.classList.contains('is-pressed')) return;
      const go = () => {
        const cl = this.el.classList;
        cl.remove('is-pressed');
        cl.add('is-releasing');
        this.releaseTimer = setTimeout(() => cl.remove('is-releasing'), 800);
      };
      const held = performance.now() - this.pressedAt;
      if (held < MIN_HOLD) this.deferTimer = setTimeout(go, MIN_HOLD - held);
      else go();
    }
  }

  // Shared animation loop (sleeps when everything is settled)
  const buttons = [];
  const Active = new Set();
  const Loop = {
    running: false, last: 0, target: 0,
    frameEMA: 16, slowFrames: 0,
    wake() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this.tick);
    },
    tick: (t) => {
      const L = Loop;
      const raw = t - L.last;
      L.last = t;
      const dt = Math.min(raw / 1000, 0.032);
      Quality.sample(raw);
      let moving = false;
      for (const b of buttons) if (b.step(dt, L.target)) moving = true;
      if (moving) requestAnimationFrame(L.tick);
      else L.running = false;
    },
    setTarget(deg) {
      if (Math.abs(wrap(deg - this.target)) < 0.35) return;   // dead-band: ignore sensor noise
      this.target = deg;
      this.wake();
    }
  };

  // Release on any pointer-up (finger may slide off the button)
  const releaseAll = () => { for (const b of Active) b.release(); Active.clear(); };
  addEventListener('pointerup', releaseAll, { passive: true });
  addEventListener('pointercancel', releaseAll, { passive: true });
  addEventListener('blur', releaseAll);

  // Quality: start lite on weak Android, downgrade if frames drag
  const Quality = {
    lite: false,
    set(on, force) {
      if (this.lite === on && !force) return;
      this.lite = on;
      for (const b of buttons) {
        const q = b.el.dataset.quality;
        if (q === 'full' || q === 'lite') continue;   // per-button override wins
        b.el.classList.toggle('mercury-button--lite', on);
      }
    },
    sample(ms) {
      if (this.lite || qualityMode !== 'auto' || ms > 250) return;  // ignore tab-switch gaps
      Loop.frameEMA += (ms - Loop.frameEMA) * 0.1;
      if (Loop.frameEMA > 24) { if (++Loop.slowFrames > 45) this.set(true); }
      else Loop.slowFrames = Math.max(0, Loop.slowFrames - 1);
    }
  };

  // Motion sensor: one listener for all buttons
  const Motion = {
    requested: false, listening: false, hasData: false,
    gx: 0, gy: 1,                                    // smoothed gravity, CSS space
    screenAngle() {
      const o = screen.orientation;
      return (o && typeof o.angle === 'number') ? o.angle
           : (typeof window.orientation === 'number' ? window.orientation : 0);
    },
    onOrient: (e) => {
      if (e.beta == null || e.gamma == null) return;
      Motion.hasData = true;
      const b = e.beta * DEG, g = e.gamma * DEG;
      const sx = Math.sin(g) * Math.cos(b);          // device x
      const sy = Math.sin(b);                        // device -y -> CSS down
      const o = Motion.screenAngle() * DEG;
      const cx = sx * Math.cos(o) + sy * Math.sin(o);
      const cy = -sx * Math.sin(o) + sy * Math.cos(o);
      // low-pass the vector (not the angle) - smooths Android sensor jitter without wrap bugs
      Motion.gx += (cx - Motion.gx) * 0.3;
      Motion.gy += (cy - Motion.gy) * 0.3;
      const mag = Math.hypot(Motion.gx, Motion.gy);
      if (mag < 0.12) return;                        // phone lying flat: hold level
      Loop.setTarget(-Math.atan2(Motion.gx, Motion.gy) / DEG);
    },
    listen(on) {
      if (on === this.listening) return;
      this.listening = on;
      window[on ? 'addEventListener' : 'removeEventListener']('deviceorientation', this.onOrient, { passive: true });
    },
    enable() {
      if (this.requested || !('DeviceOrientationEvent' in window)) return;
      this.requested = true;
      const DOE = window.DeviceOrientationEvent;
      if (typeof DOE.requestPermission === 'function') {          // iOS 13+
        DOE.requestPermission()
          .then((r) => { if (r === 'granted') this.listen(true); })
          .catch(() => {});
      } else {
        this.listen(true);                                        // Android: no prompt
      }
    }
  };

  // Stop the sensor while the tab is hidden (battery)
  document.addEventListener('visibilitychange', () => {
    if (!Motion.requested) return;
    Motion.listen(!document.hidden);
  });

  // Optional desktop preview: mouse X stands in for tilting the phone
  let mouseTilt = false;
  addEventListener('pointermove', (e) => {
    if (!mouseTilt || Motion.hasData || e.pointerType !== 'mouse') return;
    Loop.setTarget(-((e.clientX / innerWidth) - 0.5) * 50);
  }, { passive: true });
  document.addEventListener('mouseleave', () => { if (mouseTilt && !Motion.hasData) Loop.setTarget(0); });

  // Shared SVG filters (injected once)
  const FILTERS = '<defs><filter id="mb-filter-full" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/><feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 24 -11" result="goo"/><feGaussianBlur in="goo" stdDeviation="2.6" result="bump"/><feDiffuseLighting in="bump" surfaceScale="3" diffuseConstant="1.15" lighting-color="#eef3f9" result="diffuse"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting><feSpecularLighting in="bump" surfaceScale="5" specularConstant="1.15" specularExponent="30" lighting-color="#ffffff" result="spec"><feDistantLight azimuth="225" elevation="42"/></feSpecularLighting><feSpecularLighting in="bump" surfaceScale="5" specularConstant="0.5" specularExponent="18" lighting-color="#dfe7f7" result="rim"><feDistantLight azimuth="60" elevation="30"/></feSpecularLighting><feComposite in="goo" in2="diffuse" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="shaded"/><feComposite in="spec" in2="shaded" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="lit"/><feComposite in="rim" in2="lit" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="lit2"/><feComposite in="lit2" in2="goo" operator="in"/></filter><filter id="mb-filter-lite" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/><feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 22 -10" result="goo"/><feGaussianBlur in="goo" stdDeviation="2" result="soft"/><feOffset in="soft" dx="-1.5" dy="-2" result="up"/><feOffset in="soft" dx="1.5" dy="2" result="down"/><feComposite in="up" in2="down" operator="arithmetic" k2="1.4" k3="-1.4" result="hiMask"/><feComposite in="down" in2="up" operator="arithmetic" k2="1" k3="-1" result="loMask"/><feFlood flood-color="#ffffff" result="white"/><feFlood flood-color="#1b2029" flood-opacity="0.7" result="dark"/><feComposite in="white" in2="hiMask" operator="in" result="hi"/><feComposite in="dark" in2="loMask" operator="in" result="lo"/><feMerge result="lit"><feMergeNode in="goo"/><feMergeNode in="lo"/><feMergeNode in="hi"/></feMerge><feComposite in="lit" in2="goo" operator="in"/></filter></defs>';
  function injectFilters() {
    if (document.getElementById('mb-filter-full')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'mercury-defs');
    svg.innerHTML = FILTERS;
    document.body.appendChild(svg);
  }

  // Observers
  const byEl = new WeakMap();
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        for (const en of entries) {
          const b = byEl.get(en.target);
          if (!b) continue;
          b.visible = en.isIntersecting;
          if (b.visible) b.solve(b.angle, true);
        }
      })
    : null;
  const ro = 'ResizeObserver' in window
    ? new ResizeObserver((entries) => {
        for (const en of entries) { const b = byEl.get(en.target); if (b) b.measure(); }
      })
    : null;
  if (!ro) addEventListener('resize', () => buttons.forEach((b) => b.measure()));

  let qualityMode = 'auto';
  let sensorStarted = false;

  // Public API
  function init(root) {
    injectFilters();
    const scope = root || document;
    const list = scope.matches && scope.matches('.mercury-button')
      ? [scope] : scope.querySelectorAll('.mercury-button');
    list.forEach((el) => {
      if (byEl.has(el)) return;                     // already enhanced
      const b = new MercuryButton(el);
      byEl.set(el, b);
      buttons.push(b);
      if (el.dataset.quality === 'lite' || (Quality.lite && el.dataset.quality !== 'full')) {
        el.classList.add('mercury-button--lite');
      }
      if (io) io.observe(el);
      if (ro) ro.observe(el);
    });
    if (qualityMode === 'auto' && isAndroid && weakDevice) Quality.set(true);
    if (!sensorStarted) {
      sensorStarted = true;
      const DOE = window.DeviceOrientationEvent;
      if (!DOE || typeof DOE.requestPermission !== 'function') Motion.enable();
    }
  }

  function setQuality(mode) {
    qualityMode = mode;
    if (mode === 'lite') Quality.set(true, true);
    else if (mode === 'full') Quality.set(false, true);
    else Quality.set(isAndroid && weakDevice, true);
  }

  function setMouseTilt(on) {
    mouseTilt = !!on;
    if (!mouseTilt) Loop.setTarget(0);
  }

  window.MercuryButton = { version: '1.0.0', init, setQuality, setMouseTilt };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})();
