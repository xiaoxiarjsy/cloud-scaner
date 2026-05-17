const prefixes = {
  scan: 'scan',
  finding: 'fnd',
  request: 'req',
  user: 'user',
  sess: 'sess',
  log: 'log',
  tok: 'tok'
} as const

export type IdKind = keyof typeof prefixes

export function newId(kind: IdKind) {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${prefixes[kind]}_${token}`
}

export async function sha256Hex(value: string) {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
