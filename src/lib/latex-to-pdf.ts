import { logger } from "@/lib/logger";

/**
 * Compiles LaTeX code to PDF using the LaTeX Online API (latex.ytotech.com)
 * Production-ready: no local pdflatex installation required
 */
export async function compileLaTeXToPDF(
  latexCode: string,
): Promise<Buffer | null> {
  logger.info("Starting LaTeX compilation via API");
  const startTime = Date.now();

  try {
    const response = await fetch("https://latex.ytotech.com/builds/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: "pdflatex",
        resources: [
          {
            main: true,
            content: latexCode,
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const compileTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      logger.error("LaTeX API error", {
        status: response.status,
        compileTime,
        error: errorText.slice(0, 500),
      });
      throw new Error(
        `LaTeX compilation failed (${response.status}): ${errorText.slice(0, 200)}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/pdf")) {
      const body = await response.text().catch(() => "");
      logger.error("LaTeX API returned non-PDF", {
        contentType,
        compileTime,
        body: body.slice(0, 500),
      });
      throw new Error(
        `LaTeX compilation failed: ${body.slice(0, 200) || "No PDF output"}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    logger.info("LaTeX compilation success", {
      compileTime,
      pdfSize: pdfBuffer.length,
    });

    return pdfBuffer;
  } catch (error: any) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      logger.error("LaTeX compilation timed out");
      throw new Error(
        "LaTeX compilation timed out after 60 seconds. Please simplify your LaTeX code and try again.",
      );
    }

    logger.error("LaTeX compilation error", {
      message: error?.message,
    });

    if (error instanceof Error && error.message.startsWith("LaTeX")) {
      throw error;
    }

    throw new Error(
      `LaTeX compilation failed: ${error?.message || "Unknown error"}`,
    );
  }
}
