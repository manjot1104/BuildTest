/**
 * Tries to find Chrome/Chromium executable on Windows
 */
function findChromeExecutable(): string | undefined {
  if (process.platform !== 'win32') {
    return undefined
  }

  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.PROGRAMFILES + '\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env['PROGRAMFILES(X86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
  ]

  const fs = require('fs')
  for (const path of possiblePaths) {
    if (path && fs.existsSync(path)) {
      return path
    }
  }

  return undefined
}

/**
 * Generates PDF from HTML content using Puppeteer
 * Production-ready: uses Puppeteer for HTML to PDF conversion
 */
export async function generatePDFFromHtml(
  htmlContent: string,
): Promise<Buffer | null> {
  try {
    const { launchBrowser } = await import('@/lib/browser')
    const browser = await launchBrowser()

    const page = await browser.newPage()

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1,
    })

    // Set content with proper styling for print
    // `networkidle0` waits for all network to go idle — very slow for resumes with no real network.
    await page.setContent(htmlContent, {
      waitUntil: 'load',
      timeout: 25_000,
    })

    await new Promise((resolve) => setTimeout(resolve, 120))

    // Generate PDF with minimal margins to avoid blank first page
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
    })

    await browser.close()

    return Buffer.from(pdfBuffer)
  } catch (error) {
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('Failed to launch') || error.message.includes('browser process')) {
        const chromePath = findChromeExecutable()
        const troubleshootingSteps = [
          '1. Ensure Puppeteer is properly installed: `bun install puppeteer`',
          '2. If using Windows, try setting PUPPETEER_EXECUTABLE_PATH environment variable:',
          '   - For Chrome: `set PUPPETEER_EXECUTABLE_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`',
          '   - For Edge: `set PUPPETEER_EXECUTABLE_PATH=C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe`',
          '3. Or reinstall Puppeteer to download Chromium: `bun remove puppeteer && bun install puppeteer`',
        ]

        throw new Error(
          `Failed to launch browser for PDF generation.\n\n` +
            `Troubleshooting steps:\n${troubleshootingSteps.join('\n')}\n\n` +
            (chromePath ? `Found Chrome at: ${chromePath}\n` : 'Could not auto-detect Chrome/Edge installation.\n') +
            `Original error: ${error.message}\n\n` +
            `For more help, visit: https://pptr.dev/troubleshooting`,
        )
      }
      throw new Error(`Failed to generate PDF from HTML: ${error.message}`)
    }
    throw new Error(`Failed to generate PDF from HTML: Unknown error occurred`)
  }
}
