import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import type { CreateBlogPostInput } from '../../../lib/post-rpc'
import { uploadMedia } from '../../../lib/media-rpc'
import type { UploadMediaResult } from '../../../lib/media-rpc'
import { PageFrame } from '../../layout/page-frame'
import { PageHeader } from '../../layout/page-header'
import {
  FormError,
  fieldLabelClassName,
  primarySubmitButtonClassName,
  textAreaClassName,
  textInputClassName,
} from '../../ui/form'
import type { SubmitState } from '../../ui/form'
import {
  buildImageMarkdown,
  insertAtOffset,
  replaceRange,
} from '../../domain/blog/blog-post-editor-utils'

const UPLOADING_PLACEHOLDER = 'uploading…'

export function NewBlogPostPageView({
  uploadMediaFn,
  initialContent = '',
  initialSlug = '',
  initialTitle = '',
  parentPostSlug,
  seriesSlug,
  submitLabel = '新建',
  titleText = '新建博客',
  onSubmit,
}: {
  uploadMediaFn?: (args: { data: FormData }) => Promise<UploadMediaResult>
  initialContent?: string
  initialSlug?: string
  initialTitle?: string
  parentPostSlug?: string
  seriesSlug: string
  submitLabel?: string
  titleText?: string
  onSubmit: (input: CreateBlogPostInput) => Promise<{ slug: string }>
}) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(initialTitle)
  const [slug, setSlug] = useState(initialSlug)
  const [content, setContent] = useState(initialContent)
  const [state, setState] = useState<SubmitState>({ kind: 'idle' })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const restoreCaretRef = useRef<number | null>(null)
  // Mirror of `content` that is updated synchronously so the async upload
  // pipeline can read the freshest value without waiting for React to flush
  // the DOM after each setContent.
  const liveContentRef = useRef(initialContent)
  liveContentRef.current = content
  const upload =
    uploadMediaFn ??
    (useServerFn(uploadMedia) as unknown as (args: {
      data: FormData
    }) => Promise<UploadMediaResult>)

  useEffect(() => {
    if (restoreCaretRef.current === null) {
      return
    }
    const caret = restoreCaretRef.current
    restoreCaretRef.current = null
    const node = contentRef.current
    if (node && document.activeElement !== node) {
      node.focus()
    }
    if (node) {
      node.setSelectionRange(caret, caret)
    }
  }, [content])

  async function uploadImagesAtOffset(
    offset: number,
    files: File[],
  ): Promise<void> {
    let cursor = offset

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue
      }

      const alt = file.name.replace(/\.[^./\\]*$/, '').trim() || 'image'
      const placeholder = buildImageMarkdown(alt, UPLOADING_PLACEHOLDER)
      const inserted = insertAtOffset(
        await readContent(),
        cursor,
        `${placeholder}\n`,
      )
      cursor = inserted.caret
      await applyContent(inserted.text, inserted.caret)

      try {
        setUploadError(null)
        const formData = new FormData()
        formData.append('file', file)
        const result = await upload({ data: formData })
        const markdown = buildImageMarkdown(result.alt, result.url)
        const current = await readContent()
        const placeholderStart = current.indexOf(placeholder)
        if (placeholderStart === -1) {
          continue
        }
        const replaced = replaceRange(
          current,
          placeholderStart,
          placeholderStart + placeholder.length,
          markdown,
        )
        cursor = replaced.caret
        await applyContent(replaced.text, replaced.caret)
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : '图片上传失败，请稍后再试',
        )
        const current = await readContent()
        const placeholderStart = current.indexOf(placeholder)
        if (placeholderStart !== -1) {
          const removed = replaceRange(
            current,
            placeholderStart,
            placeholderStart + placeholder.length,
            '',
          )
          cursor = removed.caret
          await applyContent(removed.text, removed.caret)
        }
      }
    }
  }

  function readContent(): Promise<string> {
    return Promise.resolve(liveContentRef.current)
  }

  function applyContent(next: string, caret: number): Promise<void> {
    liveContentRef.current = next
    restoreCaretRef.current = caret
    setContent(next)
    return Promise.resolve()
  }

  function caretOffsetFromDrop() {
    const node = contentRef.current
    if (!node) {
      return 0
    }
    if (document.activeElement !== node) {
      node.focus()
    }
    // Best-effort: focus the textarea so the browser updates the caret, then
    // use the live selection as the drop insertion point.
    return node.selectionStart
  }

  function imageFilesFromDataTransfer(dataTransfer: DataTransfer | null) {
    if (!dataTransfer) {
      return []
    }
    return Array.from(dataTransfer.files).filter((file) =>
      file.type.startsWith('image/'),
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state.kind === 'pending') {
      return
    }
    setState({ kind: 'pending' })

    try {
      const result = await onSubmit({
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim(),
        ...(parentPostSlug ? { parentPostSlug } : {}),
      })
      await navigate({
        to: '/blogs/$seriesSlug/$postSlug',
        params: { seriesSlug, postSlug: result.slug },
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '创建失败，请稍后再试'
      setState({ kind: 'error', message })
    }
  }

  const isPending = state.kind === 'pending'

  async function handleContentDrop(
    event: React.DragEvent<HTMLTextAreaElement>,
  ) {
    const files = imageFilesFromDataTransfer(event.dataTransfer)
    if (files.length === 0 || isPending) {
      return
    }
    event.preventDefault()
    const offset = caretOffsetFromDrop()
    await uploadImagesAtOffset(offset, files)
  }

  function handleContentDragOver(event: React.DragEvent<HTMLTextAreaElement>) {
    if (isPending) {
      return
    }
    if (imageFilesFromDataTransfer(event.dataTransfer).length > 0) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  async function handleContentPaste(
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) {
    if (isPending) {
      return
    }
    const files = imageFilesFromDataTransfer(event.clipboardData)
    if (files.length === 0) {
      return
    }
    event.preventDefault()
    const node = contentRef.current
    const offset = node ? node.selectionStart : 0
    await uploadImagesAtOffset(offset, files)
  }

  return (
    <PageFrame ariaLabel="新建博客" testId="new-blog-post-page">
      <PageHeader title={titleText} subtitle="吸收、沉淀、输出。" />

      <form
        aria-labelledby="new-blog-post-title"
        className="flex flex-col gap-3 p-6"
        onSubmit={handleSubmit}
      >
        <h2 id="new-blog-post-title" className="sr-only">
          新建博客表单
        </h2>

        <label className={`w-full max-w-[400px] ${fieldLabelClassName}`}>
          <span>名称</span>
          <input
            aria-label="博客标题"
            className={textInputClassName}
            disabled={isPending}
            name="title"
            onChange={(e) => setTitle(e.target.value)}
            required
            type="text"
            value={title}
          />
        </label>

        <label className={`w-full max-w-[400px] ${fieldLabelClassName}`}>
          <span>链接标识</span>
          <input
            aria-label="博客链接标识"
            className={textInputClassName}
            disabled={isPending}
            name="slug"
            onChange={(e) => setSlug(e.target.value)}
            placeholder="如 intro、handshake"
            required
            type="text"
            value={slug}
          />
        </label>

        <label className={`h-[400px] w-full ${fieldLabelClassName}`}>
          <span>内容</span>
          <textarea
            aria-label="博客内容"
            onDragOver={handleContentDragOver}
            onDrop={handleContentDrop}
            onPaste={handleContentPaste}
            ref={contentRef}
            className={`min-h-0 flex-1 leading-[1.8] ${textAreaClassName}`}
            disabled={isPending}
            name="content"
            onChange={(e) => setContent(e.target.value)}
            required
            value={content}
          />
        </label>

        {state.kind === 'error' ? <FormError>{state.message}</FormError> : null}

        {uploadError ? <FormError>{uploadError}</FormError> : null}

        <div className="flex w-full items-center justify-start overflow-clip pt-8">
          <button
            className={primarySubmitButtonClassName}
            disabled={isPending}
            type="submit"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </PageFrame>
  )
}
