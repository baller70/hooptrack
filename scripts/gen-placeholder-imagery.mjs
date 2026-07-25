/**
 * Generates placeholder imagery so the screens carry the same visual weight as
 * the design pack, which uses photography we have no real source for.
 *
 * These are deliberately stylised (silhouette + jersey number on a branded
 * gradient), NOT synthetic photographs of people — a placeholder should read as
 * a placeholder, and a fake face presented as a real player would be worse than
 * initials. Replace by setting users.avatar_path to a real upload.
 *
 *   node scripts/gen-placeholder-imagery.mjs
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const avatarDir = path.join(root, 'public', 'avatars')
const posterDir = path.join(root, 'public', 'posters')
fs.mkdirSync(avatarDir, { recursive: true })
fs.mkdirSync(posterDir, { recursive: true })

const db = new Database(path.join(root, 'data', 'hooptrack.db'))

// Brand-adjacent duotones, picked so adjacent roster rows stay distinguishable.
const RAMPS = [
  ['#FE4800', '#B22F00'], ['#1F2937', '#0A0A0A'], ['#2563EB', '#1E3A8A'],
  ['#7C3AED', '#4C1D95'], ['#0F766E', '#134E4A'], ['#E11D2E', '#7F1D1D'],
]

/** Deterministic per player, so a given player keeps the same avatar. */
function ramp(seed) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return RAMPS[h % RAMPS.length]
}

function avatarSvg({ name, jersey, seed }) {
  const [from, to] = ramp(seed)
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
  const badge = jersey != null ? String(jersey) : initials

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="${name} placeholder avatar">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <clipPath id="c"><circle cx="100" cy="100" r="100"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="200" height="200" fill="url(#g)"/>
    <g fill="#ffffff" opacity="0.14">
      <circle cx="100" cy="74" r="34"/>
      <path d="M28 200c0-42 32-68 72-68s72 26 72 68z"/>
    </g>
    <g stroke="#ffffff" stroke-width="2" fill="none" opacity="0.16">
      <circle cx="168" cy="34" r="30"/><path d="M138 34h60M168 4v60"/>
    </g>
    <text x="100" y="132" text-anchor="middle"
      font-family="Impact, 'Arial Narrow', system-ui, sans-serif"
      font-size="${badge.length > 2 ? 62 : 78}" font-weight="700"
      fill="#ffffff" opacity="0.95">${badge}</text>
  </g>
</svg>`
}

/** Dark court-ish poster used wherever a clip has no video file on disk. */
function posterSvg(title) {
  const safe = String(title || 'Clip').slice(0, 28).replace(/[<>&]/g, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360" role="img" aria-label="${safe} placeholder poster">
  <defs>
    <linearGradient id="p" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1B1B1F"/><stop offset="1" stop-color="#0A0A0A"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#p)"/>
  <g stroke="#FE4800" stroke-width="2" fill="none" opacity="0.22">
    <circle cx="320" cy="360" r="120"/><path d="M180 360h280M320 240v120"/>
    <rect x="250" y="40" width="140" height="86" rx="4"/><circle cx="320" cy="140" r="26"/>
  </g>
  <circle cx="320" cy="180" r="44" fill="#ffffff" opacity="0.92"/>
  <path d="M308 158l34 22-34 22z" fill="#0A0A0A"/>
  <text x="320" y="286" text-anchor="middle" font-family="system-ui, sans-serif"
    font-size="20" fill="#ffffff" opacity="0.66">${safe}</text>
</svg>`
}

/**
 * Group emblems for MY GROUPS: a dark disc with an orange glyph, matching
 * 002-coach-teams-request-flow-raw.png. Drawn rather than substituted from an
 * icon set — lucide ships neither a basketball nor a rim, and the near-misses
 * (a volleyball, a football goal) read as wrong to anyone who knows the sport.
 */
