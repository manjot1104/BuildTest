import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';



const execAsync = promisify(exec);

interface PDFGenerationOptions {
  latexContent: string;
  filename?: string;
}

/**
 * Generates PDF from LaTeX content using pdflatex
 * Requires pdflatex to be installed on the system
 */
export async function generatePDFFromLatex({
  latexContent,
  filename = 'resume',
}: PDFGenerationOptions): Promise<Buffer> {
  const tempDir = tmpdir();
  const baseName = `${filename}_${Date.now()}`;
  const texFile = join(tempDir, `${baseName}.tex`);
  const pdfFile = join(tempDir, `${baseName}.pdf`);

  try {
    // Write LaTeX content to temporary file
    await writeFile(texFile, latexContent, 'utf-8');

    // Run pdflatex to generate PDF
    // Run twice to ensure proper references and citations
    await execAsync(`pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${texFile}`);
    await execAsync(`pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${texFile}`);

    // Read the generated PDF
    const pdfBuffer = await readFile(pdfFile);

    // Cleanup temporary files
    const auxFiles = ['.aux', '.log', '.out'];
    for (const ext of auxFiles) {
      try {
        await unlink(join(tempDir, `${baseName}${ext}`));
      } catch {
        // Ignore cleanup errors
      }
    }
    await unlink(texFile);
    await unlink(pdfFile);

    return pdfBuffer;
  } catch (error) {
    // Cleanup on error
    try {
      await unlink(texFile);
      await unlink(pdfFile);
    } catch {
      // Ignore cleanup errors
    }

    throw new Error(
      `Failed to generate PDF from LaTeX: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Alternative: Generate PDF using Puppeteer (if pdflatex is not available)
 * This renders LaTeX to HTML first, then converts to PDF
 */
export async function generatePDFFromLatexPuppeteer({
  latexContent,
  filename: _filename = 'resume',
}: PDFGenerationOptions): Promise<Buffer> {
  try {
    const { LaTeXJS } = await import('latex.js');
    const { launchBrowser } = await import('@/lib/browser');

    // Convert LaTeX to HTML
    const latex = new LaTeXJS();
    const html = latex.parseAndGenerateHTML(latexContent);

    const browser = await launchBrowser();

    const page = await browser.newPage();
    
    // Set content with proper styling
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Times New Roman', serif;
              margin: 0;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
  } catch (error) {
    throw new Error(
      `Failed to generate PDF using Puppeteer: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}