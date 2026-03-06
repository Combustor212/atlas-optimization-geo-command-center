/**
 * Extract target business placeId from scan data
 * Checks multiple possible locations to find the first valid placeId
 * 
 * @param {Object} scanData - Scan results data
 * @returns {string|null} - placeId or null if not found
 */
export function getTargetPlaceId(scanData) {
  if (!scanData) return null;

  // Check common locations for placeId in order of likelihood
  const possiblePaths = [
    scanData?.business?.place_id,           // Most common
    scanData?.business?.placeId,
    scanData?.placeId,
    scanData?.places?.placeId,
    scanData?.gbp?.placeId,
    scanData?.geo?.target?.placeId,         // From GEO benchmark response
    scanData?.location?.placeId,
    scanData?.place?.id,
    scanData?.place?.placeId
  ];

  // Return first valid placeId found
  for (const path of possiblePaths) {
    if (typeof path === 'string' && path.trim().length > 0) {
      return path.trim();
    }
  }

  // DEV warning if no placeId found
  if (import.meta.env.DEV) {
    console.warn('[getTargetPlaceId] No placeId found in scanData', {
      hasScanned: !!scanData,
      hasBusiness: !!scanData?.business,
      businessKeys: scanData?.business ? Object.keys(scanData.business) : [],
      topLevelKeys: scanData ? Object.keys(scanData) : []
    });
  }

  return null;
}


