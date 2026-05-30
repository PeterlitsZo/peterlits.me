import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  BlogPostMarkdown,
  getChapterItems,
} from '../../../components/blog-post-page'

describe('getChapterItems', () => {
  it('appends a pending item for ongoing series', () => {
    const items = getChapterItems(
      [
        {
          slug: 'intro',
          title: '起步',
          position: 1,
          status: 'published',
        },
      ],
      'intro',
      'ongoing',
    )

    expect(items).toEqual([
      {
        kind: 'post',
        slug: 'intro',
        title: '起步',
        position: 1,
        isCurrent: true,
      },
      {
        kind: 'pending',
        position: 2,
      },
    ])
  })
})

describe('BlogPostMarkdown', () => {
  it('renders markdown content as structured elements', () => {
    render(
      <BlogPostMarkdown
        content={[
          '## 起步',
          '',
          'TCP 是一种面向连接的协议。',
          '',
          '```sh',
          'nc -l4 -p 12345',
          '```',
        ].join('\n')}
      />,
    )

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '起步',
      }),
    ).toBeTruthy()
    expect(screen.getByText('TCP 是一种面向连接的协议。')).toBeTruthy()
    expect(screen.getByText('nc -l4 -p 12345')).toBeTruthy()
  })
})
