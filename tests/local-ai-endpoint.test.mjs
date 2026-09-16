import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeLocalAiEndpoint } from '../lib/local-ai-endpoint.mjs'

test('local AI endpoints are constrained to loopback HTTP origins', () => {
  assert.equal(
    normalizeLocalAiEndpoint('http://localhost:11434/v1/chat/completions'),
    'http://localhost:11434/v1/chat/completions',
  )
  assert.equal(
    normalizeLocalAiEndpoint('http://127.0.0.1:11434/v1/chat/completions'),
    'http://127.0.0.1:11434/v1/chat/completions',
  )
  assert.equal(
    normalizeLocalAiEndpoint('http://[::1]:11434/v1/chat/completions'),
    'http://[::1]:11434/v1/chat/completions',
  )
})

test('local AI endpoints reject remote, metadata, and non-http targets', () => {
  for (const value of [
    'https://api.example.com/v1/chat/completions',
    'http://169.254.169.254/latest/meta-data',
    'http://10.0.0.5:11434/v1/chat/completions',
    'file:///etc/passwd',
    'not a url',
  ]) {
    assert.throws(
      () => normalizeLocalAiEndpoint(value),
      /Local Model base URL must use http:\/\/localhost, http:\/\/127\.0\.0\.1, or http:\/\/\[::1\]/,
      value,
    )
  }
})
