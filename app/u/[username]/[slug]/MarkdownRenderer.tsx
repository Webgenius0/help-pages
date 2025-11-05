'use client'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderContent = () => {
    const lines = content.split('\n')
    const elements: React.JSX.Element[] = []
    let inCodeBlock = false
    let codeLines: string[] = []
    let codeLanguage = ''
    let listItems: string[] = []
    let listType: 'ul' | 'ol' | null = null

    const flushList = () => {
      if (listItems.length > 0) {
        const ListTag = listType === 'ol' ? 'ol' : 'ul'
        elements.push(
          <ListTag key={`list-${elements.length}`} className="my-4 ml-6 list-disc">
            {listItems.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ListTag>
        )
        listItems = []
        listType = null
      }
    }

    lines.forEach((line, idx) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          flushList()
          inCodeBlock = true
          codeLanguage = line.slice(3).trim()
          codeLines = []
        } else {
          elements.push(
            <pre key={`code-${idx}`} className="bg-surface-200 rounded-lg p-4 overflow-x-auto my-4">
              <code className="text-sm font-mono">{codeLines.join('\n')}</code>
            </pre>
          )
          inCodeBlock = false
          codeLines = []
          codeLanguage = ''
        }
        return
      }

      if (inCodeBlock) {
        codeLines.push(line)
        return
      }

      // Headings with anchor IDs
      if (line.startsWith('### ')) {
        flushList()
        const text = line.slice(4)
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        elements.push(
          <h3 key={idx} id={id} className="text-lg font-semibold mt-8 mb-3 scroll-mt-24 text-foreground/90 pl-3 border-l-2 border-primary/30">
            {text}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        flushList()
        const text = line.slice(3)
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        elements.push(
          <h2 key={idx} id={id} className="text-2xl font-bold mt-10 mb-4 scroll-mt-24">
            {text}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        flushList()
        const text = line.slice(2)
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        elements.push(
          <h1 key={idx} id={id} className="text-3xl font-bold mt-12 mb-6 scroll-mt-24">
            {text}
          </h1>
        )
      } 
      // Lists
      else if (line.match(/^[-*]\s+/)) {
        if (listType !== 'ul') {
          flushList()
          listType = 'ul'
        }
        listItems.push(line.slice(2))
      } else if (line.match(/^\d+\.\s+/)) {
        if (listType !== 'ol') {
          flushList()
          listType = 'ol'
        }
        listItems.push(line.replace(/^\d+\.\s+/, ''))
      }
      // Blockquote
      else if (line.startsWith('> ')) {
        flushList()
        elements.push(
          <blockquote key={idx} className="border-l-4 border-brand pl-4 my-4 italic text-foreground-light">
            {formatInline(line.slice(2))}
          </blockquote>
        )
      }
      // Horizontal rule
      else if (line.match(/^---+$/)) {
        flushList()
        elements.push(<hr key={idx} className="my-8 border-default" />)
      }
      // Paragraph
      else if (line.trim()) {
        flushList()
        elements.push(
          <p key={idx} className="my-4" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        )
      }
      // Empty line
      else {
        flushList()
      }
    })

    flushList() // Flush any remaining list

    return elements
  }

  return <div className="markdown-content">{renderContent()}</div>
}

// Format inline markdown (bold, italic, code, links)
function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-surface-200 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-brand hover:underline">$1</a>')
}



