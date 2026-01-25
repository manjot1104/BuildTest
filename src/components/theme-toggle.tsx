"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "./ui/button"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    function handleToggle() {
        if (theme === "light") {
            setTheme("dark")
        } else if (theme === "dark") {
            setTheme("light")
        } else {
            setTheme("light")
        }
    }

    let icon, label
    if (theme === "dark") {
        icon = <Moon className="mr-2 h-4 w-4" />
        label = "Dark"
    } else if (theme === "light") {
        icon = <Sun className="mr-2 h-4 w-4" />
        label = "Light"
    } else {
        icon = (
            <span className="mr-2 flex items-center">
                <Sun className="h-4 w-4" />
                <Moon className="ml-[-0.4rem] h-3 w-3 opacity-70" />
            </span>
        )
        label = "System"
    }

    return (
        <Button
            type="button"
            tabIndex={0}
            onClick={handleToggle}
            aria-label="Toggle theme"
            variant="ghost"
            className="w-full"
        >
            {icon}
            <span className="flex-1 text-left">{label} theme</span>
        </Button>
    )
}
