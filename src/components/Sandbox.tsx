'use client'

import { useState, useMemo } from 'react'
import { FaCode, FaEye, FaImage, FaVideo, FaMusic, FaGlobe, FaDownload, FaExpand, FaLock } from 'react-icons/fa'

interface SandboxProps {
  content: string
  isFree: boolean // agent is free = can download without paying
  hasPaid?: boolean // user has already paid for this response
  onRequestDownload?: () => void // callback when user wants to download (trigger payment)
}

type ContentType = 'html' | 'image' | 'video' | 'audio' | 'code' | 'text'

function detectContentType(content: string): ContentType {
  const trimmed = content.trim()

  if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg|bmp)(\?.*)?$/i.test(trimmed)) return 'image'
  if (trimmed.startsWith('data:image/')) return 'image'
  if (/^https?:\/\/.+\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)) return 'video'
  if (/^https?:\/\/.+\.(mp3|wav|ogg|flac|aac)(\?.*)?$/i.test(trimmed)) return 'audio'

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') ||
      (trimmed.includes('<div') && trimmed.includes('</div>')) ||
      (trimmed.includes('<body') && trimmed.includes('</body>')) ||
      (trimmed.startsWith('<') && trimmed.endsWith('>') && trimmed.length > 50)) {
    return 'html'
  }

  if (trimmed.startsWith('```')) return 'code'

  return 'text'
}

function extractCodeContent(content: string): { code: string; language: string } {
  const match = content.match(/```(\w*)\n?([\s\S]*?)```/)
  if (match) {
    return { language: match[1] || 'text', code: match[2].trim() }
  }
  return { language: 'text', code: content }
}

