import type { Browser } from 'puppeteer-core'

const IS_SERVERLESS = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL

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

  // Local: use puppeteer-extra with stealth plugin
  const { default: puppeteerExtra } = await import('puppeteer-extra')
  const { default: StealthPlugin } = await import('puppeteer-extra-plugin-stealth')

  puppeteerExtra.use(StealthPlugin())
  console.log('🕵️ [STEALTH] Plugins loaded:', puppeteerExtra.plugins.map((p: any) => p.name))

  const browser = await puppeteerExtra.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,768',
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    timeout: 30000,
  })

  return browser as unknown as Browser
}