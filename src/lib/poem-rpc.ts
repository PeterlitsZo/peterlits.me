import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

import type { VisiblePoemListItem } from './poem-models'

function getDb() {
  return env.peterlits_me
}

export type CreatePoemInput = {
  title: string
  content: string
}

const TITLE_MAX_LENGTH = 80
const CONTENT_MAX_LENGTH = 100_000

export function validateCreatePoemInput(data: unknown): CreatePoemInput {
  if (!data || typeof data !== 'object') {
    throw new Error('请填写诗的信息')
  }

  const record = data as { title?: unknown; content?: unknown }
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const content =
    typeof record.content === 'string' ? record.content.trim() : ''

  if (!title) {
    throw new Error('请填写诗名')
  }
  if (title.length > TITLE_MAX_LENGTH) {
    throw new Error('诗名不能超过 80 个字符')
  }

  if (!content) {
    throw new Error('请填写正文')
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new Error('正文过长')
  }

  return { title, content }
}

export async function createPoemFromData(
  data: CreatePoemInput,
  deps: {
    viewer: { role: string } | null
    db: D1Database
  },
): Promise<{ id: number }> {
  if (!deps.viewer || deps.viewer.role !== 'owner') {
    throw new Error('没有权限执行此操作')
  }

  await deps.db
    .prepare('INSERT INTO poems (title, content) VALUES (?, ?)')
    .bind(data.title, data.content)
    .run()

  const row = await deps.db
    .prepare('SELECT id FROM poems ORDER BY id DESC LIMIT 1')
    .first<{ id: number }>()

  if (!row) {
    throw new Error('创建诗失败')
  }

  return { id: row.id }
}

export const getVisiblePoems = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { results } = await getDb()
      .prepare(
        `
          SELECT id, title, content
          FROM poems
          ORDER BY created_at DESC, id DESC
        `,
      )
      .all<VisiblePoemListItem>()

    return results
  },
)

export const createPoem = createServerFn({ method: 'POST' })
  .validator(validateCreatePoemInput)
  .handler(async ({ data }) => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()
    return createPoemFromData(data, { viewer, db: getDb() })
  })
