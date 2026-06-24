import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPageView } from '../../components/placeholder-page'

export const Route = createFileRoute('/poems/')({
  component: PoemsIndex,
})

function PoemsIndex() {
  return <PlaceholderPageView title="诗" />
}
