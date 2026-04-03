/** A4 at 96 CSS px per inch → mm conversion (same as engine). */
const MM_TO_PX = 96 / 25.4

export const RESUME_A4_MM = { width: 210, height: 297 } as const

export const RESUME_A4_PX = {
  width: RESUME_A4_MM.width * MM_TO_PX,
  height: RESUME_A4_MM.height * MM_TO_PX,
} as const
