import '@tanstack/react-start/server-only'

import bcrypt from 'bcryptjs'
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'
import { jwtVerify, SignJWT } from 'jose'

import {
  AUTH_COOKIE_NAME,
  buildAuthCookie,
  clearAuthCookie,
  isAuthRole,
  parseCookieHeader,
  validateLoginInput,
} from './auth'
import type { Viewer } from './auth'

type UserRecord = Viewer & {
  passwordHash: string
}

function isLocalHostname(host: string) {
  const hostname = host.split(':')[0].trim().toLowerCase()
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  )
}

function getJwtSecret() {
  const secret = env.AUTH_JWT_SECRET.trim()

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

async function signAuthToken(viewer: Viewer) {
  return await new SignJWT({
    role: viewer.role,
    username: viewer.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setSubject(String(viewer.id))
    .sign(getJwtSecret())
}

async function verifyPassword(password: string, passwordHash: string) {
  return await bcrypt.compare(password, passwordHash)
}

async function loginWithPassword({
  db,
  password,
  username,
}: {
  db: D1Database
  username: string
  password: string
}) {
  const user = await db
    .prepare(
      `
        SELECT
          id,
          username,
          display_name AS displayName,
          role,
          password_hash AS passwordHash
        FROM users
        WHERE username = ?
        LIMIT 1
      `,
    )
    .bind(username)
    .first<UserRecord>()

  if (!user || !isAuthRole(user.role)) {
    throw new Error('用户名或密码错误')
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash)

  if (!passwordMatches) {
    throw new Error('用户名或密码错误')
  }

  const { passwordHash: _, ...viewer } = user
  return viewer
}

export async function getViewerFromRequest() {
  const token = getAuthCookieToken()

  if (!token) {
    return null
  }

  const jwtSecret = getJwtSecret()

  let userId: number

  try {
    const result = await jwtVerify(token, jwtSecret)
    userId = Number(result.payload.sub)
  } catch {
    clearAuthCookieHeader()
    return null
  }

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

  if (!user || !isAuthRole(user.role)) {
    clearAuthCookieHeader()
    return null
  }

  return user
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
