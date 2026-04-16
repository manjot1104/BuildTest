'use client'

import { useEffect, useRef, useState } from 'react'
import {
  type CanvasElement,
  type CanvasBackground,
} from '@/components/buildify-studio/types'
import { PreviewCanvas } from '@/components/buildify-studio/preview-modal'
import { Monitor, Tablet, Smartphone, X } from 'lucide-react'

const DEVICES = [
  { id: 'desktop' as const, label: 'Desktop', Icon: Monitor, width: 1440, height: 960 },
  { id: 'tablet' as const, label: 'Tablet', Icon: Tablet, width: 768, height: 1024 },
  { id: 'mobile' as const, label: 'Mobile', Icon: Smartphone, width: 390, height: 844 },
]

export default function TemplatePreviewPage() {
  const [data, setData] = useState<{ elements: CanvasElement[]; background: CanvasBackground; name: string } | null>(null)
  const [deviceIdx, setDeviceIdx] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('template-preview')
      if (raw) setData(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const obs = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setContainerSize({ w: r.width, h: r.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [data])

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', color: '#666', backgroundColor: '#0d0d11' }}>
      Loading preview...
    </div>
  )

  const device = DEVICES[deviceIdx]!
  const zoom = containerSize.w > 0
    ? Math.round(Math.min((containerSize.w - 32) / device.width, (containerSize.h - 32) / device.height, 1) * 100)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d11', fontFamily: 'system-ui' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, height: 48, flexShrink: 0,
        padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: '#141418',
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
        </div>

        {/* Device switcher */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
          {DEVICES.map((d, i) => (
            <button key={d.id} onClick={() => setDeviceIdx(i)} title={`${d.label} (${d.width}×${d.height})`} style={{
              padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer',
              color: deviceIdx === i ? '#fff' : 'rgba(255,255,255,0.35)',
              background: deviceIdx === i ? 'rgba(255,255,255,0.12)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <d.Icon size={14} />
            </button>
          ))}
        </div>

        {/* URL bar */}
        <div style={{
          flex: 1, maxWidth: 480, display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8, padding: '6px 12px',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Preview — {data.name}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Close */}
        <button onClick={() => window.close()} style={{
          padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center',
        }}>
          <X size={18} />
        </button>
      </div>

      {/* Canvas area — exact same as PreviewModal */}
      <div
        ref={contentRef}
        style={{
          flex: 1, display: 'flex', justifyContent: 'center', overflowY: 'auto', overflowX: 'hidden',
          background: '#141416', padding: 24, alignItems: 'flex-start',
        }}
      >
        {containerSize.w > 0 && (
          <PreviewCanvas
            elements={data.elements}
            background={data.background}
            deviceWidth={device.width}
            deviceHeight={device.height}
            containerW={containerSize.w}
            containerH={containerSize.h}
            deviceId={device.id}
          />
        )}
      </div>

      {/* Status bar */}
      <div style={{
        height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)', background: '#141418',
      }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)' }}>
          {device.label} · {device.width}×{device.height} · {zoom > 0 ? `${zoom}% zoom` : '…'}
        </span>
      </div>
    </div>
  )
}
