import JSZip from "jszip"

/** Pull first top-level JSON object with string-aware brace matching (avoids greedy `/\{[\s\S]*\}/` bugs). */
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{")
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]!
    if (escape) {
      escape = false
      continue
    }
    if (c === "\\" && inString) {
      escape = true
      continue
    }
    if (c === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (c === "{") depth++
    else if (c === "}") {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

export function coerceResumeField(value: unknown): string {
  if (value == null) return ""
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join(", ")
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value).trim()
}

export type ParsedResumeShape = {
  fullName: string
  title?: string
  email: string
  phone: string
  location?: string
  linkedin?: string
  github?: string
  portfolio?: string
  summary?: string
  skills: string
  experience: string
  education: string
  projects: string
  certifications?: string
  achievements?: string
  languagesKnown?: string
}

export function normalizeAiResumeRecord(raw: Record<string, unknown>): ParsedResumeShape {
  return {
    fullName: coerceResumeField(raw.fullName),
    title: coerceResumeField(raw.title),
    email: coerceResumeField(raw.email),
    phone: coerceResumeField(raw.phone),
    location: coerceResumeField(raw.location),
    linkedin: coerceResumeField(raw.linkedin),
    github: coerceResumeField(raw.github),
    portfolio: coerceResumeField(raw.portfolio),
    summary: coerceResumeField(raw.summary),
    skills: coerceResumeField(raw.skills),
    experience: coerceResumeField(raw.experience),
    education: coerceResumeField(raw.education),
    projects: coerceResumeField(raw.projects),
    certifications: coerceResumeField(raw.certifications),
    achievements: coerceResumeField(raw.achievements),
    languagesKnown: coerceResumeField(raw.languagesKnown ?? raw.languages),
  }
}

function preferScalar(ai: string, fb: string): string {
  const a = ai.trim()
  const b = fb.trim()
  return a.length > 0 ? a : b
}

/** Prefer AI when substantive; otherwise fill from regex/heuristic fallback (especially contact + long sections). */
type SectionBucket =
  | "experience"
  | "projects"
  | "achievements"
  | "certifications"
  | "education"
  | "skills"
  | "languagesKnown"

type ParseBucket = "preamble" | "summaryBody" | SectionBucket

function stripNotSpecified(s: string): string {
  const t = s.trim()
  return t === "Not specified" ? "" : s
}

function appendBlocks(a: string, b: string): string {
  const x = stripNotSpecified(a).trim()
  const y = stripNotSpecified(b).trim()
  if (!y) return x
  if (!x) return y
  return `${x}\n\n${y}`
}

/**
 * PDFs / models often glue `...role**EDUCATION**Master's...` on one line — insert newlines so
 * `detectParseHeader` can see section titles.
 */
export function expandResumeTextForSectionParsing(text: string): string {
  let s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  if (/\\n/.test(s) && s.split("\\n").length > 4) {
    s = s.replace(/\\n/g, "\n").replace(/\\t/g, "\t")
  }
  const lines = s.split("\n")
  return lines.map(splitLineAtEmbeddedSectionHeaders).join("\n")
}

function splitLineAtEmbeddedSectionHeaders(line: string): string {
  if (line.length < 16) return line
  let s = line
  const mdHeader =
    /([^\s\n*])(\s*)(\*{1,3}\s*(?:EDUCATION|EDUCATIONAL|RECOGNITIONS?|EXPERIENCES?|ACHIEVEMENTS?|CERTIFICATIONS?|TECHNICAL\s+SKILLS|CORE\s+COMPETENCIES|KEY\s+SKILLS|PROJECTS?|WORK\s+EXPERIENCE|EMPLOYMENT(?:\s+HISTORY)?|INTERNSHIP(?:S)?|PROFESSIONAL\s+(?:SUMMARY|EXPERIENCE)|KEY\s+PROJECTS)\s*\*{1,3})/gi
  s = s.replace(mdHeader, "$1\n$3")
  s = s.replace(
    /([a-z0-9.!?])([ \t]+)(EDUCATION|RECOGNITIONS|WORK\s+EXPERIENCE)\b(?=[ \t]+[A-Z])/gi,
    "$1\n$3",
  )
  return s
}

function countParseHeaders(text: string): number {
  const expanded = expandResumeTextForSectionParsing(text)
  return expanded.split("\n").filter((l) => detectParseHeader(l) !== null).length
}

/** Strip bullets, numbering, markdown, table pipes so headings like `**Experience**` or `1. EDUCATION` match. */
function normalizeLineForSectionHeader(line: string): string {
  let s = line
    .replace(/^\uFEFF/, "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\uFF0A/g, "*")
    .replace(/\u2217/g, "*")
    .trim()
  s = s.replace(/^[\s•\*\-–—◦▪▸►→·]+/u, "")
  s = s.replace(/^[\d]{1,2}[.)]\s+/, "")
  s = s.replace(/^[ivxlcdm]{1,4}[.)]\s+/i, "")
  s = s.replace(/^\[[^\]]{0,40}]\s*/, "")
  s = s.replace(/^[|│]+\s*/, "").replace(/\s*[|│]+$/, "")
  s = s.replace(/\*{1,3}/g, "").replace(/_{1,3}/g, "")
  s = s.replace(/^#{1,6}\s+/, "").trim()
  return s
}