export default function Sandbox({ content, isFree, hasPaid, onRequestDownload }: SandboxProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview')
  const [fullscreen, setFullscreen] = useState(false)

  const contentType = useMemo(() => detectContentType(content), [content])
  const canDownload = isFree || hasPaid

  const handleDownload = () => {
    if (!canDownload) {
      onRequestDownload?.()
      return
    }

    // Perform actual download
    let filename = 'download'
    let blob: Blob

    if (contentType === 'html' || contentType === 'code') {
      const { code } = extractCodeContent(content)
      const downloadContent = contentType === 'html' ? content : code
      blob = new Blob([downloadContent], { type: 'text/html' })
      filename = contentType === 'html' ? 'page.html' : `code.${extractCodeContent(content).language || 'txt'}`
    } else if (contentType === 'image') {
      // For URL-based images, open in new tab
      window.open(content.trim(), '_blank')
      return
    } else if (contentType === 'video') {
      window.open(content.trim(), '_blank')
      return
    } else if (contentType === 'audio') {
      window.open(content.trim(), '_blank')
      return
    } else {
      blob = new Blob([content], { type: 'text/plain' })
      filename = 'output.txt'
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // No sandbox for plain text
  if (contentType === 'text') return null

  return (
    <div className={`rounded-xl border border-white/10 overflow-hidden mt-4 ${fullscreen ? 'fixed inset-4 z-50 bg-dark-950' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          {contentType === 'html' && <FaGlobe className="text-blue-400 text-xs" />}
          {contentType === 'image' && <FaImage className="text-green-400 text-xs" />}
          {contentType === 'video' && <FaVideo className="text-purple-400 text-xs" />}
          {contentType === 'audio' && <FaMusic className="text-pink-400 text-xs" />}
          {contentType === 'code' && <FaCode className="text-yellow-400 text-xs" />}
          <span className="text-xs text-gray-400 capitalize">{contentType} Preview</span>
        </div>
        <div className="flex items-center gap-1">
          {(contentType === 'html' || contentType === 'code') && (
            <>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-2 py-1 rounded text-xs ${viewMode === 'preview' ? 'bg-primary-500/20 text-primary-300' : 'text-gray-500 hover:text-white'}`}
              >
                <FaEye className="inline mr-1" />Preview
              </button>
              <button
                onClick={() => setViewMode('source')}
                className={`px-2 py-1 rounded text-xs ${viewMode === 'source' ? 'bg-primary-500/20 text-primary-300' : 'text-gray-500 hover:text-white'}`}
              >
                <FaCode className="inline mr-1" />Source
              </button>
            </>
          )}
          {/* Download button */}
          <button
            onClick={handleDownload}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
              canDownload
                ? 'text-green-400 hover:bg-green-500/10'
                : 'text-yellow-400 hover:bg-yellow-500/10'
            }`}
            title={canDownload ? 'Download' : 'Pay to download'}
          >
            {canDownload ? <FaDownload /> : <FaLock />}
            <span>{canDownload ? 'Download' : 'Pay to Download'}</span>
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white">
            <FaExpand />
          </button>
        </div>
      </div>

      {/* Content Area — preview only, no right-click save */}
      <div
        className={`bg-dark-950 ${fullscreen ? 'h-[calc(100%-40px)]' : 'min-h-[200px] max-h-[500px]'} overflow-auto select-none`}
        onContextMenu={(e) => { if (!canDownload) e.preventDefault() }}
      >
        {/* HTML Preview */}
        {contentType === 'html' && viewMode === 'preview' && (
          <iframe
            srcDoc={content}
            className="w-full h-full min-h-[300px] bg-white pointer-events-auto"
            sandbox="allow-scripts"
            style={{ minHeight: fullscreen ? '100%' : '400px' }}
          />
        )}
        {contentType === 'html' && viewMode === 'source' && (
          <div className="relative">
            {!canDownload && (
              <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center">
                  <FaLock className="text-yellow-400 text-2xl mx-auto mb-2" />
                  <p className="text-sm text-yellow-300">Pay to view source code</p>
                  <button onClick={onRequestDownload} className="mt-2 px-4 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-xs text-yellow-300 hover:bg-yellow-500/30">
                    Unlock
                  </button>
                </div>
              </div>
            )}
            <pre className={`p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap ${!canDownload ? 'blur-sm' : ''}`}>{content}</pre>
          </div>
        )}

        {/* Image */}
        {contentType === 'image' && (
          <div className="flex items-center justify-center p-4">
            <img
              src={content.trim()}
              alt="Generated"
              className="max-w-full max-h-[400px] rounded-lg"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
            {!canDownload && (
              <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
            )}
          </div>
        )}

        {/* Video */}
        {contentType === 'video' && (
          <div className="flex items-center justify-center p-4">
            <video
              controls
              controlsList={canDownload ? '' : 'nodownload'}
              className="max-w-full max-h-[400px] rounded-lg"
              onContextMenu={(e) => { if (!canDownload) e.preventDefault() }}
            >
              <source src={content.trim()} />
            </video>
          </div>
        )}

        {/* Audio */}
        {contentType === 'audio' && (
          <div className="flex items-center justify-center p-6">
            <audio
              controls
              controlsList={canDownload ? '' : 'nodownload'}
              className="w-full max-w-md"
              onContextMenu={(e) => { if (!canDownload) e.preventDefault() }}
            >
              <source src={content.trim()} />
            </audio>
          </div>
        )}

        {/* Code */}
        {contentType === 'code' && viewMode === 'preview' && (() => {
          const { code, language } = extractCodeContent(content)
          if (language === 'html' || code.includes('<html') || code.includes('<div')) {
            return (
              <iframe
                srcDoc={code}
                className="w-full h-full min-h-[300px] bg-white"
                sandbox="allow-scripts"
                style={{ minHeight: fullscreen ? '100%' : '400px' }}
              />
            )
          }
          return <pre className="p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap">{code}</pre>
        })()}
        {contentType === 'code' && viewMode === 'source' && (
          <div className="relative">
            {!canDownload && (
              <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center">
                  <FaLock className="text-yellow-400 text-2xl mx-auto mb-2" />
                  <p className="text-sm text-yellow-300">Pay to view & download code</p>
                  <button onClick={onRequestDownload} className="mt-2 px-4 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-xs text-yellow-300 hover:bg-yellow-500/30">
                    Unlock
                  </button>
                </div>
              </div>
            )}
            <pre className={`p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap ${!canDownload ? 'blur-sm' : ''}`}>
              {extractCodeContent(content).code}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
