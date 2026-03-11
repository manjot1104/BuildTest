'use client'

import { useEffect } from 'react'
import { findSectionHeading, smoothScrollToElement } from '@/lib/navigation-utils'

interface NavbarScrollHandlerProps {
  /** 
   * Optional scope to search for headings (e.g. the scaled canvas in the preview modal).
   * If not provided, it searches the whole document.
   */
  scrollScope?: HTMLElement | null
}

/**
 * A client component that attaches click listeners to navbar links
 * on the published page to enable mapping-based smooth scrolling.
 */
export function NavbarScrollHandler({ scrollScope }: NavbarScrollHandlerProps) {
  useEffect(() => {
    const handleNavClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Look for anchor tags that are inside a nav or have no href/hash href
      const anchor = target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (href && href !== '#' && !href.startsWith('#')) return

      // It's a navbar link or internal link
      const label = anchor.textContent?.trim()
      if (!label) return

      // Search within the specific scope if provided
      const targetHeading = findSectionHeading(label, scrollScope)
      if (targetHeading) {
        e.preventDefault()
        smoothScrollToElement(targetHeading)
      }
    }

    document.addEventListener('click', handleNavClick)
    return () => document.removeEventListener('click', handleNavClick)
  }, [scrollScope])

  return null
}
