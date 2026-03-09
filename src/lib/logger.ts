import fs from "fs";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";
const LOG_FILE = path.join(process.cwd(), "logs", "app.log.txt");

function ensureLogDir() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a;
      try {
        return JSON.stringify(a, null, 2);
      } catch {
        return String(a);
      }
    })
    .join(" ");
}

function writeToFile(level: string, args: unknown[]) {
  try {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${formatArgs(args)}\n`;
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // silently fail if file write fails
  }
}

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.log("[INFO]", ...args);
    writeToFile("INFO", args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn("[WARN]", ...args);
    writeToFile("WARN", args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error("[ERROR]", ...args);
    writeToFile("ERROR", args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug("[DEBUG]", ...args);
    writeToFile("DEBUG", args);
  },
};
