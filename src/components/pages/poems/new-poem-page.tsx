import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { CreatePoemInput } from '../../../lib/poem-rpc'
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

export function NewPoemPageView({
  onSubmit,
}: {
  onSubmit: (input: CreatePoemInput) => Promise<{ id: number }>
}) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [state, setState] = useState<SubmitState>({ kind: 'idle' })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state.kind === 'pending') {
      return
    }
    setState({ kind: 'pending' })

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
      })
      await navigate({ to: '/poems' })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '创建失败，请稍后再试'
      setState({ kind: 'error', message })
    }
  }

  const isPending = state.kind === 'pending'

  return (
    <PageFrame ariaLabel="新建诗" testId="new-poem-page">
      <PageHeader title="新建诗" subtitle="笔墨之间，且听风吟。" />

      <form
        aria-labelledby="new-poem-title"
        className="flex flex-col gap-3 p-6"
        onSubmit={handleSubmit}
      >
        <h2 id="new-poem-title" className="sr-only">
          新建诗表单
        </h2>

        <label className={`w-full max-w-[400px] ${fieldLabelClassName}`}>
          <span>诗名</span>
          <input
            aria-label="诗名"
            className={textInputClassName}
            disabled={isPending}
            name="title"
            onChange={(e) => setTitle(e.target.value)}
            required
            type="text"
            value={title}
          />
        </label>

        <label className={`h-[400px] w-full ${fieldLabelClassName}`}>
          <span>正文</span>
          <textarea
            aria-label="正文"
            className={`min-h-0 flex-1 leading-[1.8] ${textAreaClassName}`}
            disabled={isPending}
            name="content"
            onChange={(e) => setContent(e.target.value)}
            required
            value={content}
          />
        </label>

        {state.kind === 'error' ? <FormError>{state.message}</FormError> : null}

        <div className="flex w-full items-center justify-start overflow-clip pt-8">
          <button
            className={`${primarySubmitButtonClassName} w-24 font-semibold`}
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
