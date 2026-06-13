import { createServerFn } from '@tanstack/react-start'

import { validateLoginInput } from './auth'

export const getViewer = createServerFn({ method: 'GET' }).handler(async () => {
  const { getViewerFromRequest } = await import('./auth.server')
  return await getViewerFromRequest()
})

export const login = createServerFn({ method: 'POST' })
  .validator(validateLoginInput)
  .handler(async ({ data }) => {
    const { loginFromRequest } = await import('./auth.server')
    return await loginFromRequest(data)
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const { logoutFromRequest } = await import('./auth.server')
  return await logoutFromRequest()
})
