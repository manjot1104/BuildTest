"use client"

import { useState, useCallback, useRef } from "react"

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`"

export function useTextScramble(originalText: string, duration = 400) {
    const [displayText, setDisplayText] = useState(originalText)
    const frameRef = useRef<number | null>(null)
    const isScrambling = useRef(false)

    const scramble = useCallback(() => {
        if (isScrambling.current) return
        isScrambling.current = true

        const len = originalText.length
        const startTime = performance.now()

        const animate = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Number of characters that have "resolved"
            const resolved = Math.floor(progress * len)

            let result = ""
            for (let i = 0; i < len; i++) {
                if (originalText[i] === " ") {
                    result += " "
                } else if (i < resolved) {
                    result += originalText[i]
                } else {
                    result += CHARS[Math.floor(Math.random() * CHARS.length)]
                }
            }

            setDisplayText(result)

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate)
            } else {
                setDisplayText(originalText)
                isScrambling.current = false
            }
        }

        frameRef.current = requestAnimationFrame(animate)
    }, [originalText, duration])

    const reset = useCallback(() => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current)
        }
        isScrambling.current = false
        setDisplayText(originalText)
    }, [originalText])

    return { displayText, scramble, reset }
}
