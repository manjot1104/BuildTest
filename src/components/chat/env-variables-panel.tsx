'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Plus, Eye, EyeOff, Trash2, KeyRound, ShieldCheck, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEnvVariables } from '@/hooks/use-env-variables'

interface EnvVariablesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EnvVariablesPanel({ open, onOpenChange }: EnvVariablesPanelProps) {
  const { variables, addVariable, removeVariable, updateVariable, clearAll } = useEnvVariables()

  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newValueVisible, setNewValueVisible] = useState(false)
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => nameInputRef.current?.focus(), 50)
  }, [open])

  const handleAdd = () => {
    if (!newName.trim() || !newValue.trim()) return
    addVariable(newName.trim(), newValue.trim())
    setNewName('')
    setNewValue('')
    setNewValueVisible(false)
    nameInputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') onOpenChange(false)
  }

  const toggleVisible = (id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <KeyRound className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Environment Variables</h2>
              <p className="text-[11px] text-muted-foreground">
                {variables.length} variable{variables.length !== 1 ? 's' : ''} set
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Security notice */}
        <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-green-600 dark:text-green-400" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Values are stored <span className="font-medium text-foreground">in memory only</span> and never sent to the server. Only variable names are shared with the AI.
          </p>
        </div>

        {/* Variable list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {variables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-dashed border-border">
                <KeyRound className="size-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No variables yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                Add keys like OPENAI_API_KEY, DATABASE_URL
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {variables.map((variable) => (
                <div
                  key={variable.id}
                  className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <input
                    value={variable.name}
                    onChange={(e) => updateVariable(variable.id, 'name', e.target.value)}
                    className="w-32 shrink-0 truncate bg-transparent font-mono text-[11px] font-medium text-foreground outline-none"
                    spellCheck={false}
                  />
                  <span className="text-muted-foreground/40">=</span>
                  <input
                    value={variable.value}
                    onChange={(e) => updateVariable(variable.id, 'value', e.target.value)}
                    type={visibleIds.has(variable.id) ? 'text' : 'password'}
                    className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-muted-foreground outline-none"
                    spellCheck={false}
                  />
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => toggleVisible(variable.id)}
                      className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    >
                      {visibleIds.has(variable.id) ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                    <button
                      onClick={() => removeVariable(variable.id)}
                      className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new variable */}
        <div className="border-t border-border p-4">
          <p className="mb-2.5 text-[11px] font-medium text-muted-foreground">Add variable</p>
          <div className="flex flex-col gap-2">
            <Input
              ref={nameInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              onKeyDown={handleKeyDown}
              placeholder="VARIABLE_NAME"
              className="h-9 font-mono text-xs"
              spellCheck={false}
            />
            <div className="relative">
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={handleKeyDown}
                type={newValueVisible ? 'text' : 'password'}
                placeholder="value"
                className="h-9 pr-9 font-mono text-xs"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setNewValueVisible((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {newValueVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <Button
              onClick={handleAdd}
              disabled={!newName.trim() || !newValue.trim()}
              size="sm"
              className="w-full gap-1.5"
            >
              <Plus className="size-3.5" />
              Add Variable
            </Button>
          </div>

          <div className="mt-3 flex items-start gap-1.5">
            <Info className="mt-0.5 size-3 shrink-0 text-muted-foreground/50" />
            <p className="text-[10px] leading-relaxed text-muted-foreground/60">
              Variable names are injected into prompts so AI knows which keys are available. Your actual values stay local.
            </p>
          </div>

          {variables.length > 0 && (
            <button
              onClick={clearAll}
              className="mt-3 w-full text-center text-[11px] text-muted-foreground/60 underline-offset-2 hover:text-destructive hover:underline"
            >
              Clear all variables
            </button>
          )}
        </div>
      </div>
    </>
  )
}