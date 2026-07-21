export const DRILL_CATEGORIES = [
  'Ball Handling',
  'Shooting',
  'Footwork',
  'Finishing',
  'Triple Threat',
  'Speed & Agility',
  'Defense',
  'Mentality',
  'Strength & Conditioning',
] as const


// Where recording videos are persisted server-side.
// Defaults to the Hetzner storage box mount in production; falls back to local
// disk for dev. Override via RECORDINGS_DIR env var.
export const RECORDINGS_DIR =
  process.env.RECORDINGS_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/mnt/storagebox/hooptrack/recordings'
    : 'data/recordings')

export const ATTACHMENTS_DIR =
  process.env.ATTACHMENTS_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/mnt/storagebox/hooptrack/attachments'
    : 'data/attachments')
