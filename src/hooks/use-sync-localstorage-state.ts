'use client'

import { useState, useEffect, useCallback } from 'react'

export function useSyncLocalstorageState<T>(
    key: string,
    initialValue: T,
): [T, (val: T) => void, () => void] {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === 'undefined') return initialValue
        try {
            const stored = localStorage.getItem(key)
            return stored ? (JSON.parse(stored) as T) : initialValue
        } catch {
            return initialValue
        }
    })

    const setStoredValue = useCallback(
        (val: T) => {
            setValue(val)
            try {
                if (val === null || val === undefined) {
                    localStorage.removeItem(key)
                } else {
                    localStorage.setItem(key, JSON.stringify(val))
                }
            } catch {
                // localStorage unavailable
            }
        },
        [key],
    )

    const removeValue = useCallback(() => {
        setValue(initialValue)
        try {
            localStorage.removeItem(key)
        } catch {
            // localStorage unavailable
        }
    }, [key, initialValue])

    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === key) {
                try {
                    setValue(
                        e.newValue ? (JSON.parse(e.newValue) as T) : initialValue,
                    )
                } catch {
                    setValue(initialValue)
                }
            }
        }
        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [key, initialValue])

    return [value, setStoredValue, removeValue]
}
