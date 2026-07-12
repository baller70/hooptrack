/*
 * Suite branding boot — the JS branding channel for static apps
 * (GLOBAL_SETTINGS_SPEC §4.6). Include AFTER terminology.js:
 *   <script src="/suite/terminology.js"></script>
 *   <script src="/suite/branding-boot.js"></script>
 *
 * Fetches /api/suite/settings ONCE and applies the team's brand to the page:
 *   - sets the --brand-* CSS custom properties on <html> (mirrors branding.css,
 *     so a JS-only app gets the same tokens without the stylesheet), and
 *   - fills marked elements:
 *       [data-suite-brand-name]  → textContent = business name
 *       [data-suite-logo]        → <img>.src / else background-image = logo URL
 *
 * DORMANT + offline-first by design:
 *   - 401 (signed-out) or any fetch error → do nothing, silently. Built-in
 *     defaults already in the page stand. No console noise.
 *   - No static app links this yet, so shipping it changes nothing until the
 *     consumption agent opts an app in.
 *
 * Auto-runs on load unless `window.SUITE_BRANDING_BOOT_MANUAL === true`, in which
 * case call SuiteBrandingBoot.boot() yourself.
 */
(function (root) {
  'use strict'

  var SETTINGS_URL = '/api/suite/settings'
  var STORAGE_KEY = 'suite-settings-v1'

  function isBrowser() {
    return typeof document !== 'undefined' && typeof window !== 'undefined'
  }

  // ---- colour helpers (kept minimal; branding.css owns the canonical math) ----
  function parseHex(hex) {
    if (typeof hex !== 'string') return null
    var h = hex.trim().replace(/^#/, '')
    if (h.length === 3) h = h.replace(/./g, function (c) { return c + c })
    if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)) }
  function toHex(rgb) {
    function c(n) { return clamp(Math.round(n), 0, 255).toString(16).replace(/^(.)$/, '0$1') }
    return '#' + c(rgb.r) + c(rgb.g) + c(rgb.b)
  }
  function rgbToHsl(rgb) {
    var rn = rgb.r / 255, gn = rgb.g / 255, bn = rgb.b / 255
    var max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min
    var l = (max + min) / 2, h = 0, s = 0
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1))
      if (max === rn) h = ((gn - bn) / d) % 6
      else if (max === gn) h = (bn - rn) / d + 2
      else h = (rn - gn) / d + 4
      h *= 60
      if (h < 0) h += 360
    }
    return { h: h, s: s * 100, l: l * 100 }
  }
  function darken(hex, points) {
    var rgb = parseHex(hex)
    if (!rgb) return hex
    var hsl = rgbToHsl(rgb)
    var l = clamp(hsl.l - points, 0, 100) / 100
    var s = hsl.s / 100
    var c = (1 - Math.abs(2 * l - 1)) * s
    var hp = (((hsl.h % 360) + 360) % 360) / 60
    var x = c * (1 - Math.abs((hp % 2) - 1))
    var r = 0, g = 0, b = 0
    if (hp < 1) { r = c; g = x } else if (hp < 2) { r = x; g = c }
    else if (hp < 3) { g = c; b = x } else if (hp < 4) { g = x; b = c }
    else if (hp < 5) { r = x; b = c } else { r = c; b = x }
    var m = l - c / 2
    return toHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 })
  }
  function softenToWhite(hex, pct) {
    var rgb = parseHex(hex)
    if (!rgb) return hex
    var w = pct / 100
    return toHex({
      r: rgb.r * w + 255 * (1 - w),
      g: rgb.g * w + 255 * (1 - w),
      b: rgb.b * w + 255 * (1 - w),
    })
  }
  function hslTriple(hex) {
    var rgb = parseHex(hex)
    if (!rgb) return null
    var hsl = rgbToHsl(rgb)
    return Math.round(hsl.h) + ' ' + Math.round(hsl.s) + '% ' + Math.round(hsl.l) + '%'
  }

  // ---------------------------- DOM application ----------------------------
  function applyColors(brand) {
    if (!isBrowser() || !brand) return
    var rootEl = document.documentElement
    if (!rootEl || !rootEl.style) return
    var primary = parseHex(brand.primaryColor) ? brand.primaryColor : null
    var accent = parseHex(brand.accentColor) ? brand.accentColor : null
    if (primary) {
      rootEl.style.setProperty('--brand-primary', primary)
      rootEl.style.setProperty('--brand-primary-strong', darken(primary, 12))
      rootEl.style.setProperty('--brand-primary-soft', softenToWhite(primary, 8))
      var triple = hslTriple(primary)
      if (triple) rootEl.style.setProperty('--brand-primary-hsl', triple)
    }
    if (accent) rootEl.style.setProperty('--brand-accent', accent)
    if (brand.logoUrl) rootEl.style.setProperty('--brand-logo', 'url("' + brand.logoUrl + '")')
  }

  function applyBrandName(name) {
    // 'CoachAI' is the neutral product default (§4.2 default businessName) — treat
    // it as UNSET: never overwrite a marked element, so its built-in text stands.
    // This is what makes tagging [data-suite-brand-name] safe on default prod:
    // elements only fill when a REAL custom brand exists.
    if (!isBrowser() || !name || name === 'CoachAI') return
    var nodes = document.querySelectorAll('[data-suite-brand-name]')
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = name
  }

  function applyLogo(logoUrl) {
    if (!isBrowser() || !logoUrl) return
    var nodes = document.querySelectorAll('[data-suite-logo]')
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i]
      if (el.tagName === 'IMG') el.setAttribute('src', logoUrl)
      else el.style.backgroundImage = 'url("' + logoUrl + '")'
    }
  }

  function applySettings(settings) {
    if (!settings) return
    var brand = settings.brand || {}
    applyColors(brand)
    applyBrandName(brand.businessName)
    applyLogo(brand.logoUrl)
    // If terminology.js is present, install the team's mode/overrides + re-bind
    // any declarative [data-term] markup. Purely additive; skipped if absent.
    if (root.SuiteTerminology && typeof root.SuiteTerminology.install === 'function') {
      var terms = root.SuiteTerminology.install(settings.roleMode, settings.terminologyOverrides)
      if (terms && typeof terms.apply === 'function' && isBrowser()) terms.apply(document)
      root.SuiteTerms = terms
    }
    root.SuiteSettings = settings
  }

  // ------------------------------ persistence ------------------------------
  function readCache() {
    try {
      if (!isBrowser() || !window.localStorage) return null
      var raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch (e) { return null }
  }
  function writeCache(settings) {
    try {
      if (isBrowser() && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      }
    } catch (e) { /* quota / private mode — ignore */ }
  }
  function clearCache() {
    try {
      if (isBrowser() && window.localStorage) window.localStorage.removeItem(STORAGE_KEY)
    } catch (e) { /* ignore */ }
  }

  /**
   * Fetch + apply once. Returns a Promise that always resolves (never rejects) so
   * callers need no error handling — signed-out is a normal, silent no-op.
   */
  function boot() {
    // Apply cached snapshot optimistically before the network settles.
    var cached = readCache()
    if (cached) applySettings(cached)

    if (!isBrowser() || typeof window.fetch !== 'function') {
      return Promise.resolve(null)
    }
    return window
      .fetch(SETTINGS_URL, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (res.status === 401) { clearCache(); return null }
        if (!res.ok) return null
        return res.json().catch(function () { return null })
      })
      .then(function (settings) {
        if (settings) {
          applySettings(settings)
          writeCache(settings)
        }
        return settings
      })
      .catch(function () { return null }) // offline / network error → keep defaults
  }

  var API = {
    boot: boot,
    applySettings: applySettings,
    STORAGE_KEY: STORAGE_KEY,
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = API
  root.SuiteBrandingBoot = API

  // Auto-boot on DOM ready unless the host opts out.
  if (isBrowser() && root.SUITE_BRANDING_BOOT_MANUAL !== true) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { boot() })
    } else {
      boot()
    }
  }
})(typeof self !== 'undefined' ? self : this)
