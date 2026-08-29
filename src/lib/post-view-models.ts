import type { Viewer } from './auth'

export type RecordBlogPostViewInput = {
  seriesSlug: string
  postSlug: string
  viewId: string
  path: string
  referrer: string
  clientLanguage: string
  clientTimezone: string
  viewportWidth: number | null
  viewportHeight: number | null
  screenWidth: number | null
  screenHeight: number | null
  clientViewedAt: string
}

export type RecordBlogPostViewContext = {
  post: {
    id: number
    seriesSlug: string
    postSlug: string
  }
  viewer: Viewer | null
  headers: {
    ipAddress: string
    userAgent: string
    cfIpCountry: string
    acceptLanguage: string
  }
}

type HeaderReader = {
  get: (name: string) => string | null
}

const SLUG_MAX_LENGTH = 120
const VIEW_ID_MAX_LENGTH = 128
const PATH_MAX_LENGTH = 2_000
const REFERRER_MAX_LENGTH = 2_000
const LANGUAGE_MAX_LENGTH = 128
const TIMEZONE_MAX_LENGTH = 128
const CLIENT_VIEWED_AT_MAX_LENGTH = 128
const BOT_USER_AGENT_PATTERN =
  /(bot|crawler|spider|preview|facebookexternalhit|twitterbot|slurp|bingpreview|curl|wget)/i

function normalizeRequiredString({
  fieldName,
  maxLength,
  message,
  value,
}: {
  fieldName: string
  maxLength: number
  message: string
  value: unknown
}) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (!text) {
    throw new Error(message)
  }
  if (text.length > maxLength) {
    throw new Error(`${fieldName} is too long`)
  }

  return text
}

function normalizeOptionalString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, maxLength)
}

function normalizeNullableInteger(value: unknown) {
  if (!Number.isInteger(value) || (value as number) < 0) {
    return null
  }

  return value as number
}

function getHeaderValue(headers: HeaderReader | Headers, name: string) {
  return headers.get(name)?.trim() ?? ''
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function validateRecordBlogPostViewInput(
  data: unknown,
): RecordBlogPostViewInput {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid blog post view payload')
  }

  const record = data as Record<string, unknown>

  return {
    seriesSlug: normalizeRequiredString({
      fieldName: 'seriesSlug',
      maxLength: SLUG_MAX_LENGTH,
      message: 'seriesSlug is required',
      value: record.seriesSlug,
    }),
    postSlug: normalizeRequiredString({
      fieldName: 'postSlug',
      maxLength: SLUG_MAX_LENGTH,
      message: 'postSlug is required',
      value: record.postSlug,
    }),
    viewId: normalizeRequiredString({
      fieldName: 'viewId',
      maxLength: VIEW_ID_MAX_LENGTH,
      message: 'viewId is required',
      value: record.viewId,
    }),
    path: normalizeOptionalString(record.path, PATH_MAX_LENGTH),
    referrer: normalizeOptionalString(record.referrer, REFERRER_MAX_LENGTH),
    clientLanguage: normalizeOptionalString(
      record.clientLanguage,
      LANGUAGE_MAX_LENGTH,
    ),
    clientTimezone: normalizeOptionalString(
      record.clientTimezone,
      TIMEZONE_MAX_LENGTH,
    ),
    viewportWidth: normalizeNullableInteger(record.viewportWidth),
    viewportHeight: normalizeNullableInteger(record.viewportHeight),
    screenWidth: normalizeNullableInteger(record.screenWidth),
    screenHeight: normalizeNullableInteger(record.screenHeight),
    clientViewedAt: normalizeOptionalString(
      record.clientViewedAt,
      CLIENT_VIEWED_AT_MAX_LENGTH,
    ),
  }
}

export function isBotUserAgent(userAgent: string) {
  return !userAgent.trim() || BOT_USER_AGENT_PATTERN.test(userAgent)
}

export function getClientIpFromHeaders(headers: HeaderReader | Headers) {
  const cfConnectingIp = getHeaderValue(headers, 'cf-connecting-ip')

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  const forwardedFor = getHeaderValue(headers, 'x-forwarded-for')

  return forwardedFor.split(',')[0]?.trim() ?? ''
}

export async function buildVisitorKey({
  ipAddress,
  userAgent,
  viewer,
}: {
  viewer: Pick<Viewer, 'id'> | null
  ipAddress: string
  userAgent: string
}) {
  if (viewer) {
    return `user:${viewer.id}`
  }

  return `anon:${await sha256Hex(`${ipAddress}\n${userAgent}`)}`
}