type MonolithKey = "experience" | "summary" | "education" | "projects"

/**
 * Section headers for full-resume text (many templates + AI putting everything in one field).
 */
export function detectParseHeader(line: string): ParseBucket | null {
  const t = normalizeLineForSectionHeader(line)
  if (!t || t.length > 130) return null
  const h = t
  const u = h.toUpperCase().replace(/\s+/g, " ").trim()

  if (/^(PROFESSIONAL\s+)?SUMMARY\s*[:.\-–—]*\s*$/.test(u)) return "summaryBody"
  if (/^EXECUTIVE\s+SUMMARY\s*[:.\-–—]*\s*$/.test(u)) return "summaryBody"
  if (/^PROFILE\s*[:.\-–—]*\s*$/.test(u)) return "summaryBody"
  if (/^(CAREER\s+)?OBJECTIVE\s*[:.\-–—]*\s*$/.test(u)) return "summaryBody"
  if (/^ABOUT(\s+ME)?\s*[:.\-–—]*\s*$/.test(u)) return "summaryBody"
  if (/^OVERVIEW\s*[:.\-–—]*\s*$/.test(u)) return "summaryBody"

  if (/^WORK\s+EXPERIENCE(\s+([&+]|\sAND\s)\s*INTERNSHIPS?)?\s*[:.\-–—]*\s*$/i.test(u)) {
    return "experience"
  }
  if (/^PROFESSIONAL\s+EXPERIENCE\s*[:.\-–—]*\s*$/.test(u)) return "experience"
  if (/^RELEVANT\s+EXPERIENCE\s*[:.\-–—]*\s*$/.test(u)) return "experience"
  if (/^EMPLOYMENT(\s+HISTORY)?\s*[:.\-–—]*\s*$/.test(u)) return "experience"
  if (/^CAREER(\s+HISTORY|\s+OVERVIEW|\s+HIGHLIGHTS)?\s*[:.\-–—]*\s*$/.test(u)) {
    return "experience"
  }
  if (/^POSITIONS?\s+HELD\s*[:.\-–—]*\s*$/.test(u)) return "experience"
  if (/^JOB\s+HISTORY\s*[:.\-–—]*\s*$/.test(u)) return "experience"
  if (/^INTERNSHIP(S)?(\s+EXPERIENCE)?\s*[:.\-–—]*\s*$/.test(u)) return "experience"
  if (/^LEADERSHIP(\s+EXPERIENCE)?\s*[:.\-–—]*\s*$/.test(u)) return "experience"
  if (/^VOLUNTEER(\s+(WORK|EXPERIENCE))?\s*[:.\-–—]*\s*$/.test(u)) return "experience"
  if (/^EXPERIENCE\s*[:.\-–—]*\s*$/.test(u)) return "experience"

  if (/^RECOGNITIONS?(\s+(&|AND)\s+AWARDS?)?\s*[:.\-–—]*\s*$/i.test(u)) return "achievements"
  if (/^RECOGNITIONS?\s*[:.\-–—]*\s*$/.test(u)) return "achievements"
  if (/^AWARDS?\s+(&|AND)\s+RECOGNITIONS?\s*[:.\-–—]*\s*$/i.test(u)) return "achievements"

  if (/^(ACADEMIC\s+)?PROJECTS?$/.test(u)) return "projects"
  if (/^KEY\s+PROJECTS?$/.test(u)) return "projects"
  if (/^NOTABLE\s+PROJECTS?$/.test(u)) return "projects"
  if (/^RELEVANT\s+PROJECTS?$/.test(u)) return "projects"
  if (/^PERSONAL\s+PROJECTS?$/.test(u)) return "projects"
  if (/^SIDE\s+PROJECTS?$/.test(u)) return "projects"
  if (/^SELECTED\s+PROJECTS?$/.test(u)) return "projects"
  if (/^INTERNSHIP\s+PROJECTS?$/.test(u)) return "projects"
  if (/^OPEN\s*-?\s*SOURCE(\s+CONTRIBUTIONS?)?$/.test(u)) return "projects"
  if (/^PUBLICATIONS?$/.test(u)) return "projects"
  if (u === "PROJECT") return "projects"

  if (/^ACHIEVEMENTS?(\s*\/\s*|\s+)(CERTIFICATES?|CERTS?|LICENSES?|AWARDS?)?$/.test(u)) {
    return "achievements"
  }
  if (/^ACHIEVEMENTS?$/.test(u)) return "achievements"
  if (/^HONORS?(\s+|\s*&\s*)AWARDS?$/.test(u)) return "achievements"
  if (/^AWARDS?\s+(&|AND)?\s*ACHIEVEMENTS?$/i.test(h)) return "achievements"
  if (/^KEY\s+ACHIEVEMENTS?$/.test(u)) return "achievements"
  if (/^HIGHLIGHTS(\s+(&|AND)\s+ACHIEVEMENTS?)?$/i.test(u)) return "achievements"

  if (/^CERTIFICATES?$/.test(u) && !u.includes("ACHIEVEMENT")) return "certifications"
  if (/^CERTIFICATIONS?$/.test(u)) return "certifications"
  if (/^LICENSES?\s+(&|AND)?\s*CERT/.test(u)) return "certifications"
  if (/^TRAINING(\s+(&|AND)\s*CERTIFICATIONS?)?$/i.test(u)) return "certifications"

  if (/^EDUCATION(\s+|$|[:\-–—])/.test(u)) return "education"
  if (/^EDUCATIONAL(\s+BACKGROUND|\s+QUALIFICATIONS?)?\s*[:.\-–—]*\s*$/.test(u)) {
    return "education"
  }
  if (/^ACADEMIC\s+BACKGROUND\s*[:.\-–—]*\s*$/.test(u)) return "education"
  if (/^QUALIFICATIONS?\s*[:.\-–—]*\s*$/.test(u)) return "education"
  if (/^ACADEMIC\s+CREDENTIALS\s*[:.\-–—]*\s*$/.test(u)) return "education"

  if (/^TECHNICAL\s+SKILLS?$/.test(u)) return "skills"
  if (/^CORE\s+(COMPETENCIES|SKILLS?)$/.test(u)) return "skills"
  if (/^RELEVANT\s+SKILLS?$/.test(u)) return "skills"
  if (/^TOOLS(\s+(&|AND)\s*(TECHNOLOGIES|TECH))?$/i.test(u)) return "skills"
  if (/^TECH\s+STACK$/i.test(u)) return "skills"
  if (/^COMPETENCIES$/.test(u)) return "skills"
  if (/^SKILLS?$/.test(u) && u.length < 32) return "skills"

  if (/^(FOREIGN\s+)?LANGUAGES?$/.test(u)) return "languagesKnown"
  if (/^LANGUAGE\s+SKILLS?$/.test(u)) return "languagesKnown"

  /** PDF / export-style ALL-CAPS section lines that missed exact patterns. */
  if (!/[a-z]/.test(h)) {
    const core = u.replace(/[:.\-–—.]+$/g, "").trim()
    if (core.length >= 4 && core.length <= 62) {
      const implicit = implicitParseBucketFromUpperCore(core)
      if (implicit) return implicit
    }
  }

  return null
}

