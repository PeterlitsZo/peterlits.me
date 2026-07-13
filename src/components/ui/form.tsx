export type SubmitState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; message: string }

export const fieldLabelClassName =
  'flex flex-col gap-1 text-[12px] leading-[normal] font-normal text-black'

export const textInputClassName =
  'h-[37px] rounded-[8px] border border-[#E5E7EB] px-3 text-[16px] text-black outline-none transition-colors focus:border-[#D1D5DB]'

export const textAreaClassName =
  'rounded-[8px] border border-[#E5E7EB] px-3 py-2 text-[16px] text-black outline-none transition-colors focus:border-[#D1D5DB]'

export const primarySubmitButtonClassName =
  'inline-flex h-9 items-center justify-center rounded-[4px] border-0 bg-[#059669] px-8 text-[16px] leading-[normal] font-normal text-white disabled:cursor-not-allowed disabled:opacity-70'

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="m-0 text-[14px] leading-5 text-[#B42318]">
      {children}
    </p>
  )
}
