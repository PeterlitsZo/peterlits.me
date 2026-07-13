import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import remarkAdmonition from '../../../lib/remark-admonition'
import remarkDefinitionList from '../../../lib/remark-definition-list'

export function BlogPostMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeKatex]}
      remarkPlugins={[
        remarkGfm,
        remarkMath,
        remarkAdmonition,
        remarkDefinitionList,
      ]}
    >
      {content}
    </ReactMarkdown>
  )
}
