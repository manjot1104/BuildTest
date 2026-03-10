/**
 * Mapping of navbar labels to possible section heading keywords.
 * This allows "Projects" in a navbar to match a "Featured Work" heading.
 */
export const SECTION_MAP: Record<string, string[]> = {
  about: ['about', 'about me', 'who i am', 'about us', 'biography', 'bio', 'who we are', 'elena vasquez', 'sarah chen', 'profile'],
  work: ['work', 'projects', 'featured projects', 'selected work', 'my work', 'recent work', 'case studies', 'selected projects'],
  portfolio: ['view portfolio', 'portfolio', 'my portfolio', 'showcase', 'featured photo', 'gallery', 'selected photos'],
  series: ['series', 'series 01', 'series 02', 'collection', 'collections', 'selected series'],
  skills: ['skills', 'tech stack', 'technologies', 'expertise', 'what i do', 'capabilities', 'my stack', 'tools'],
  services: ['services', 'what we offer', 'what i offer', 'our services', 'my services', ],
  contact: ['contact', 'get in touch', 'reach out', 'say hello', 'email', 'contact me', 'contact us', 'hire me', 'available for work'],
  blog: ['blog', 'articles', 'writing', 'posts', 'journal', 'news'],
  home: ['home', 'hero', 'top', 'welcome', 'introduction'],
  testimonials: ['testimonials', 'reviews', 'what people say', 'happy clients', 'feedback', 'clients'],
  pricing: ['pricing', 'plans', 'rates', 'investment', 'packages'],
  faq: ['faq', 'frequently asked questions', 'questions', 'common questions'],
}

/**
 * Finds a matching heading or section on the page based on the navbar label and the SECTION_MAP.
 * @param label The text of the navbar link
 * @param container Optional container to search within (useful for Preview Modals)
 */
export function findSectionHeading(label: string, container?: HTMLElement | null): HTMLElement | null {
  const normalizedLabel = label.trim().toLowerCase()
  if (!normalizedLabel) return null

  const scope = container || document

  // 1. Get all headings within the search scope
  const headings = Array.from(scope.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[]

  // Priority 1: Exact text match in headings
  for (const h of headings) {
    if (h.textContent?.trim().toLowerCase() === normalizedLabel) return h
  }

  // 2. Priority 2: Mapping match in headings
  let targetKeywords: string[] = [normalizedLabel]
  for (const [key, values] of Object.entries(SECTION_MAP)) {
    if (key === normalizedLabel || values.includes(normalizedLabel)) {
      targetKeywords = Array.from(new Set([...targetKeywords, ...values]))
      break
    }
  }

  if (targetKeywords.length > 0) {
    for (const h of headings) {
      const text = h.textContent?.trim().toLowerCase() || ''
      if (targetKeywords.includes(text)) return h
    }
  }

  // 3. Priority 3: Partial match in headings
  for (const h of headings) {
    const text = h.textContent?.trim().toLowerCase() || ''
    if (text.length > 3 && normalizedLabel.length > 3) {
      if (text.includes(normalizedLabel) || normalizedLabel.includes(text)) return h
    }
  }

  // 4. Priority 4: Search ALL elements (for templates without proper headings)
  // We search for elements that contain the target text and are not too large
  // but also are likely to be "section labels"
  const allElements = Array.from(scope.querySelectorAll('div, p, span, h1, h2, h3, h4, h5, h6')) as HTMLElement[]
  
  // Exact match in any element
  for (const el of allElements) {
    const text = el.textContent?.trim().toLowerCase() || ''
    if (targetKeywords.includes(text)) {
      // Avoid returning very large elements that might just happen to have this text
      if (text.length > 0 && text.length < 50) return el
    }
  }

  // Partial match in any element
  for (const el of allElements) {
    const text = el.textContent?.trim().toLowerCase() || ''
    if (text.length > 3 && text.length < 100) {
      if (targetKeywords.some(k => text.includes(k) && k.length > 3)) return el
    }
  }
  
  return null
}

/**
 * Robust scroll function that works in builder, preview modal, and published page.
 */
export function smoothScrollToElement(element: HTMLElement) {
  // 1. Check for a scrollable parent (excluding body)
  let parent = element.parentElement
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent)
    const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight
    
    if (isScrollable) {
      const parentRect = parent.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const offsetTop = (elementRect.top - parentRect.top) + parent.scrollTop
      
      parent.scrollTo({
        top: offsetTop - 80,
        behavior: 'smooth'
      })
      return
    }
    parent = parent.parentElement
  }

  // 2. Fallback to window scroll
  const rect = element.getBoundingClientRect()
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  window.scrollTo({
    top: rect.top + scrollTop - 80,
    behavior: 'smooth'
  })
}
