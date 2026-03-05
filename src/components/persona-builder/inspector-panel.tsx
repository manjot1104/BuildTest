'use client'

import React, { useRef, useState } from 'react'
import { Upload, Plus, Trash2, ExternalLink, ChevronRight } from 'lucide-react'
import { type UseEditorReturn } from './use-editor'
import {
  type CanvasElement,
  type ElementStyles,
  type EnterAnimation,
  type HoverAnimation,
  type SocialLinkItem,
  type SocialPlatform,
  type FormField,
} from './types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

// ─── Tiny helpers ────────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-accent"
      >
        <ChevronRight
          className={`size-3 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
      </button>
      {open && <div className="mt-1 flex flex-col gap-2 pb-1 pl-1">{children}</div>}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <Label className="mb-1 block text-[10px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function NumInput({ value, onChange, min, max, step = 1 }: {
  value: number | undefined
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <Input
      type="number"
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-7 text-xs"
    />
  )
}

function ColorInput({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value ?? '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 cursor-pointer rounded border border-border bg-transparent p-0"
      />
      <Input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 font-mono text-xs"
        placeholder="#000000"
      />
    </div>
  )
}

function Sel({ value, onChange, children }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
    >
      {children}
    </select>
  )
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'layout' | 'style' | 'text' | 'animate' | 'link' | 'content'

const TEXT_TYPES = new Set(['heading', 'paragraph', 'button', 'code-block', 'navbar'])

const ENTER_ANIMATIONS: { value: EnterAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'slideDown', label: 'Slide Down' },
  { value: 'slideLeft', label: 'Slide Left' },
  { value: 'slideRight', label: 'Slide Right' },
  { value: 'zoomIn', label: 'Zoom In' },
  { value: 'bounce', label: 'Bounce' },
]

const HOVER_ANIMATIONS: { value: HoverAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'scale', label: 'Scale Up' },
  { value: 'lift', label: 'Lift Shadow' },
  { value: 'glow', label: 'Glow' },
]

const FONT_WEIGHTS = ['100', '300', '400', '500', '600', '700', '800', '900']
const TEXT_ALIGNS: ElementStyles['textAlign'][] = ['left', 'center', 'right']
const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'github', 'twitter', 'linkedin', 'instagram', 'youtube',
  'tiktok', 'facebook', 'discord', 'website', 'email',
]

// ─── Main component ───────────────────────────────────────────────────────────

interface InspectorPanelProps {
  element: CanvasElement | null
  editor: UseEditorReturn
}

export function InspectorPanel({ element, editor }: InspectorPanelProps) {
  const { updateElement } = editor
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>('layout')

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !element) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      updateElement(element.id, { content: ev.target?.result as string })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (!element) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-xs text-muted-foreground">
          Select an element to edit its properties
        </p>
      </div>
    )
  }

  const upd = (updates: Partial<CanvasElement>) => updateElement(element.id, updates)
  const updStyle = (styles: Partial<ElementStyles>) =>
    upd({ styles: { ...element.styles, ...styles } })

  const hasText = TEXT_TYPES.has(element.type)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'layout', label: 'Layout' },
    { id: 'style', label: 'Style' },
    ...(hasText ? [{ id: 'text' as Tab, label: 'Text' }] : []),
    { id: 'animate', label: 'Anim' },
    { id: 'link', label: 'Link' },
    { id: 'content', label: 'Content' },
  ]

  const activeTab = tabs.find((t) => t.id === tab) ? tab : 'layout'

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="mb-3 flex flex-wrap gap-0.5 rounded-lg bg-muted/50 p-0.5">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all ${
              activeTab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
        {/* ── LAYOUT ── */}
        {activeTab === 'layout' && (
          <Section title="Position & Size">
            <Row>
              <Field label="X"><NumInput value={element.x} onChange={(v) => upd({ x: v })} /></Field>
              <Field label="Y"><NumInput value={element.y} onChange={(v) => upd({ y: v })} /></Field>
            </Row>
            <Row>
              <Field label="W"><NumInput value={element.width} onChange={(v) => upd({ width: Math.max(1, v) })} min={1} /></Field>
              <Field label="H"><NumInput value={element.height} onChange={(v) => upd({ height: Math.max(1, v) })} min={1} /></Field>
            </Row>
            <Field label={`Opacity: ${element.styles.opacity ?? 100}%`} full>
              <Slider
                min={0} max={100} step={1}
                value={[element.styles.opacity ?? 100]}
                onValueChange={([v]) => updStyle({ opacity: v })}
              />
            </Field>
            <Row>
              <Field label="Z-Index">
                <NumInput value={element.zIndex} onChange={(v) => upd({ zIndex: v })} min={0} />
              </Field>
              <Field label="Radius">
                <NumInput value={element.styles.borderRadius} onChange={(v) => updStyle({ borderRadius: v })} min={0} max={999} />
              </Field>
            </Row>
            {element.type === 'heading' && (
              <Field label="Heading Level" full>
                <Sel value={String(element.headingLevel ?? 1)} onChange={(v) => upd({ headingLevel: Number(v) as 1 })}>
                  {[1, 2, 3, 4, 5, 6].map((l) => <option key={l} value={l}>H{l}</option>)}
                </Sel>
              </Field>
            )}
            {(element.type === 'section' || element.type === 'container') && (
              <Field label="Anchor ID" full>
                <input
                  type="text"
                  value={element.anchorId ?? ''}
                  onChange={(e) => upd({ anchorId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') || undefined })}
                  placeholder="e.g. about (links as #about)"
                  className="h-7 w-full rounded border border-input bg-background px-2 text-xs focus:outline-none"
                />
              </Field>
            )}
          </Section>
        )}

        {/* ── STYLE ── */}
        {activeTab === 'style' && (
          <>
            <Section title="Background">
              <Field label="Type" full>
                <Sel value={element.styles.gradientType ?? 'none'} onChange={(v) => updStyle({ gradientType: v as ElementStyles['gradientType'] })}>
                  <option value="none">Solid</option>
                  <option value="linear">Linear Gradient</option>
                  <option value="radial">Radial Gradient</option>
                </Sel>
              </Field>
              {(!element.styles.gradientType || element.styles.gradientType === 'none') ? (
                <Field label="Color" full>
                  <ColorInput value={element.styles.backgroundColor} onChange={(v) => updStyle({ backgroundColor: v })} />
                </Field>
              ) : (
                <>
                  <Row>
                    <Field label="From"><ColorInput value={element.styles.gradientFrom ?? '#667eea'} onChange={(v) => updStyle({ gradientFrom: v })} /></Field>
                    <Field label="To"><ColorInput value={element.styles.gradientTo ?? '#764ba2'} onChange={(v) => updStyle({ gradientTo: v })} /></Field>
                  </Row>
                  {element.styles.gradientType === 'linear' && (
                    <Field label="Angle" full>
                      <NumInput value={element.styles.gradientAngle ?? 135} onChange={(v) => updStyle({ gradientAngle: v })} min={0} max={360} />
                    </Field>
                  )}
                </>
              )}
            </Section>

            <Section title="Border & Shadow">
              <Field label="Border" full>
                <Input
                  value={element.styles.border ?? ''}
                  onChange={(e) => updStyle({ border: e.target.value })}
                  className="h-7 text-xs"
                  placeholder="1px solid #e2e8f0"
                />
              </Field>
              <Field label="Box Shadow" full>
                <Input
                  value={element.styles.boxShadow ?? ''}
                  onChange={(e) => updStyle({ boxShadow: e.target.value })}
                  className="h-7 text-xs"
                  placeholder="0 4px 12px rgba(0,0,0,0.1)"
                />
              </Field>
            </Section>

            <Section title="Spacing">
              <Row>
                <Field label="Padding">
                  <NumInput value={element.styles.padding} onChange={(v) => updStyle({ padding: v })} min={0} />
                </Field>
                <Field label="Gap">
                  <NumInput value={element.styles.gap} onChange={(v) => updStyle({ gap: v })} min={0} />
                </Field>
              </Row>
            </Section>

            {element.type === 'image' && (
              <Section title="Image">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="size-4" /> Upload Image
                </Button>
                {element.content && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={element.content} alt="preview" className="h-20 w-full rounded border border-border object-cover" />
                )}
                <Field label="Or paste URL" full>
                  <Input
                    value={element.content.startsWith('data:') ? '' : element.content}
                    onChange={(e) => upd({ content: e.target.value })}
                    className="h-7 text-xs"
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Object Fit" full>
                  <Sel value={element.styles.objectFit ?? 'cover'} onChange={(v) => updStyle({ objectFit: v as ElementStyles['objectFit'] })}>
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                  </Sel>
                </Field>
              </Section>
            )}
          </>
        )}

        {/* ── TEXT / TYPOGRAPHY ── */}
        {activeTab === 'text' && hasText && (
          <Section title="Typography">
            <Row>
              <Field label="Size">
                <NumInput value={element.styles.fontSize} onChange={(v) => updStyle({ fontSize: v })} min={8} max={300} />
              </Field>
              <Field label="Weight">
                <Sel value={element.styles.fontWeight ?? '400'} onChange={(v) => updStyle({ fontWeight: v })}>
                  {FONT_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                </Sel>
              </Field>
            </Row>
            <Field label="Font Family" full>
              <Input
                value={element.styles.fontFamily ?? ''}
                onChange={(e) => updStyle({ fontFamily: e.target.value })}
                className="h-7 text-xs"
                placeholder="Inter, Georgia, monospace…"
              />
            </Field>
            <Field label="Text Color" full>
              <ColorInput value={element.styles.color} onChange={(v) => updStyle({ color: v })} />
            </Field>
            <Field label="Align" full>
              <div className="flex gap-1">
                {TEXT_ALIGNS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => updStyle({ textAlign: a })}
                    className={`flex-1 rounded border py-1 text-xs capitalize transition-colors ${
                      element.styles.textAlign === a
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Field>
            <Row>
              <Field label="Letter Sp.">
                <NumInput value={element.styles.letterSpacing} onChange={(v) => updStyle({ letterSpacing: v })} min={-10} max={50} step={0.5} />
              </Field>
              <Field label="Line Ht.">
                <NumInput value={element.styles.lineHeight} onChange={(v) => updStyle({ lineHeight: v })} min={0.5} max={5} step={0.1} />
              </Field>
            </Row>
            <Field label="Decoration" full>
              <Sel value={element.styles.textDecoration ?? 'none'} onChange={(v) => updStyle({ textDecoration: v })}>
                <option value="none">None</option>
                <option value="underline">Underline</option>
                <option value="line-through">Strikethrough</option>
                <option value="overline">Overline</option>
              </Sel>
            </Field>
          </Section>
        )}

        {/* ── ANIMATE ── */}
        {activeTab === 'animate' && (
          <>
            <Section title="Enter Animation">
              <div className="flex flex-wrap gap-1">
                {ENTER_ANIMATIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => upd({ enterAnimation: value })}
                    className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                      element.enterAnimation === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Hover Effect">
              <div className="flex flex-wrap gap-1">
                {HOVER_ANIMATIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => upd({ hoverAnimation: value })}
                    className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                      element.hoverAnimation === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ── LINK ── */}
        {activeTab === 'link' && (
          <Section title="Hyperlink">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={element.link.enabled}
                onChange={(e) => upd({ link: { ...element.link, enabled: e.target.checked } })}
                className="rounded"
              />
              <span className="text-xs">Enable link on this element</span>
            </label>
            {element.link.enabled && (
              <>
                <Field label="URL" full>
                  <div className="flex gap-1">
                    <Input
                      value={element.link.href}
                      onChange={(e) => upd({ link: { ...element.link, href: e.target.value } })}
                      className="h-7 flex-1 text-xs"
                      placeholder="https://..."
                    />
                    {element.link.href && (
                      <a href={element.link.href} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="outline" size="sm" className="h-7 px-2">
                          <ExternalLink className="size-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                </Field>
                <Field label="Target" full>
                  <Sel value={element.link.target} onChange={(v) => upd({ link: { ...element.link, target: v as '_blank' | '_self' } })}>
                    <option value="_blank">New tab</option>
                    <option value="_self">Same tab</option>
                  </Sel>
                </Field>
              </>
            )}
          </Section>
        )}

        {/* ── CONTENT ── */}
        {activeTab === 'content' && (
          <ContentTab element={element} upd={upd} />
        )}
      </div>
    </div>
  )
}

// ─── Content tab sub-components ───────────────────────────────────────────────

function ContentTab({ element, upd }: {
  element: CanvasElement
  upd: (updates: Partial<CanvasElement>) => void
}) {
  switch (element.type) {
    case 'heading':
    case 'paragraph':
    case 'button':
      return (
        <div className="flex flex-col gap-2">
          <Label className="text-[10px] text-muted-foreground">Text Content</Label>
          <textarea
            value={element.content}
            onChange={(e) => upd({ content: e.target.value })}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )

    case 'navbar':
      return (
        <div className="flex flex-col gap-2">
          <Label className="text-[10px] text-muted-foreground">Nav Items (pipe-separated)</Label>
          <textarea
            value={element.content}
            onChange={(e) => upd({ content: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-[10px] text-muted-foreground">First item = brand. Example: Brand|Home|About|Contact</p>
        </div>
      )

    case 'code-block':
      return (
        <div className="flex flex-col gap-2">
          <Label className="text-[10px] text-muted-foreground">Code</Label>
          <textarea
            value={element.content}
            onChange={(e) => upd({ content: e.target.value })}
            rows={8}
            spellCheck={false}
            className="w-full rounded-md border border-input bg-[#1e1e2e] px-3 py-2 font-mono text-xs text-[#cdd6f4] focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )

    case 'video-embed':
      return (
        <div className="flex flex-col gap-2">
          <Label className="text-[10px] text-muted-foreground">YouTube URL</Label>
          <Input
            value={element.content}
            onChange={(e) => upd({ content: e.target.value })}
            className="h-7 text-xs"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      )

    case 'icon':
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground">Icon Name</Label>
            <Input
              value={element.content || element.iconName || ''}
              onChange={(e) => upd({ content: e.target.value })}
              className="h-7 text-xs"
              placeholder="star, heart, zap, home…"
            />
            <p className="text-[10px] text-muted-foreground">
              Available: star, heart, zap, check, home, user, mail, phone, globe, camera, code, music, coffee, shield, rocket, smile, diamond, flame, leaf, crown
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground">Icon Size</Label>
            <NumInput value={element.styles.iconSize} onChange={(v) => upd({ styles: { ...element.styles, iconSize: v } })} min={12} max={200} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground">Icon Color</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={element.styles.iconColor ?? '#3b82f6'}
                onChange={(e) => upd({ styles: { ...element.styles, iconColor: e.target.value } })}
                className="size-7 cursor-pointer rounded border border-border"
              />
              <Input
                value={element.styles.iconColor ?? '#3b82f6'}
                onChange={(e) => upd({ styles: { ...element.styles, iconColor: e.target.value } })}
                className="h-7 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )

    case 'social-links':
      return <SocialLinksEditor element={element} upd={upd} />

    case 'form':
      return <FormEditor element={element} upd={upd} />

    default:
      return (
        <p className="text-xs text-muted-foreground">
          No content settings for this element type.
        </p>
      )
  }
}

function SocialLinksEditor({ element, upd }: {
  element: CanvasElement
  upd: (updates: Partial<CanvasElement>) => void
}) {
  const links = element.socialLinks ?? []

  const updateLink = (i: number, patch: Partial<SocialLinkItem>) => {
    upd({ socialLinks: links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) })
  }
  const removeLink = (i: number) => upd({ socialLinks: links.filter((_, idx) => idx !== i) })
  const addLink = () =>
    upd({ socialLinks: [...links, { platform: 'github' as SocialPlatform, url: '' }] })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-muted-foreground">Social Links</Label>
        <Button type="button" variant="outline" size="sm" className="h-6 gap-1 px-2 text-[10px]" onClick={addLink}>
          <Plus className="size-3" /> Add
        </Button>
      </div>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-1">
          <select
            value={link.platform}
            onChange={(e) => updateLink(i, { platform: e.target.value as SocialPlatform })}
            className="h-7 w-24 shrink-0 rounded-md border border-input bg-background px-1 text-xs"
          >
            {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <Input
            value={link.url}
            onChange={(e) => updateLink(i, { url: e.target.value })}
            className="h-7 flex-1 text-xs"
            placeholder="https://..."
          />
          <button type="button" onClick={() => removeLink(i)} className="shrink-0 text-destructive">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <div className="flex flex-col gap-2 border-t border-border pt-2">
        <Label className="text-[10px] text-muted-foreground">Display Settings</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1 block text-[10px] text-muted-foreground">Icon Size</Label>
            <Input
              type="number"
              value={element.styles.iconSize ?? 28}
              onChange={(e) => upd({ styles: { ...element.styles, iconSize: Number(e.target.value) } })}
              className="h-7 text-xs"
              min={12} max={80}
            />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] text-muted-foreground">Spacing</Label>
            <Input
              type="number"
              value={element.styles.gap ?? 16}
              onChange={(e) => upd({ styles: { ...element.styles, gap: Number(e.target.value) } })}
              className="h-7 text-xs"
              min={0} max={80}
            />
          </div>
        </div>
        <div>
          <Label className="mb-1 block text-[10px] text-muted-foreground">Icon Color</Label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={element.styles.iconColor ?? '#374151'}
              onChange={(e) => upd({ styles: { ...element.styles, iconColor: e.target.value } })}
              className="size-7 cursor-pointer rounded border border-border"
            />
            <Input
              value={element.styles.iconColor ?? '#374151'}
              onChange={(e) => upd({ styles: { ...element.styles, iconColor: e.target.value } })}
              className="h-7 font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function FormEditor({ element, upd }: {
  element: CanvasElement
  upd: (updates: Partial<CanvasElement>) => void
}) {
  const fields = element.formFields ?? []

  const updateField = (i: number, patch: Partial<FormField>) => {
    upd({ formFields: fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) })
  }
  const removeField = (i: number) => upd({ formFields: fields.filter((_, idx) => idx !== i) })
  const addField = () =>
    upd({
      formFields: [...fields, {
        id: crypto.randomUUID(),
        type: 'text' as FormField['type'],
        label: 'New Field',
        placeholder: '',
      }],
    })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground">Form Title</Label>
        <Input
          value={element.content}
          onChange={(e) => upd({ content: e.target.value })}
          className="h-7 text-xs"
          placeholder="Contact Us"
        />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Label className="text-[10px] text-muted-foreground">Fields ({fields.length})</Label>
        <Button type="button" variant="outline" size="sm" className="h-6 gap-1 px-2 text-[10px]" onClick={addField}>
          <Plus className="size-3" /> Add
        </Button>
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="flex flex-col gap-1 rounded border border-border p-2">
          <div className="flex items-center gap-1">
            <select
              value={field.type}
              onChange={(e) => updateField(i, { type: e.target.value as FormField['type'] })}
              className="h-6 w-20 rounded border border-input bg-background px-1 text-[10px]"
            >
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="textarea">Textarea</option>
              <option value="select">Select</option>
              <option value="checkbox">Checkbox</option>
            </select>
            <Input
              value={field.label}
              onChange={(e) => updateField(i, { label: e.target.value })}
              className="h-6 flex-1 text-[10px]"
              placeholder="Label"
            />
            <button type="button" onClick={() => removeField(i)} className="shrink-0 text-destructive">
              <Trash2 className="size-3" />
            </button>
          </div>
          <Input
            value={field.placeholder ?? ''}
            onChange={(e) => updateField(i, { placeholder: e.target.value })}
            className="h-6 text-[10px]"
            placeholder="Placeholder…"
          />
        </div>
      ))}
    </div>
  )
}
