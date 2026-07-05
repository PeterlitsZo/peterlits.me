import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

export const MEDIA_BASE_URL = 'https://static.peterlits.me'
export const MEDIA_MAX_SIZE = 10 * 1024 * 1024

// svg is intentionally excluded: served as image/svg+xml from the public
// bucket it can execute script, which is a stored-XSS risk.
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

export type UploadMediaFile = {
  name: string
  type: string
  size: number
  body: ArrayBuffer
}

export type UploadMediaDeps = {
  viewer: { role: string } | null
  bucket: {
    put: (
      key: string,
      body: ArrayBuffer,
      options: { httpMetadata: { contentType: string } },
    ) => Promise<unknown>
  }
  now?: () => Date
  randomUUID?: () => string
}

export type UploadMediaResult = { url: string; alt: string }

function assertOwner(viewer: { role: string } | null): asserts viewer is {
  role: 'owner'
} {
  if (!viewer || viewer.role !== 'owner') {
    throw new Error('没有权限执行此操作')
  }
}

export function buildAltFromFileName(fileName: string): string {
  const stem = fileName.replace(/\.[^./\\]*$/, '').trim()
  return stem || 'image'
}

export function buildMediaKey(
  type: string,
  now: Date,
  randomUUID: () => string,
): string {
  const ext = IMAGE_EXTENSIONS[type]

  if (!ext) {
    throw new Error('不支持的图片类型')
  }

  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')

  return `${yyyy}/${mm}/${randomUUID()}.${ext}`
}

export async function uploadMediaFromData(
  file: UploadMediaFile,
  deps: UploadMediaDeps,
): Promise<UploadMediaResult> {
  assertOwner(deps.viewer)

  if (!IMAGE_EXTENSIONS[file.type]) {
    throw new Error('仅支持 png、jpeg、webp、gif、avif 图片')
  }

  if (file.size <= 0) {
    throw new Error('图片文件为空')
  }

  if (file.size > MEDIA_MAX_SIZE) {
    throw new Error('图片不能超过 10 MB')
  }

  const now = deps.now ? deps.now() : new Date()
  const randomUUID = deps.randomUUID ?? (() => crypto.randomUUID())
  const key = buildMediaKey(file.type, now, randomUUID)

  return deps.bucket
    .put(key, file.body, { httpMetadata: { contentType: file.type } })
    .then(() => ({
      url: `${MEDIA_BASE_URL}/${key}`,
      alt: buildAltFromFileName(file.name),
    }))
}

export const uploadMedia = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: unknown }) => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()

    const formData = data
    if (!(formData instanceof FormData)) {
      throw new Error('请上传图片文件')
    }

    const file = formData.get('file')

    if (!(file instanceof File)) {
      throw new Error('请上传图片文件')
    }

    return uploadMediaFromData(
      {
        name: file.name,
        type: file.type,
        size: file.size,
        body: await file.arrayBuffer(),
      },
      { viewer, bucket: env.MEDIA },
    )
  },
)
