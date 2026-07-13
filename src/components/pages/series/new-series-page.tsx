import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { CreateBlogSeriesInput } from '../../../lib/series-rpc'
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

export function NewSeriesPageView({
  onSubmit,
}: {
  onSubmit: (input: CreateBlogSeriesInput) => Promise<{ slug: string }>
}) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
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
        description: description.trim(),
      })
      // New draft series has no posts yet; send the owner home to see it.
      void result
      await navigate({ to: '/' })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '创建失败，请稍后再试'
      setState({ kind: 'error', message })
    }
  }

  const isPending = state.kind === 'pending'

  return (
    <PageFrame ariaLabel="新建系列" testId="new-series-page">
      <PageHeader title="新建系列" subtitle="吸收、沉淀、输出。" />

      <form
        aria-labelledby="new-series-title"
        className="flex flex-col gap-3 p-6"
        onSubmit={handleSubmit}
      >
        <h2 id="new-series-title" className="sr-only">
          新建系列表单
        </h2>

        <label className={`w-full max-w-[400px] ${fieldLabelClassName}`}>
          <span>名称</span>
          <input
            aria-label="系列名称"
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
            aria-label="系列链接标识"
            className={textInputClassName}
            disabled={isPending}
            name="slug"
            onChange={(e) => setSlug(e.target.value)}
            placeholder="如 tcp、tokio"
            required
            type="text"
            value={slug}
          />
        </label>

        <label className={`w-full max-w-[600px] ${fieldLabelClassName}`}>
          <span>描述</span>
          <textarea
            aria-label="系列描述"
            className={`min-h-[37px] ${textAreaClassName}`}
            disabled={isPending}
            maxLength={500}
            name="description"
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            value={description}
          />
        </label>

        {state.kind === 'error' ? <FormError>{state.message}</FormError> : null}

        <div className="flex w-full items-center justify-start overflow-clip pt-8">
          <button
            className={primarySubmitButtonClassName}
            disabled={isPending}
            type="submit"
          >
            新建
          </button>
        </div>
      </form>
    </PageFrame>
  )
}