function emblemSvg(kind) {
  const art = {
    // Circle, meridian, equator, and the two curved side seams.
    basketball: `
    <circle cx="100" cy="100" r="58" fill="none" stroke="#FE4800" stroke-width="9"/>
    <path d="M100 42v116M42 100h116" stroke="#FE4800" stroke-width="8" fill="none"/>
    <path d="M62 58c22 24 22 60 0 84M138 58c-22 24-22 60 0 84" stroke="#FE4800" stroke-width="8" fill="none"/>`,
    // Backboard, rim ellipse, and a net tapering to a point.
    hoop: `
    <rect x="52" y="40" width="96" height="56" rx="5" fill="none" stroke="#FE4800" stroke-width="9"/>
    <ellipse cx="100" cy="106" rx="34" ry="11" fill="none" stroke="#FE4800" stroke-width="9"/>
    <path d="M70 110l12 34h36l12-34M84 112l6 32M100 113v31M116 112l-6 32"
      fill="none" stroke="#FE4800" stroke-width="7" stroke-linejoin="round"/>`,
    // Trapezoid body with two reflective stripes over a wide base.
    cone: `
    <path d="M100 42l30 96H70z" fill="none" stroke="#FE4800" stroke-width="9" stroke-linejoin="round"/>
    <path d="M84 92h32M78 114h44" stroke="#FE4800" stroke-width="8" stroke-linecap="round"/>
    <rect x="52" y="142" width="96" height="18" rx="9" fill="#FE4800"/>`,
  }[kind]

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="${kind} emblem">
  <circle cx="100" cy="100" r="100" fill="#0A0A0A"/>${art}
</svg>`
}

const emblemDir = path.join(root, 'public', 'emblems')
fs.mkdirSync(emblemDir, { recursive: true })
const EMBLEM_KINDS = ['basketball', 'hoop', 'cone']
for (const kind of EMBLEM_KINDS) {
  fs.writeFileSync(path.join(emblemDir, `${kind}.svg`), emblemSvg(kind))
}

const players = db
  .prepare("SELECT id, name, jersey_number FROM users WHERE role = 'player' ORDER BY id")
  .all()
const setAvatar = db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?')

for (const p of players) {
  const file = `player-${p.id}.svg`
  fs.writeFileSync(path.join(avatarDir, file), avatarSvg({
    name: p.name, jersey: p.jersey_number, seed: `${p.id}:${p.name}`,
  }))
  setAvatar.run(`/avatars/${file}`, p.id)
}

// Coaches get one too — the settings screen shows an avatar.
for (const c of db.prepare("SELECT id, name FROM users WHERE role = 'trainer'").all()) {
  const file = `coach-${c.id}.svg`
  fs.writeFileSync(path.join(avatarDir, file), avatarSvg({
    name: c.name, jersey: null, seed: `c${c.id}:${c.name}`,
  }))
  setAvatar.run(`/avatars/${file}`, c.id)
}

// One poster per distinct title, referenced by name from the UI. Covers BOTH
// recordings and the move library — <ClipPoster> slugifies whatever title it is
// given, so a move with no poster 404s before falling back to clip.svg.
const titles = [
  ...db.prepare('SELECT DISTINCT title AS t FROM recordings WHERE title IS NOT NULL').all(),
  ...db.prepare('SELECT DISTINCT title AS t FROM player_moves WHERE title IS NOT NULL').all(),
].map((r) => r.t)
for (const t of new Set([...titles, 'Clip'])) {
  const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'clip'
  fs.writeFileSync(path.join(posterDir, `${slug}.svg`), posterSvg(t))
}

console.log(`emblems: ${EMBLEM_KINDS.length} -> public/emblems/ (${EMBLEM_KINDS.join(', ')})`)
console.log(`avatars: ${players.length} players + coaches -> public/avatars/`)
console.log(`posters: ${new Set(titles).size + 1} -> public/posters/ (slugified clip title, fallback clip.svg)`)
