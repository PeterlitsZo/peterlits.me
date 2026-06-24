import { createFileRoute } from '@tanstack/react-router'

import { PoemListPageView } from '../../components/poem-list-page'
import { getViewer } from '../../lib/auth-rpc'
import { getVisiblePoems } from '../../lib/poem-rpc'

export const Route = createFileRoute('/poems/')({
  loader: async () => {
    const [poems, viewer] = await Promise.all([getVisiblePoems(), getViewer()])
    return { poems, viewer }
  },
  component: PoemsIndex,
})

function PoemsIndex() {
  const { poems, viewer } = Route.useLoaderData()

  return <PoemListPageView poems={poems} viewer={viewer} />
}
