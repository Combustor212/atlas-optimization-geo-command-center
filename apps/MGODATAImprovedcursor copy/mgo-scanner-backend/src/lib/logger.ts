/**
 * Safe logger that writes to stderr so it never visually interleaves with
 * HTTP response bodies when you curl in the same terminal as the server.
 *
 * Important: Do NOT pass huge raw objects here; keep logs concise.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  let line = `[${ts}] ${level} ${message}`;

  if (meta && Object.keys(meta).length > 0) {
    try {
      line += ` ${JSON.stringify(meta)}`;
    } catch {
      line += ` {\"meta\":\"[unserializable]\"}`;
    }
  }

  // stderr to avoid stdout interleaving with curl output
  process.stderr.write(line + '\n');
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write('INFO', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('WARN', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('ERROR', message, meta),
};






