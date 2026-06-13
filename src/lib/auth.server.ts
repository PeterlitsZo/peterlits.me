import '@tanstack/react-start/server-only'

import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'
import { jwtVerify } from 'jose'

import {
  AUTH_COOKIE_NAME,
  buildAuthCookie,
  clearAuthCookie,
  loginWithPassword,
  parseCookieHeader,
  signAuthToken,
  type Viewer,
} from './auth'

function isLocalHostname(host: string) {
  const hostname = host.split(':')[0]?.trim().toLowerCase()
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  )
}

function getJwtSecret() {
  const secret = env.AUTH_JWT_SECRET?.trim()

  if (!secret) {
    throw new Error('AUTH_JWT_SECRET is not configured')
  }

  return new TextEncoder().encode(secret)
}

function shouldUseSecureCookie() {
  const forwardedProto = getRequestHeader('x-forwarded-proto')

  if (forwardedProto === 'http') {
    return false
  }

  const host = getRequestHeader('host')

  if (host && isLocalHostname(host)) {
    return false
  }

  return true
}

export function setAuthCookie(token: string) {
  setResponseHeader('set-cookie', buildAuthCookie(token, shouldUseSecureCookie()))
}

export function clearAuthCookieHeader() {
  setResponseHeader('set-cookie', clearAuthCookie(shouldUseSecureCookie()))
}

export function getAuthCookieToken() {
  const cookieHeader = getRequestHeader('cookie') ?? ''
  return parseCookieHeader(cookieHeader)[AUTH_COOKIE_NAME] ?? null
}

export async function getViewerFromRequest() {
  const token = getAuthCookieToken()

  if (!token) {
    return null
  }

  const jwtSecret = getJwtSecret()

  try {
    const result = await jwtVerify(token, jwtSecret)
    const payload = result.payload
    const userId = Number(payload.sub)

    if (!Number.isInteger(userId) || userId <= 0) {
      clearAuthCookieHeader()
      return null
    }

    const user = await env.peterlits_me
      .prepare(
        `
          SELECT
            id,
            username,
            display_name AS displayName,
            role
          FROM users
          WHERE id = ?
          LIMIT 1
        `,
      )
      .bind(userId)
      .first<Viewer>()

    if (!user) {
      clearAuthCookieHeader()
      return null
    }

    return user
  } catch {
    clearAuthCookieHeader()
    return null
  }
}

export async function loginFromRequest(data: unknown) {
  const input = validateLoginInput(data)
  const viewer = await loginWithPassword({
    db: env.peterlits_me,
    password: input.password,
    username: input.username,
  })

  const token = await signAuthToken(viewer)
  setAuthCookie(token)

  return viewer
}

export async function logoutFromRequest() {
  clearAuthCookieHeader()
  return { ok: true as const }
}