/** Single-line section title: core is already uppercased and whitespace-normalized. */
function implicitParseBucketFromUpperCore(core: string): ParseBucket | null {
  if ((core.match(/\s+/g) ?? []).length > 7) return null
  if (/^(PROFESSIONAL\s+)?SUMMARY(\s|$)/.test(core)) return "summaryBody"
  if (/^EXECUTIVE\s+SUMMARY(\s|$)/.test(core)) return "summaryBody"
  if (/^(CAREER\s+)?OBJECTIVE(\s|$)/.test(core)) return "summaryBody"
  if (/^PROFILE(\s|$)/.test(core)) return "summaryBody"
  if (/^OVERVIEW(\s|$)/.test(core)) return "summaryBody"
  if (/^WORK\s+EXPERIENCE/.test(core)) return "experience"
  if (/^PROFESSIONAL\s+EXPERIENCE(\s|$)/.test(core)) return "experience"
  if (/^RELEVANT\s+EXPERIENCE(\s|$)/.test(core)) return "experience"
  if (/^EMPLOYMENT(\s+HISTORY)?(\s|$)/.test(core)) return "experience"
  if (/^EXPERIENCE(\s|$)/.test(core)) return "experience"
  if (/^INTERNSHIP/.test(core)) return "experience"
  if (/^EDUCATION(\s|$)/.test(core)) return "education"
  if (/^EDUCATIONAL(\s+BACKGROUND)?(\s|$)/.test(core)) return "education"
  if (/^ACADEMIC(\s|$)/.test(core)) return "education"
  if (/^QUALIFICATIONS?(\s|$)/.test(core)) return "education"
  if (/^(ACADEMIC\s+)?PROJECTS?(\s|$)/.test(core)) return "projects"
  if (/^KEY\s+PROJECTS?(\s|$)/.test(core)) return "projects"
  if (/^RECOGNITIONS?(\s|$)/.test(core)) return "achievements"
  if (/^AWARDS?(\s|$)/.test(core)) return "achievements"
  if (/^ACHIEVEMENTS?(\s|$)/.test(core)) return "achievements"
  if (/^HONORS?(\s+|\s*&\s*)AWARDS?$/.test(core)) return "achievements"
  if (/^CERTIFICATIONS?(\s|$)/.test(core)) return "certifications"
  if (/^TECHNICAL\s+SKILLS?(\s|$)/.test(core)) return "skills"
  if (/^CORE\s+(COMPETENCIES|SKILLS?)(\s|$)/.test(core)) return "skills"
  if (/^SKILLS?(\s|$)/.test(core) && core.length < 36) return "skills"
  if (/^LANGUAGES?(\s|$)/.test(core)) return "languagesKnown"
  return null
}

