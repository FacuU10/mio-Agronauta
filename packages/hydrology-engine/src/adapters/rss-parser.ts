const OPEN_TAG = /<([A-Za-z][\w.-]*:)?([A-Za-z][\w.-]*)(?:\s[^>]*)?(?<!\/)>/g
const CLOSE_TAG = /<\/([A-Za-z][\w.-]*:)?([A-Za-z][\w.-]*)\s*>/g

export function boundedRssItems(payload: string, maxItems: number): string[] {
  const items: string[] = []
  const open = /<([A-Za-z][\w.-]*:)?item(?:\s[^>]*)?>/gi
  let opening: RegExpExecArray | null
  while (items.length < maxItems && (opening = open.exec(payload)) !== null) {
    const prefix = (opening[1] ?? '').toLowerCase()
    CLOSE_TAG.lastIndex = open.lastIndex
    let closing: RegExpExecArray | null = null
    while ((closing = CLOSE_TAG.exec(payload)) !== null) {
      if ((closing[1] ?? '').toLowerCase() === prefix && (closing[2] ?? '').toLowerCase() === 'item') break
    }
    if (!closing) break
    items.push(payload.slice(open.lastIndex, closing.index))
    open.lastIndex = CLOSE_TAG.lastIndex
  }
  return items
}

export function xmlTag(value: string, wantedTag: string): string | undefined {
  const wanted = wantedTag.toLowerCase()
  OPEN_TAG.lastIndex = 0
  let opening: RegExpExecArray | null
  while ((opening = OPEN_TAG.exec(value)) !== null) {
    if ((opening[2] ?? '').toLowerCase() !== wanted) continue
    const prefix = (opening[1] ?? '').toLowerCase()
    CLOSE_TAG.lastIndex = OPEN_TAG.lastIndex
    let closing: RegExpExecArray | null = null
    while ((closing = CLOSE_TAG.exec(value)) !== null) {
      if ((closing[1] ?? '').toLowerCase() === prefix && (closing[2] ?? '').toLowerCase() === wanted) break
    }
    if (!closing) return undefined
    return cleanXmlText(value.slice(OPEN_TAG.lastIndex, closing.index))
  }
  return undefined
}

function cleanXmlText(value: string): string | undefined {
  const text = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim()
  return text || undefined
}
