// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  buildAuthCookie,
  clearAuthCookie,
  getViewerBlogVisibility,
  loginWithPassword,
  parseCookieHeader,
  signAuthToken,
} from './auth'

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

describe('loginWithPassword', () => {
  it('throws a generic auth error when the user is missing', async () => {
    const db = {
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
      loginWithPassword({
        db,
        password: 'wrong',
        username: 'ghost',
      }),
    ).rejects.toThrow('用户名或密码错误')
  })
})

describe('signAuthToken', () => {
  it('creates a JWT string', async () => {
    const token = await signAuthToken({
      displayName: 'Peter',
      id: 1,
      role: 'owner',
      username: 'peter',
    })

    expect(token.split('.')).toHaveLength(3)
  })
})
