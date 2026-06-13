// @vitest-environment node

import { SignJWT } from 'jose'
import { describe, expect, it, vi } from 'vitest'
import { env } from 'cloudflare:workers'
import {
  buildAuthCookie,
  clearAuthCookie,
  getViewerBlogVisibility,
  parseCookieHeader,
} from './auth'
import { getViewerFromRequest, loginFromRequest } from './auth.server'

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader(name: string) {
    return requestHeaders.get(name) ?? null
  },
  setResponseHeader(name: string, value: string) {
    responseHeaders.set(name, value)
  },
}))

const requestHeaders = new Map<string, string>()
const responseHeaders = new Map<string, string>()

async function createToken({
  id,
  role,
  username,
}: {
  id: number
  username: string
  role: 'owner' | 'reviewer'
}) {
  return await new SignJWT({
    role,
    username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setSubject(String(id))
    .sign(new TextEncoder().encode(env.AUTH_JWT_SECRET))
}

describe('parseCookieHeader', () => {
  it('returns named cookie values from a cookie header string', () => {
    expect(
      parseCookieHeader('theme=dark; auth_token=abc123; other=value'),
    ).toEqual({
      auth_token: 'abc123',
      other: 'value',
      theme: 'dark',
    })
  })

  it('returns an empty object for an empty cookie header', () => {
    expect(parseCookieHeader('')).toEqual({})
  })
})

describe('getViewerBlogVisibility', () => {
  it('returns public-only statuses for anonymous viewers', () => {
    expect(getViewerBlogVisibility(null)).toEqual({
      postStatuses: ['published', 'archived'],
      seriesStatuses: ['ongoing', 'completed', 'archived'],
    })
  })

  it('returns draft-inclusive statuses for authenticated viewers', () => {
    expect(
      getViewerBlogVisibility({
        displayName: 'Peter',
        id: 1,
        role: 'owner',
        username: 'peter',
      }),
    ).toEqual({
      postStatuses: ['draft', 'published', 'archived'],
      seriesStatuses: ['draft', 'ongoing', 'completed', 'archived'],
    })
  })

  it('returns public-only statuses for viewers with an invalid role payload', () => {
    expect(
      getViewerBlogVisibility({
        displayName: 'Peter',
        id: 1,
        role: 'editor' as never,
        username: 'peter',
      }),
    ).toEqual({
      postStatuses: ['published', 'archived'],
      seriesStatuses: ['ongoing', 'completed', 'archived'],
    })
  })
})

describe('auth cookie helpers', () => {
  it('builds a secure auth cookie', () => {
    const cookie = buildAuthCookie('signed.jwt.token')

    expect(cookie).toContain('auth_token=signed.jwt.token')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('SameSite=Lax')
  })

  it('builds a clearing auth cookie', () => {
    const cookie = clearAuthCookie()

    expect(cookie).toContain('auth_token=')
    expect(cookie).toContain('Max-Age=0')
  })
})

describe('loginFromRequest', () => {
  it('returns the generic auth error instead of crashing during input validation', async () => {
    const originalDb = env.peterlits_me

    env.peterlits_me = {
      prepare() {
        return {
          bind() {
            return {
              async first() {
                return null
              },
            }
          },
        }
      },
    } as unknown as D1Database

    await expect(
      loginFromRequest({
        username: 'ghost',
        password: 'wrong',
      }),
    ).rejects.toThrow('用户名或密码错误')

    env.peterlits_me = originalDb
  })

  it('returns the generic auth error when the stored role is invalid', async () => {
    const originalDb = env.peterlits_me

    env.peterlits_me = {
      prepare() {
        return {
          bind() {
            return {
              async first() {
                return {
                  id: 1,
                  username: 'peter',
                  displayName: 'Peter',
                  role: 'editor',
                  passwordHash: '$2b$10$KIXQ4A0zwM4h6NfA6Q8cwu5BrP2byQ7iI9iA4Yw0vO4lB0wPXxF1C',
                }
              },
            }
          },
        }
      },
    } as unknown as D1Database

    await expect(
      loginFromRequest({
        username: 'peter',
        password: 'secret',
      }),
    ).rejects.toThrow('用户名或密码错误')

    env.peterlits_me = originalDb
  })
})

describe('getViewerFromRequest', () => {
  it('clears the cookie when the persisted user has an invalid role', async () => {
    const originalDb = env.peterlits_me
    const token = await createToken({
      id: 1,
      role: 'owner',
      username: 'peter',
    })

    requestHeaders.set('cookie', `auth_token=${token}`)
    requestHeaders.set('host', 'peterlits.me')
    responseHeaders.clear()

    env.peterlits_me = {
      prepare() {
        return {
          bind() {
            return {
              async first() {
                return {
                  id: 1,
                  username: 'peter',
                  displayName: 'Peter',
                  role: 'editor',
                }
              },
            }
          },
        }
      },
    } as unknown as D1Database

    await expect(getViewerFromRequest()).resolves.toBeNull()
    expect(responseHeaders.get('set-cookie')).toContain('auth_token=')
    expect(responseHeaders.get('set-cookie')).toContain('Max-Age=0')

    env.peterlits_me = originalDb
    requestHeaders.clear()
    responseHeaders.clear()
  })

  it('does not clear the cookie when the user lookup fails after JWT verification', async () => {
    const originalDb = env.peterlits_me
    const token = await createToken({
      id: 1,
      role: 'owner',
      username: 'peter',
    })

    requestHeaders.set('cookie', `auth_token=${token}`)
    requestHeaders.set('host', 'peterlits.me')
    responseHeaders.clear()

    env.peterlits_me = {
      prepare() {
        return {
          bind() {
            return {
              async first() {
                throw new Error('database unavailable')
              },
            }
          },
        }
      },
    } as unknown as D1Database

    await expect(getViewerFromRequest()).rejects.toThrow('database unavailable')
    expect(responseHeaders.has('set-cookie')).toBe(false)

    env.peterlits_me = originalDb
    requestHeaders.clear()
    responseHeaders.clear()
  })
})
