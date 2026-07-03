'use client'

import { useState, useMemo } from 'react'
import { FaCode, FaEye, FaImage, FaVideo, FaMusic, FaGlobe, FaDownload, FaExpand, FaCompress, FaLock } from 'react-icons/fa'

interface SandboxProps {
  content: string
  isFree: boolean
  hasPaid?: boolean
  hideSource?: boolean
  onRequestDownload?: () => void
}

type ContentType = 'html' | 'multifile' | 'image' | 'video' | 'audio' | 'code' | 'text'

interface ParsedFile {
  name: string
  content: string
  language: string
}

// Parse multi-file response: detects ```filename or **filename:** patterns
function parseFiles(content: string): ParsedFile[] {
  const files: ParsedFile[] = []

  // Pattern 1: ```language:filename or ```filename
  const codeBlockRegex = /```(\w+)?(?::?([\w\-\.\/]+))?\n([\s\S]*?)```/g
  // Pattern 2: **filename:** followed by ```
  const namedBlockRegex = /\*\*([^\*]+\.\w+)\*\*[:\s]*\n```(\w*)\n([\s\S]*?)```/g

  let match

  // Try named blocks first (more specific)
  while ((match = namedBlockRegex.exec(content)) !== null) {
    files.push({ name: match[1].trim(), language: match[2] || 'text', content: match[3].trim() })
  }

  // If no named blocks found, try code blocks with filenames
  if (files.length === 0) {
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const lang = match[1] || 'text'
      const filename = match[2] || `file.${lang === 'html' ? 'html' : lang === 'css' ? 'css' : lang === 'javascript' || lang === 'js' ? 'js' : lang === 'typescript' || lang === 'ts' ? 'ts' : lang === 'python' || lang === 'py' ? 'py' : 'txt'}`
      files.push({ name: filename, language: lang, content: match[3].trim() })
    }
  }

  return files
}

// Combine HTML + CSS + JS files into a single renderable HTML
function combineForPreview(files: ParsedFile[]): string {
  const htmlFile = files.find(f => f.name.endsWith('.html') || f.language === 'html')
  const cssFiles = files.filter(f => f.name.endsWith('.css') || f.language === 'css')
  const jsFiles = files.filter(f => f.name.endsWith('.js') || f.language === 'javascript' || f.language === 'js')

  if (!htmlFile) {
    // No HTML file, try to construct one
    const css = cssFiles.map(f => f.content).join('\n')
    const js = jsFiles.map(f => f.content).join('\n')
    if (css || js) {
      return `<!DOCTYPE html><html><head><style>${css}</style></head><body><script>${js}</script></body></html>`
    }
    return ''
  }

  let html = htmlFile.content

  // Inject CSS into <head>
  if (cssFiles.length > 0) {
    const allCss = cssFiles.map(f => f.content).join('\n')
    if (html.includes('</head>')) {
      html = html.replace('</head>', `<style>${allCss}</style></head>`)
    } else if (html.includes('<body')) {
      html = html.replace('<body', `<head><style>${allCss}</style></head><body`)
    } else {
      html = `<style>${allCss}</style>\n${html}`
    }
  }

  // Inject JS before </body>
  if (jsFiles.length > 0) {
    const allJs = jsFiles.map(f => f.content).join('\n')
    if (html.includes('</body>')) {
      html = html.replace('</body>', `<script>${allJs}</script></body>`)
    } else {
      html = `${html}\n<script>${allJs}</script>`
    }
  }

  // Remove external link/script references that won't work in sandbox
  html = html.replace(/<link[^>]+href=["'][^"']+\.css["'][^>]*>/gi, '')
  html = html.replace(/<script[^>]+src=["'][^"']+\.js["'][^>]*><\/script>/gi, '')

  return html
}

function detectContentType(content: string): ContentType {
  const trimmed = content.trim()

  if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg|bmp)(\?.*)?$/i.test(trimmed)) return 'image'
  if (trimmed.startsWith('data:image/')) return 'image'
  if (/^https?:\/\/.+\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)) return 'video'
  if (/^https?:\/\/.+\.(mp3|wav|ogg|flac|aac)(\?.*)?$/i.test(trimmed)) return 'audio'

  // Check for multi-file response
  const files = parseFiles(content)
  if (files.length >= 2) return 'multifile'

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') ||
      (trimmed.includes('<div') && trimmed.includes('</div>')) ||
      (trimmed.includes('<body') && trimmed.includes('</body>'))) {
    return 'html'
  }

  if (trimmed.startsWith('```')) return 'code'

  return 'text'
}

function extractSingleCode(content: string): string {
  const match = content.match(/```\w*\n?([\s\S]*?)```/)
  return match ? match[1].trim() : content
}