export function detectResumeSectionHeader(line: string): SectionBucket | null {
  const p = detectParseHeader(line)
  if (p === null || p === "preamble" || p === "summaryBody") return null
  return p
}

export type FullPartition = {
  preamble: string
  summaryBody: string
  experience: string
  projects: string
  achievements: string
  certifications: string
  education: string
  skills: string
  languagesKnown: string
}

function emptyBuckets(): Record<ParseBucket, string[]> {
  return {
    preamble: [],
    summaryBody: [],
    experience: [],
    projects: [],
    achievements: [],
    certifications: [],
    education: [],
    skills: [],
    languagesKnown: [],
  }
}

function joinLines(arr: string[]): string {
  return arr.join("\n").trim()
}

export function partitionResumeText(text: string, initial: ParseBucket): FullPartition {
  const lines = expandResumeTextForSectionParsing(text).split("\n")
  const buckets = emptyBuckets()
  let mode: ParseBucket = initial

  for (const line of lines) {
    const hdr = detectParseHeader(line)
    if (hdr !== null) {
      mode = hdr
      continue
    }
    buckets[mode].push(line)
  }

  return {
    preamble: joinLines(buckets.preamble),
    summaryBody: joinLines(buckets.summaryBody),
    experience: joinLines(buckets.experience),
    projects: joinLines(buckets.projects),
    achievements: joinLines(buckets.achievements),
    certifications: joinLines(buckets.certifications),
    education: joinLines(buckets.education),
    skills: joinLines(buckets.skills),
    languagesKnown: joinLines(buckets.languagesKnown),
  }
}

