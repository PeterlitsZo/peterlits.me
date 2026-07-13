import { X } from 'lucide-react'

import {
  FormError,
  primarySubmitButtonClassName,
  textInputClassName,
} from '../ui/form'

export function LoginModal({
  errorMessage,
  isPending,
  onClose,
  onSubmit,
}: {
  isPending: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (formData: FormData) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[206px]">
      <button
        aria-label="关闭登录弹窗遮罩"
        className="absolute inset-0 bg-[#030712]/10"
        data-testid="login-modal-overlay"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="login-modal-title"
        aria-modal="true"
        className="relative flex w-full max-w-[320px] flex-col gap-6 overflow-clip rounded-[12px] border border-[#D1D5DB] bg-white p-6"
        role="dialog"
      >
        <button
          aria-label="关闭登录弹窗"
          className="absolute right-[7px] top-[7px] flex items-center justify-center overflow-clip border-0 bg-transparent p-1 text-[#4B5563]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>

        <div className="flex h-16 w-full shrink-0 items-end">
          <h2
            className="m-0 text-[32px] leading-[normal] font-normal text-black"
            id="login-modal-title"
          >
            登录
          </h2>
        </div>

        <form
          className="flex w-full flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(new FormData(event.currentTarget))
          }}
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] leading-[normal] font-normal text-black">
              <span>用户名</span>
              <input
                className={textInputClassName}
                name="username"
                required
                type="text"
              />
            </label>

            <label className="flex flex-col gap-1 text-[12px] leading-[normal] font-normal text-black">
              <span>密码</span>
              <input
                className={textInputClassName}
                name="password"
                required
                type="password"
              />
            </label>
          </div>

          {errorMessage ? <FormError>{errorMessage}</FormError> : null}

          <div className="flex h-9 w-full shrink-0 items-center justify-end overflow-clip">
            <button
              className={primarySubmitButtonClassName}
              disabled={isPending}
              type="submit"
            >
              登录
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