export default function Sandbox({ content, isFree, hasPaid, hideSource, onRequestDownload }: SandboxProps) {
  const [fullscreen, setFullscreen] = useState(false)

  const contentType = useMemo(() => detectContentType(content), [content])
  const parsedFiles = useMemo(() => parseFiles(content), [content])
  const previewHtml = useMemo(() => {
    if (contentType === 'multifile') return combineForPreview(parsedFiles)
    if (contentType === 'html') return content
    if (contentType === 'code') {
      const code = extractSingleCode(content)
      if (code.includes('<div') || code.includes('<html')) return code
    }
    return ''
  }, [content, contentType, parsedFiles])

  // Inject <base target="_self"> to keep all links inside the iframe
  const safePreviewHtml = useMemo(() => {
    if (!previewHtml) return ''
    // Add base tag to prevent links from navigating the parent page
    if (previewHtml.includes('<head>')) {
      return previewHtml.replace('<head>', '<head><base target="_self">')
    } else if (previewHtml.includes('<html>')) {
      return previewHtml.replace('<html>', '<html><head><base target="_self"></head>')
    }
    return `<head><base target="_self"></head>${previewHtml}`
  }, [previewHtml])

  const canDownload = isFree || hasPaid

  const handleDownload = async () => {
    if (!canDownload) {
      onRequestDownload?.()
      return
    }

    if (contentType === 'multifile' && parsedFiles.length > 0) {
      // Zip download for multi-file
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      parsedFiles.forEach(f => zip.file(f.name, f.content))
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'project.zip'
      a.click()
      URL.revokeObjectURL(url)
    } else if (contentType === 'html' || contentType === 'code') {
      const blob = new Blob([previewHtml || content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'index.html'
      a.click()
      URL.revokeObjectURL(url)
    } else if (contentType === 'image' || contentType === 'video' || contentType === 'audio') {
      window.open(content.trim(), '_blank')
    }
  }

  if (contentType === 'text') return null

  return (
    <div className={`rounded-xl border border-white/10 overflow-hidden ${fullscreen ? 'fixed inset-0 z-[9999] bg-dark-950 rounded-none' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          {(contentType === 'html' || contentType === 'multifile') && <FaGlobe className="text-blue-400 text-xs" />}
          {contentType === 'image' && <FaImage className="text-green-400 text-xs" />}
          {contentType === 'video' && <FaVideo className="text-purple-400 text-xs" />}
          {contentType === 'audio' && <FaMusic className="text-pink-400 text-xs" />}
          {contentType === 'code' && <FaCode className="text-yellow-400 text-xs" />}
          <span className="text-xs text-gray-400">
            {contentType === 'multifile' ? `Preview (${parsedFiles.length} files)` : `${contentType} Preview`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Download */}
          <button
            onClick={handleDownload}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${canDownload ? 'text-green-400 hover:bg-green-500/10' : 'text-yellow-400 hover:bg-yellow-500/10'}`}
          >
            {canDownload ? <FaDownload /> : <FaLock />}
            <span>{canDownload ? (contentType === 'multifile' ? 'Download ZIP' : 'Download') : 'Pay to Download'}</span>
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white">
            {fullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={`bg-dark-950 ${fullscreen ? 'h-[calc(100%-40px)]' : 'min-h-[250px] max-h-[600px]'} overflow-auto select-none`}
        onContextMenu={(e) => { if (!canDownload) e.preventDefault() }}
      >
        {/* HTML / Multi-file preview */}
        {(contentType === 'html' || contentType === 'multifile' || contentType === 'code') && safePreviewHtml && (
          <iframe
            srcDoc={safePreviewHtml}
            className="w-full h-full bg-white"
            sandbox="allow-scripts"
            style={{ minHeight: fullscreen ? '100%' : '500px' }}
          />
        )}

        {/* Image */}
        {contentType === 'image' && (
          <div className="flex items-center justify-center p-4 relative">
            <img src={content.trim()} alt="Generated" className="max-w-full max-h-[400px] rounded-lg" draggable={false} />
          </div>
        )}

        {/* Video */}
        {contentType === 'video' && (
          <div className="flex items-center justify-center p-4">
            <video controls controlsList={canDownload ? '' : 'nodownload'} className="max-w-full max-h-[400px] rounded-lg" onContextMenu={(e) => { if (!canDownload) e.preventDefault() }}>
              <source src={content.trim()} />
            </video>
          </div>
        )}

        {/* Audio */}
        {contentType === 'audio' && (
          <div className="flex items-center justify-center p-6">
            <audio controls controlsList={canDownload ? '' : 'nodownload'} className="w-full max-w-md" onContextMenu={(e) => { if (!canDownload) e.preventDefault() }}>
              <source src={content.trim()} />
            </audio>
          </div>
        )}
      </div>

      {/* File list for multi-file */}
      {contentType === 'multifile' && parsedFiles.length > 0 && (
        <div className="px-4 py-2 bg-white/[0.03] border-t border-white/10 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Files:</span>
          {parsedFiles.map((f, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
              {f.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
