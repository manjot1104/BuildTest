'use client'

import { useState, useCallback, useEffect } from 'react'

export interface EnvVariable {
  id: string
  name: string
  value: string
}

// Module-level in-memory store — never sent to server
const envStore = new Map<string, EnvVariable>()
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

function getAll(): EnvVariable[] {
  return Array.from(envStore.values())
}

export function useEnvVariables() {
  const [variables, setVariables] = useState<EnvVariable[]>(getAll)

  useEffect(() => {
    const sync = () => setVariables(getAll())
    listeners.add(sync)
    return () => { listeners.delete(sync) }
  }, [])

  const addVariable = useCallback((name: string, value: string) => {
    const trimmedName = name.trim().toUpperCase().replace(/\s+/g, '_')
    if (!trimmedName) return
    const existing = Array.from(envStore.values()).find((v) => v.name === trimmedName)
    if (existing) {
      envStore.set(existing.id, { ...existing, value })
    } else {
      const id = crypto.randomUUID()
      envStore.set(id, { id, name: trimmedName, value })
    }
    setVariables(getAll())
    notify()
  }, [])

  const removeVariable = useCallback((id: string) => {
    envStore.delete(id)
    setVariables(getAll())
    notify()
  }, [])

  const updateVariable = useCallback((id: string, field: 'name' | 'value', newValue: string) => {
    const existing = envStore.get(id)
    if (!existing) return
    envStore.set(id, {
      ...existing,
      [field]: field === 'name'
        ? newValue.trim().toUpperCase().replace(/\s+/g, '_')
        : newValue,
    })
    setVariables(getAll())
    notify()
  }, [])

  const clearAll = useCallback(() => {
    envStore.clear()
    setVariables([])
    notify()
  }, [])

  const getVariableNames = useCallback((): string[] => {
    return getAll().map((v) => v.name).filter(Boolean)
  }, [])

  return { variables, addVariable, removeVariable, updateVariable, clearAll, getVariableNames }
}