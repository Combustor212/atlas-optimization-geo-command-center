/**
 * Citation directory provider stub.
 * Future: integrate directory scanning (BrightLocal, Whitespark, manual crawl, etc.).
 * No external API calls for now.
 */

export interface DirectoryScanResult {
  directory_name: string
  url: string | null
  status: 'present' | 'missing' | 'duplicate' | 'incorrect'
  nap_snapshot: {
    name?: string
    address?: string
    phone?: string
    website?: string
  }
}

/**
 * Stub: no external calls. Returns empty list.
 * Replace with real directory scan when integrating a provider.
 */
export async function scanDirectoriesForLocation(
  _locationId: string,
  _directories: string[]
): Promise<DirectoryScanResult[]> {
  return []
}