function findMonolithSource(data: ParsedResumeShape): { key: MonolithKey; text: string } | null {
  const sum = (data.summary ?? "").trim()
  const sumLen = sum.length
  const expLen = data.experience.trim().length
  const eduLen = data.education.trim().length
  const projLen = data.projects.trim().length
  const achLen = (data.achievements ?? "").trim().length
  const certLen = (data.certifications ?? "").trim().length
  const otherMain = expLen + eduLen + projLen + achLen + certLen

  if (sumLen >= 220 && otherMain <= 480 && sumLen >= Math.max(otherMain * 1.15, 160)) {
    return { key: "summary", text: sum }
  }
  if (sumLen >= 320 && otherMain <= 280) {
    return { key: "summary", text: sum }
  }

  const cands: Array<{ key: MonolithKey; text: string; len: number; hc: number }> = [
    { key: "experience", text: data.experience, len: data.experience.length, hc: 0 },
    { key: "summary", text: sum, len: sum.length, hc: 0 },
    { key: "education", text: data.education, len: data.education.length, hc: 0 },
    { key: "projects", text: data.projects, len: data.projects.length, hc: 0 },
  ]
  for (const c of cands) {
    c.hc = countParseHeaders(c.text)
  }
  const total = cands.reduce((s, c) => s + c.len, 0) || 1

  let best: (typeof cands)[0] | null = null
  let bestScore = 0
  for (const c of cands) {
    if (c.len < 180) continue
    const share = c.len / total
    let score = c.hc * 1200 + c.len
    if (c.hc >= 2) score += 400
    if (share >= 0.5 && c.len > 400) score += 600
    if (c.len > 2000 && c.hc >= 1) score += 500
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }

  if (!best) return null
  const dominant = best.len / total
  if (best.hc < 1) return null
  if (best.hc < 2 && best.len < 900 && dominant < 0.38) return null
  if (best.hc < 2 && best.len < 1400 && dominant < 0.42) return null
  return { key: best.key, text: best.text }
}

function applyPartitionOntoBase(
  base: ParsedResumeShape,
  parts: FullPartition,
  clearKey: MonolithKey,
): ParsedResumeShape {
  const next: ParsedResumeShape = { ...base }
  if (clearKey === "experience") next.experience = ""
  else if (clearKey === "summary") next.summary = ""
  else if (clearKey === "education") next.education = ""
  else if (clearKey === "projects") next.projects = ""

  const summaryChunk = appendBlocks(parts.preamble, parts.summaryBody)

  return {
    ...next,
    summary: appendBlocks(next.summary ?? "", summaryChunk),
    experience: appendBlocks(next.experience, parts.experience),
    projects: appendBlocks(next.projects, parts.projects),
    achievements: appendBlocks(next.achievements ?? "", parts.achievements),
    certifications: appendBlocks(next.certifications ?? "", parts.certifications),
    education: appendBlocks(next.education, parts.education),
    skills: appendBlocks(next.skills, parts.skills),
    languagesKnown: appendBlocks(next.languagesKnown ?? "", parts.languagesKnown),
  }
}

