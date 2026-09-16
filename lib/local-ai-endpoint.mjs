const DEFAULT_LOCAL_AI_ENDPOINT = 'http://localhost:11434/v1/chat/completions'
const LOCAL_AI_ENDPOINT_MESSAGE =
  'Local Model base URL must use http://localhost, http://127.0.0.1, or http://[::1].'

export function normalizeLocalAiEndpoint(value) {
  const candidate = typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_LOCAL_AI_ENDPOINT

  let url
  try {
    url = new URL(candidate)
  } catch {
    throw new Error(LOCAL_AI_ENDPOINT_MESSAGE)
  }

  const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
  if (url.protocol !== 'http:' || !loopbackHosts.has(url.hostname)) {
    throw new Error(LOCAL_AI_ENDPOINT_MESSAGE)
  }

  return url.toString()
}

export { DEFAULT_LOCAL_AI_ENDPOINT, LOCAL_AI_ENDPOINT_MESSAGE }
