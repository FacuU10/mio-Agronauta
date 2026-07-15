import test from 'node:test'
import assert from 'node:assert/strict'
import { xmlTag } from './rss-parser.js'

test('xmlTag ignores self-closing tags and preserves namespace-prefixed normal tags', () => {
  const item = '<item><atom:link href="https://example.test/image.jpg" /><dc:title>Alerta hídrica</dc:title><link>https://example.test/alert</link></item>'

  assert.equal(xmlTag(item, 'title'), 'Alerta hídrica')
  assert.equal(xmlTag(item, 'link'), 'https://example.test/alert')
})