function mergeSecondPass(d: ParsedResumeShape, ex: FullPartition, pr: FullPartition): ParsedResumeShape {
  const sumExtra = appendBlocks(
    appendBlocks(ex.preamble, ex.summaryBody),
    appendBlocks(pr.preamble, pr.summaryBody),
  )
  const sumTrim = sumExtra.trim()
  const curSum = (d.summary ?? "").trim()
  const summaryNext =
    sumTrim.length > 0 &&
    (curSum.length < 80 ||
      !curSum.includes(sumTrim.slice(0, Math.min(60, sumTrim.length))))
      ? appendBlocks(d.summary ?? "", sumExtra)
      : d.summary ?? ""

  return {
    ...d,
    summary: summaryNext,
    experience: ex.experience,
    projects: appendBlocks(ex.projects, pr.projects),
    achievements: appendBlocks(
      appendBlocks(d.achievements ?? "", ex.achievements),
      pr.achievements,
    ),
    certifications: appendBlocks(
      appendBlocks(d.certifications ?? "", ex.certifications),
      pr.certifications,
    ),
    education: appendBlocks(appendBlocks(d.education, ex.education), pr.education),
    skills: appendBlocks(appendBlocks(d.skills, ex.skills), pr.skills),
    languagesKnown: appendBlocks(
      appendBlocks(d.languagesKnown ?? "", ex.languagesKnown),
      pr.languagesKnown,
    ),
  }
}

/**
 * Split monolithic AI dumps (one field has most content) and nested sections in experience/projects.
 */
export function rerouteMisplacedResumeSections(data: ParsedResumeShape): ParsedResumeShape {
  const monolith = findMonolithSource(data)
  let d = { ...data }
  if (monolith) {
    const parts = partitionResumeText(monolith.text, "preamble")
    d = applyPartitionOntoBase(d, parts, monolith.key)
  }

  const ex = partitionResumeText(d.experience, "experience")
  const pr = partitionResumeText(d.projects, "projects")
  return mergeSecondPass(d, ex, pr)
}

function plaintextPartitionHasBody(parts: FullPartition): number {
  return (
    parts.experience.trim().length +
    parts.education.trim().length +
    parts.projects.trim().length +
    parts.achievements.trim().length +
    parts.certifications.trim().length +
    parts.skills.trim().length
  )
}

/**
 * When the model puts almost everything in `summary` but the extracted file text has real section
 * headings, re-split from raw plaintext so Experience / Education / etc. populate correctly.
 */
export function applyPlaintextReconcileIfMonolith(
  data: ParsedResumeShape,
  rawText: string,
): ParsedResumeShape {
  const rt = rawText.replace(/\r/g, "").trim()
  if (rt.length < 80) return data

  const sumLen = (data.summary ?? "").trim().length
  const restLen =
    data.experience.trim().length +
    data.education.trim().length +
    data.projects.trim().length +
    (data.achievements ?? "").trim().length +
    (data.certifications ?? "").trim().length

  const headersInSummary = countParseHeaders(data.summary ?? "")
  const parts = partitionResumeText(rt, "preamble")
  const plainBody = plaintextPartitionHasBody(parts)
  const plainHeaders = countParseHeaders(rt)

  const aiLooksLikeDump =
    sumLen >= 260 &&
    restLen <= Math.max(650, sumLen * 0.55) &&
    (headersInSummary >= 1 || restLen <= sumLen * 0.32)

  const rawLooksStructured = plainHeaders >= 2 && plainBody >= 90

  if (!aiLooksLikeDump && !rawLooksStructured) return data

  if (plainBody < 80 && plainHeaders < 2) return data
  if (sumLen < 180 && restLen > plainBody + 200) return data

  const summaryFromParts = appendBlocks(parts.preamble, parts.summaryBody)

  const pick = (fromPlain: string, fromData: string): string => {
    const p = fromPlain.trim()
    const d = fromData.trim()
    if (rawLooksStructured && p.length > 40) return fromPlain
    if (p.length > d.length + 25) return fromPlain
    if (d.length === 0 && p.length > 0) return fromPlain
    return fromData
  }

  return {
    ...data,
    summary:
      summaryFromParts.trim().length > 0 ? summaryFromParts : (data.summary ?? ""),
    experience: pick(parts.experience, data.experience),
    education: pick(parts.education, data.education),
    projects: pick(parts.projects, data.projects),
    achievements: pick(parts.achievements, data.achievements ?? ""),
    certifications: pick(parts.certifications, data.certifications ?? ""),
    skills: pick(parts.skills, data.skills),
    languagesKnown: pick(parts.languagesKnown, data.languagesKnown ?? ""),
  }
}

