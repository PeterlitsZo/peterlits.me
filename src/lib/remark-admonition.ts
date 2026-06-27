type MarkdownNode = {
  children?: MarkdownNode[]
  data?: {
    hName?: string
    hProperties?: Record<string, string>
  }
  type: string
  value?: string
}

const ADMONITION_PATTERN = /^\[!(note|tip|important|warning|caution)\]\s*$/i

const ADMONITION_TITLES: Record<string, string> = {
  caution: 'Caution',
  important: 'Important',
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
}

export default function remarkAdmonition() {
  return (tree: MarkdownNode) => {
    transformNode(tree)
  }
}

function transformNode(node: MarkdownNode) {
  if (!node.children) {
    return
  }

  node.children = node.children.map(transformChild)

  for (const child of node.children) {
    transformNode(child)
  }
}

function transformChild(node: MarkdownNode) {
  const admonition = parseAdmonition(node)

  if (!admonition) {
    return node
  }

  return {
    ...node,
    data: {
      ...node.data,
      hName: 'blockquote',
      hProperties: {
        ...node.data?.hProperties,
        'data-admonition-type': admonition.type,
      },
    },
    children: [
      {
        type: 'paragraph',
        data: {
          hName: 'p',
          hProperties: {
            'data-admonition-title': '',
          },
        },
        children: [
          {
            type: 'text',
            value: admonition.title,
          },
        ],
      },
      ...admonition.content,
    ],
  }
}

function parseAdmonition(node: MarkdownNode) {
  if (node.type !== 'blockquote' || !node.children || node.children.length === 0) {
    return null
  }

  const [firstChild, ...restChildren] = node.children

  if (firstChild.type !== 'paragraph' || !firstChild.children) {
    return null
  }

  const lines = splitParagraphIntoLines(firstChild.children)
  const marker = serializeNodes(lines[0] ?? []).trim()
  const match = marker.match(ADMONITION_PATTERN)

  if (!match) {
    return null
  }

  const type = match[1].toLowerCase()
  const title = ADMONITION_TITLES[type]

  return {
    type,
    title,
    content: [
      ...createParagraphsFromLines(lines.slice(1)),
      ...restChildren,
    ],
  }
}

function serializeNodes(nodes: MarkdownNode[]): string {
  let result = ''

  for (const node of nodes) {
    if (typeof node.value === 'string') {
      result += node.value
    }

    if (node.children) {
      result += serializeNodes(node.children)
    }
  }

  return result
}

function splitParagraphIntoLines(children: MarkdownNode[]) {
  const lines: MarkdownNode[][] = [[]]

  for (const child of children) {
    if (child.type !== 'text' || typeof child.value !== 'string') {
      lines.at(-1)!.push(child)
      continue
    }

    const parts = child.value.split('\n')

    for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
      const part = parts[partIndex]

      if (part.length > 0) {
        lines.at(-1)!.push({
          ...child,
          value: part,
        })
      }

      if (partIndex < parts.length - 1) {
        lines.push([])
      }
    }
  }

  return lines
}

function createParagraphsFromLines(lines: MarkdownNode[][]) {
  const content = lines
    .map(trimLine)
    .filter((line) => line.length > 0)

  if (content.length === 0) {
    return []
  }

  return [
    {
      type: 'paragraph',
      children: interleaveLineBreaks(content),
    },
  ]
}

function trimLine(line: MarkdownNode[]) {
  const trimmed = line.map((node) => ({ ...node }))

  for (let index = 0; index < trimmed.length; index += 1) {
    const node = trimmed[index]

    if (node.type === 'text' && typeof node.value === 'string') {
      node.value = node.value.replace(/^\s+/, '')

      if (node.value.length === 0) {
        trimmed.splice(index, 1)
        index -= 1
        continue
      }

      break
    }

    break
  }

  for (let index = trimmed.length - 1; index >= 0; index -= 1) {
    const node = trimmed[index]

    if (node.type === 'text' && typeof node.value === 'string') {
      node.value = node.value.replace(/\s+$/, '')

      if (node.value.length === 0) {
        trimmed.splice(index, 1)
        continue
      }

      break
    }

    break
  }

  return trimmed
}

function interleaveLineBreaks(lines: MarkdownNode[][]) {
  const children: MarkdownNode[] = []

  lines.forEach((line, index) => {
    if (index > 0) {
      children.push({
        type: 'text',
        value: '\n',
      })
    }

    children.push(...line)
  })

  return children
}
