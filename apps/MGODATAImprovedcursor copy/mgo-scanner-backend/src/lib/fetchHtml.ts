/**
 * HTML fetching utilities with timeout and user agent
 */
import { fetch as undiciFetch } from 'undici';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_USER_AGENT = process.env.SCANNER_USER_AGENT || 'MGODataScanner/1.0';

export interface FetchOptions {
  timeout?: number;
  userAgent?: string;
  retries?: number;
}

/**
 * Fetch HTML with timeout and retry logic
 */
export async function fetchHtml(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const timeout = options.timeout || DEFAULT_TIMEOUT_MS;
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;
  const maxRetries = options.retries ?? 1;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await undiciFetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        return text;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error('Failed to fetch HTML');
}

/**
 * Extract basic text content from HTML (for debugging/logging)
 */
export function extractTextPreview(html: string, maxLength: number = 500): string {
  // Remove script and style tags
  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.substring(0, maxLength);
}