export function mergeAiResumeWithFallback(
  ai: ParsedResumeShape,
  fb: ParsedResumeShape,
): ParsedResumeShape {
  const preferLong = (a: string, b: string, minKeepAi = 80) => {
    const as = a.trim()
    const bs = b.trim()
    if (as.length >= minKeepAi) return as
    if (bs.length > as.length + 20) return bs
    return as || bs
  }

  const aiSum = (ai.summary ?? "").trim()
  const aiSumHuge = aiSum.length > 900
  const preferFbWhenAiDumped = (aiField: string, fbField: string, gap: number) => {
    const a = aiField.trim()
    const b = fbField.trim()
    if (aiSumHuge && b.length > a.length + gap) return b
    return null
  }

  const expPick = preferFbWhenAiDumped(ai.experience, fb.experience, 80)
  const eduPick = preferFbWhenAiDumped(ai.education, fb.education, 40)
  const projPick = preferFbWhenAiDumped(ai.projects, fb.projects, 40)
  const achPick = preferFbWhenAiDumped(ai.achievements ?? "", fb.achievements ?? "", 30)

  return {
    fullName: preferScalar(ai.fullName, fb.fullName),
    title: preferScalar(ai.title ?? "", fb.title ?? ""),
    email: preferScalar(ai.email, fb.email),
    phone: preferScalar(ai.phone, fb.phone),
    location: preferScalar(ai.location ?? "", fb.location ?? ""),
    linkedin: preferScalar(ai.linkedin ?? "", fb.linkedin ?? ""),
    github: preferScalar(ai.github ?? "", fb.github ?? ""),
    portfolio: preferScalar(ai.portfolio ?? "", fb.portfolio ?? ""),
    summary: preferLong(ai.summary ?? "", fb.summary ?? "", 40),
    skills: preferLong(ai.skills, fb.skills, 15),
    experience: expPick ?? preferLong(ai.experience, fb.experience, 60),
    education: eduPick ?? preferLong(ai.education, fb.education, 30),
    projects: projPick ?? preferLong(ai.projects, fb.projects, 30),
    certifications: preferScalar(ai.certifications ?? "", fb.certifications ?? ""),
    achievements:
      achPick ?? preferScalar(ai.achievements ?? "", fb.achievements ?? ""),
    languagesKnown: preferScalar(ai.languagesKnown ?? "", fb.languagesKnown ?? ""),
  }
}

/**
 * DOCX → plain text (OpenXML). `.doc` (legacy) is not supported here.
 */
export async function extractTextFromDocxArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const docXml = zip.file("word/document.xml")
  if (!docXml) {
    throw new Error("DOCX missing word/document.xml")
  }
  const xml = await docXml.async("string")
  let s = xml
    .replace(/<w:tab\s*\/>/gi, "\t")
    .replace(/<w:br\s*\/?>/gi, "\n")
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<\/w:tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}
