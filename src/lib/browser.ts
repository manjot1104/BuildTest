import type { Browser } from 'puppeteer'

const IS_SERVERLESS = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL

/**
 * Launches a Puppeteer browser instance that works in both local dev and
 * serverless environments (Vercel / AWS Lambda).
 *
 * - On Vercel / Lambda: uses @sparticuz/chromium (stripped-down, ~50MB)
 * - Locally: uses the Puppeteer-managed Chrome binary
 */
export async function launchBrowser(): Promise<Browser> {
  if (IS_SERVERLESS) {
    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer-core')

    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
      defaultViewport: { width: 1280, height: 720 },
    }) as Promise<Browser>
  }

  const puppeteer = await import('puppeteer')
  return puppeteer.default.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    timeout: 30000,
  })
}
