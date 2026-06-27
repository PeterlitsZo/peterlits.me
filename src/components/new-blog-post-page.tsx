import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { CreateBlogPostInput } from '../lib/post-rpc'
import { AuthTopBar } from './site-shell'

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; message: string }

export function NewBlogPostPageView({
  initialContent = '',
  initialSlug = '',
  initialTitle = '',
  parentPostSlug,
  seriesSlug,
  submitLabel = '新建',
  titleText = '新建博客',
  onSubmit,
}: {
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

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="new-blog-post-page">
      <main
        aria-label="新建博客"
        className="mx-auto flex min-h-screen w-full max-w-[800px] flex-col overflow-clip border-x border-[#F3F4F6] bg-white"
      >
        <AuthTopBar />

        <header className="flex h-[300px] shrink-0 flex-col justify-end overflow-clip p-6">
          <h1 className="text-[48px] leading-none font-normal text-[#030712]">
            {titleText}
          </h1>
          <p className="mt-2 text-[24px] leading-none font-normal text-[#4A5565]">
            吸收、沉淀、输出。
          </p>
        </header>

        <form
          aria-labelledby="new-blog-post-title"
          className="flex flex-col gap-3 p-6"
          onSubmit={handleSubmit}
        >
          <h2 id="new-blog-post-title" className="sr-only">
            新建博客表单
          </h2>

          <label className="flex w-full max-w-[400px] flex-col gap-1 text-[12px] leading-[normal] font-normal text-black">
            <span>名称</span>
            <input
              aria-label="博客标题"
              className="h-[37px] rounded-[8px] border border-[#E5E7EB] px-3 text-[16px] text-black outline-none transition-colors focus:border-[#D1D5DB]"
              disabled={isPending}
              name="title"
              onChange={(e) => setTitle(e.target.value)}
              required
              type="text"
              value={title}
            />
          </label>

          <label className="flex w-full max-w-[400px] flex-col gap-1 text-[12px] leading-[normal] font-normal text-black">
            <span>链接标识</span>
            <input
              aria-label="博客链接标识"
              className="h-[37px] rounded-[8px] border border-[#E5E7EB] px-3 text-[16px] text-black outline-none transition-colors focus:border-[#D1D5DB]"
              disabled={isPending}
              name="slug"
              onChange={(e) => setSlug(e.target.value)}
              placeholder="如 intro、handshake"
              required
              type="text"
              value={slug}
            />
          </label>

          <label className="flex h-[400px] w-full flex-col gap-1 text-[12px] leading-[normal] font-normal text-black">
            <span>内容</span>
            <textarea
              aria-label="博客内容"
              className="min-h-0 flex-1 rounded-[8px] border border-[#E5E7EB] px-3 py-2 text-[16px] leading-[1.8] text-black outline-none transition-colors focus:border-[#D1D5DB]"
              disabled={isPending}
              name="content"
              onChange={(e) => setContent(e.target.value)}
              required
              value={content}
            />
          </label>

          {state.kind === 'error' ? (
            <p
              role="alert"
              className="m-0 text-[14px] leading-5 text-[#B42318]"
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex w-full items-center justify-start overflow-clip pt-8">
            <button
              className="inline-flex h-9 items-center justify-center rounded-[4px] border-0 bg-[#059669] px-8 text-[16px] leading-[normal] font-normal text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isPending}
              type="submit"
            >
              {submitLabel}
            </button>
          </div>
        </form>

        <div className="min-h-0 flex-1" />
      </main>
    </div>
  )
}
