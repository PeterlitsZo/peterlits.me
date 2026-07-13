import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { NewPoemPageView } from '../../components/pages/poems/new-poem-page'
import { getViewer } from '../../lib/auth-rpc'
import { createPoem } from '../../lib/poem-rpc'

export const Route = createFileRoute('/poems/new')({
  beforeLoad: async () => {
    const viewer = await getViewer()
    if (!viewer || viewer.role !== 'owner') {
      throw redirect({ to: '/poems' })
    }
  },
  component: NewPoemRoute,
})

function NewPoemRoute() {
  const createPoemFn = useServerFn(createPoem)

  return <NewPoemPageView onSubmit={(input) => createPoemFn({ data: input })} />
}
