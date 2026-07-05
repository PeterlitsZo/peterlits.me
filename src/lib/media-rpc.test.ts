import { describe, expect, it } from 'vitest'

import {
  MEDIA_BASE_URL,
  MEDIA_MAX_SIZE,
  buildAltFromFileName,
  buildMediaKey,
  uploadMediaFromData,
} from './media-rpc'

const ownerViewer = { role: 'owner' }
const reviewerViewer = { role: 'reviewer' }

function fakeBucket() {
  const puts: Array<{
    key: string
    body: ArrayBuffer
    options: { httpMetadata: { contentType: string } }
  }> = []
  return {
    puts,
    bucket: {
      async put(
        key: string,
        body: ArrayBuffer,
        options: { httpMetadata: { contentType: string } },
      ) {
        puts.push({ key, body, options })
      },
    },
  }
}

function pngFile(
  overrides: Partial<{
    name: string
    type: string
    size: number
    body: ArrayBuffer
  }> = {},
) {
  const body = overrides.body ?? new ArrayBuffer(8)
  return {
    name: overrides.name ?? 'photo.png',
    type: overrides.type ?? 'image/png',
    size: overrides.size ?? body.byteLength,
    body,
  }
}

describe('buildAltFromFileName', () => {
  it('strips the extension and trims whitespace', () => {
    expect(buildAltFromFileName('my photo.PNG')).toBe('my photo')
    expect(buildAltFromFileName('  screenshot  ')).toBe('screenshot')
  })

  it('falls back to image when the name has no stem', () => {
    expect(buildAltFromFileName('.png')).toBe('image')
    expect(buildAltFromFileName('   ')).toBe('image')
  })
})

describe('buildMediaKey', () => {
  it('builds a yyyy/mm/uuid.ext key', () => {
    const now = new Date(Date.UTC(2026, 6, 4, 9, 30))
    const key = buildMediaKey('image/png', now, () => 'abc-123')
    expect(key).toBe('2026/07/abc-123.png')
  })

  it('rejects unsupported types', () => {
    expect(() => buildMediaKey('image/svg+xml', new Date(), () => 'x')).toThrow(
      '不支持的图片类型',
    )
  })
})

describe('uploadMediaFromData', () => {
  it('rejects reviewers', async () => {
    const { bucket } = fakeBucket()
    await expect(
      uploadMediaFromData(pngFile(), { viewer: reviewerViewer, bucket }),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('rejects anonymous viewers', async () => {
    const { bucket } = fakeBucket()
    await expect(
      uploadMediaFromData(pngFile(), { viewer: null, bucket }),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('rejects non-image content types', async () => {
    const { bucket } = fakeBucket()
    await expect(
      uploadMediaFromData(pngFile({ type: 'application/pdf', size: 8 }), {
        viewer: ownerViewer,
        bucket,
      }),
    ).rejects.toThrow('仅支持 png、jpeg、webp、gif、avif 图片')
  })

  it('rejects svg even though it is an image/* type', async () => {
    const { bucket } = fakeBucket()
    await expect(
      uploadMediaFromData(pngFile({ type: 'image/svg+xml', size: 8 }), {
        viewer: ownerViewer,
        bucket,
      }),
    ).rejects.toThrow('仅支持 png、jpeg、webp、gif、avif 图片')
  })

  it('rejects empty files', async () => {
    const { bucket } = fakeBucket()
    await expect(
      uploadMediaFromData(pngFile({ size: 0, body: new ArrayBuffer(0) }), {
        viewer: ownerViewer,
        bucket,
      }),
    ).rejects.toThrow('图片文件为空')
  })

  it('rejects files larger than 10 MB', async () => {
    const { bucket } = fakeBucket()
    await expect(
      uploadMediaFromData(pngFile({ size: MEDIA_MAX_SIZE + 1 }), {
        viewer: ownerViewer,
        bucket,
      }),
    ).rejects.toThrow('图片不能超过 10 MB')
  })

  it('puts the file in the bucket with the right key and content type', async () => {
    const { bucket, puts } = fakeBucket()
    const body = new ArrayBuffer(8)
    const now = new Date(Date.UTC(2026, 6, 4))

    const result = await uploadMediaFromData(pngFile({ body }), {
      viewer: ownerViewer,
      bucket,
      now: () => now,
      randomUUID: () => 'uuid-1',
    })

    expect(puts).toEqual([
      {
        key: '2026/07/uuid-1.png',
        body,
        options: { httpMetadata: { contentType: 'image/png' } },
      },
    ])
    expect(result).toEqual({
      url: `${MEDIA_BASE_URL}/2026/07/uuid-1.png`,
      alt: 'photo',
    })
  })

  it('maps jpeg content type to the jpg extension', async () => {
    const { bucket, puts } = fakeBucket()
    const result = await uploadMediaFromData(
      pngFile({ name: 'cam.jpeg', type: 'image/jpeg' }),
      {
        viewer: ownerViewer,
        bucket,
        now: () => new Date(Date.UTC(2026, 0, 15)),
        randomUUID: () => 'z',
      },
    )
    expect(puts[0]?.key).toBe('2026/01/z.jpg')
    expect(result.alt).toBe('cam')
  })
})
