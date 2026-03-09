"use client"

import { useTextScramble } from "@/hooks/use-text-scramble"

interface HackerTextProps {
    text: string
    duration?: number
    className?: string
    as?: "span" | "p" | "div"
}

export function HackerText({ text, duration = 300, className, as: Tag = "span" }: HackerTextProps) {
    const { displayText, scramble, reset } = useTextScramble(text, duration)

    return (
        <Tag
            className={className}
            onMouseEnter={scramble}
            onMouseLeave={reset}
        >
            {displayText}
        </Tag>
    )
}
