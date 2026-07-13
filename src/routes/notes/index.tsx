import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPageView } from '../../components/pages/placeholder/placeholder-page'

export const Route = createFileRoute('/notes/')({
  component: NotesIndex,
})

function NotesIndex() {
  return <PlaceholderPageView title="读书笔记" />
}
