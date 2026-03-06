import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

/**
 * Compiles LaTeX code to PDF using pdflatex
 * @param latexCode - Raw LaTeX code as string
 * @returns PDF buffer or null if compilation fails
 */
export async function compileLaTeXToPDF(latexCode: string): Promise<Buffer | null> {
  const tempDir = tmpdir()
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(7)
  const baseName = `resume_${timestamp}_${randomId}`
  const texFilePath = join(tempDir, `${baseName}.tex`)
  const pdfFilePath = join(tempDir, `${baseName}.pdf`)

  try {
    // Write LaTeX code to temporary file
    await writeFile(texFilePath, latexCode, 'utf-8')

    // Compile LaTeX to PDF using pdflatex
    // -interaction=nonstopmode: Don't stop for errors
    // -output-directory: Specify output directory
    // -halt-on-error: Stop on first error
    // -no-shell-escape: Disable shell escape for security
    console.log('Starting LaTeX compilation...')
    const startTime = Date.now()
    
    const { stdout, stderr } = await execAsync(
      `pdflatex -interaction=nonstopmode -output-directory="${tempDir}" -halt-on-error -no-shell-escape "${texFilePath}"`,
      {
        timeout: 90000, // 90 second timeout (increased for MiKTeX package downloads)
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    )
    
    const compileTime = Date.now() - startTime
    console.log(`LaTeX compilation completed in ${compileTime}ms`)
    
    // Log compilation output for debugging
    if (stdout) {
      console.log('LaTeX stdout:', stdout.substring(0, 500)) // First 500 chars
    }
    if (stderr) {
      console.log('LaTeX stderr:', stderr.substring(0, 500)) // First 500 chars
    }

    // Check if PDF was created
    try {
      const pdfBuffer = await readFile(pdfFilePath)
      
      // Cleanup: Remove temporary files
      await cleanupTempFiles(tempDir, baseName)
      
      return pdfBuffer
    } catch (readError) {
      // PDF file doesn't exist - compilation failed
      console.error('LaTeX compilation failed - PDF not created')
      console.error('LaTeX stdout:', stdout?.substring(0, 1000))
      console.error('LaTeX stderr:', stderr?.substring(0, 1000))
      
      // Check for common errors
      const output = (stderr || stdout || '').toLowerCase()
      if (output.includes('package') && output.includes('not found')) {
        throw new Error('LaTeX compilation failed: Missing package. The generated LaTeX uses packages that are not installed in MiKTeX.')
      }
      if (output.includes('emergency stop')) {
        throw new Error('LaTeX compilation failed: Emergency stop. Check the LaTeX syntax in the generated code.')
      }
      
      // Cleanup
      await cleanupTempFiles(tempDir, baseName)
      
      return null
    }
  } catch (error: any) {
    console.error('Error compiling LaTeX to PDF:', error)
    
    // Cleanup on error
    await cleanupTempFiles(tempDir, baseName).catch(() => {
      // Ignore cleanup errors
    })

    // Check if it's a timeout error
    if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
      const errorOutput = (error as any).stdout || (error as any).stderr || ''
      console.error('LaTeX compilation timeout. Partial output:', errorOutput.substring(0, 1000))
      throw new Error('LaTeX compilation timed out after 90 seconds. This might be due to MiKTeX downloading packages on first use. Please try again - subsequent compilations will be faster.')
    }

    // Check if pdflatex is not found
    if (error.code === 127 || error.message?.includes('pdflatex: command not found')) {
      throw new Error('pdflatex is not installed or not in PATH. Please install a LaTeX distribution.')
    }

    return null
  }
}

/**
 * Cleans up temporary LaTeX files
 */
async function cleanupTempFiles(tempDir: string, baseName: string): Promise<void> {
  const filesToDelete = [
    `${baseName}.tex`,
    `${baseName}.pdf`,
    `${baseName}.aux`,
    `${baseName}.log`,
    `${baseName}.out`,
  ]

  await Promise.allSettled(
    filesToDelete.map(async (file) => {
      try {
        await unlink(join(tempDir, file))
      } catch (error) {
        // Ignore file not found errors
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn(`Failed to delete temp file ${file}:`, error)
        }
      }
    })
  )
}
