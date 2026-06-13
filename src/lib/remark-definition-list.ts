type MarkdownNode = {
  children?: MarkdownNode[]
  data?: {
    hName?: string
  }
  ordered?: boolean
  spread?: boolean
  start?: number
  type: string
  value?: string
}

type DefinitionPair = {
  children: MarkdownNode[]
  consumed: number
}

export default function remarkDefinitionList() {
  return (tree: MarkdownNode) => {
    transformNode(tree)
  }
}

function transformNode(node: MarkdownNode) {
  if (!node.children) {
    return
  }

  node.children = transformChildren(node.children)

  for (const child of node.children) {
    transformNode(child)
  }
}

function transformChildren(children: MarkdownNode[]) {
  const nextChildren: MarkdownNode[] = []

  for (let index = 0; index < children.length; ) {
    const definitionListChildren: MarkdownNode[] = []
    let consumed = 0

    for (;;) {
      const pair = parseDefinitionPair(children, index + consumed)

      if (!pair) {
        break
      }

      definitionListChildren.push(...pair.children)
      consumed += pair.consumed
    }

    if (definitionListChildren.length > 0) {
      nextChildren.push({
        type: 'definitionList',
        data: {
          hName: 'dl',
        },
        children: definitionListChildren,
      })
      index += consumed
      continue
    }

    nextChildren.push(children[index])
    index += 1
  }

  return nextChildren
}

function parseDefinitionPair(
  children: MarkdownNode[],
  index: number,
): DefinitionPair | null {
  const node = children.at(index)

  if (!node || node.type !== 'paragraph' || !node.children) {
    return null
  }

  const lines = splitParagraphIntoLines(node.children)

  if (isSingleParagraphDefinitionList(lines)) {
    const [termLine, ...definitionOnlyLines] = lines

    return {
      children: createDefinitionPair(
        trimLine(termLine),
        definitionOnlyLines.map((line) => stripLinePrefix(trimLine(line))),
      ),
      consumed: 1,
    }
  }

  if (startsWithDefinitionMarker(lines[0])) {
    return null
  }

  const definitionLines: MarkdownNode[][] = []
  let consumed = 1

  for (let cursor = index + 1; cursor < children.length; cursor += 1) {
    const sibling = children.at(cursor)

    if (!sibling || sibling.type !== 'paragraph' || !sibling.children) {
      break
    }

    const siblingLines = splitParagraphIntoLines(sibling.children)

    if (!siblingLines.every(startsWithDefinitionMarker)) {
      break
    }

    definitionLines.push(
      ...siblingLines.map((line) => stripLinePrefix(trimLine(line))),
    )
    consumed += 1
  }

  if (definitionLines.length === 0) {
    return null
  }

  return {
    children: createDefinitionPair(trimLine(node.children), definitionLines),
    consumed,
  }
}

function createDefinitionPair(
  termChildren: MarkdownNode[],
  definitionLines: MarkdownNode[][],
) {
  return [
    {
      type: 'definitionTerm',
      data: {
        hName: 'dt',
      },
      children: pruneEmptyTextNodes(termChildren),
    },
    {
      type: 'definitionDescription',
      data: {
        hName: 'dd',
      },
      children: createDefinitionBlocks(definitionLines),
    },
  ]
}

function createDefinitionBlocks(definitionLines: MarkdownNode[][]) {
  const blocks: MarkdownNode[] = []

  for (let index = 0; index < definitionLines.length; ) {
    const line = definitionLines[index]
    const orderedItem = stripListMarker(line, /^(\d+)\.\s+/)

    if (orderedItem) {
      const items: MarkdownNode[] = [
        createListItemNode(pruneEmptyTextNodes(orderedItem.children)),
      ]
      const start = orderedItem.start

      index += 1

      while (index < definitionLines.length) {
        const nextOrderedItem = stripListMarker(
          definitionLines[index],
          /^(\d+)\.\s+/,
        )

        if (!nextOrderedItem) {
          break
        }

        items.push(createListItemNode(pruneEmptyTextNodes(nextOrderedItem.children)))
        index += 1
      }

      blocks.push({
        type: 'list',
        ordered: true,
        start,
        spread: false,
        children: items,
      })
      continue
    }

    const unorderedItem = stripListMarker(line, /^[-*+]\s+/)

    if (unorderedItem) {
      const items: MarkdownNode[] = [
        createListItemNode(pruneEmptyTextNodes(unorderedItem.children)),
      ]

      index += 1

      while (index < definitionLines.length) {
        const nextUnorderedItem = stripListMarker(
          definitionLines[index],
          /^[-*+]\s+/,
        )

        if (!nextUnorderedItem) {
          break
        }

        items.push(createListItemNode(pruneEmptyTextNodes(nextUnorderedItem.children)))
        index += 1
      }

      blocks.push({
        type: 'list',
        ordered: false,
        spread: false,
        children: items,
      })
      continue
    }

    blocks.push({
      type: 'paragraph',
      children: pruneEmptyTextNodes(line),
    })
    index += 1
  }

  return blocks
}

function createListItemNode(children: MarkdownNode[]) {
  return {
    type: 'listItem',
    spread: false,
    children: [
      {
        type: 'paragraph',
        children,
      },
    ],
  }
}

function isSingleParagraphDefinitionList(lines: MarkdownNode[][]) {
  return (
    lines.length >= 2 &&
    !startsWithDefinitionMarker(lines[0]) &&
    lines.slice(1).every(startsWithDefinitionMarker)
  )
}

function startsWithDefinitionMarker(line: MarkdownNode[]) {
  return serializeNodes(line).startsWith(':')
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

function stripLinePrefix(line: MarkdownNode[]) {
  return replaceLeadingText(line, /^:\s*/, '')
}

function stripListMarker(line: MarkdownNode[], pattern: RegExp) {
  const source = serializeNodes(line)
  const match = source.match(pattern)

  if (!match) {
    return null
  }

  return {
    start: match[1] ? Number(match[1]) : undefined,
    children: replaceLeadingText(line, pattern, ''),
  }
}

function replaceLeadingText(
  line: MarkdownNode[],
  pattern: RegExp,
  replacement: string,
) {
  const nextLine = line.map((node) => ({ ...node }))
  const firstTextNode = nextLine.find(
    (node) => node.type === 'text' && typeof node.value === 'string',
  )

  if (firstTextNode && firstTextNode.value) {
    firstTextNode.value = firstTextNode.value.replace(pattern, replacement)
  }

  return nextLine
}

function pruneEmptyTextNodes(line: MarkdownNode[]) {
  return line.filter((node) => node.type !== 'text' || node.value !== '')
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
