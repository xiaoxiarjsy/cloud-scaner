import type { JWTPayload } from 'jose'
import { SignJWT, jwtVerify } from 'jose'

export interface SessionPayload extends JWTPayload {
  userId: string
  jti: string
}

const encoder = new TextEncoder()

export async function signJWT(payload: SessionPayload, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function verifyJWT(token: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const { payload } = await jwtVerify(token, key)
  return payload as unknown as SessionPayload
}
