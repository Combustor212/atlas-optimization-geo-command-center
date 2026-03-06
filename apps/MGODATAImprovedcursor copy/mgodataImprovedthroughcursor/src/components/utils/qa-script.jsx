/**
 * QA Script for Google Places Integration
 * 
 * Run these checks in browser console to verify integration:
 * 
 * // 1. API Health Check
 * fetch("/api/places/health").then(r=>r.json()).then(console.log)
 * // Should return: { status: "OK", sample: {...} }
 * 
 * // 2. Autocomplete Test
 * fetch("/api/places/autocomplete", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({
 *     input: "starbucks mason",
 *     sessionToken: "test123",
 *     components: "country:us"
 *   })
 * }).then(r=>r.json()).then(console.log)
 * // Should return: { status: "OK", predictions: [...] }
 * 
 * // 3. Details Test (use place_id from autocomplete)
 * fetch("/api/places/details", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({
 *     placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4", // Example place_id
 *     sessionToken: "test123"
 *   })
 * }).then(r=>r.json()).then(console.log)
 * // Should return: { status: "OK", result: {...} }
 * 
 * // 4. Error Handling Test
 * fetch("/api/places/details", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ placeId: "invalid" })
 * }).then(r=>r.json()).then(console.log)
 * // Should return: { status: "INVALID_REQUEST", error_message: "..." }
 * 
 * // 5. Frontend Component Test
 * // Open GoogleBusinessPicker and type "starbucks" - should see predictions
 * 
 * // 6. Session Token Consistency
 * // Multiple autocomplete calls should use same token, details call should match
 * 
 * // 7. Error Display Test
 * // Temporarily break API key to see error messages in UI
 * 
 * // 8. Scan Integration Test  
 * // Select a place and run scan - should call /api/scan with proper payload
 */

// Quick diagnostic function to run all checks
async function runPlacesQA() {
  console.log("🔍 Running Google Places API QA...");
  
  const tests = [
    {
      name: "Health Check",
      test: async () => {
        const r = await fetch("/api/places/health");
        const data = await r.json();
        return { pass: data.status === "OK", data };
      }
    },
    {
      name: "Autocomplete",
      test: async () => {
        const r = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: "starbucks new york",
            sessionToken: "qa-test-" + Date.now(),
            components: "country:us"
          })
        });
        const data = await r.json();
        return { 
          pass: data.status === "OK" && data.predictions?.length > 0, 
          data 
        };
      }
    },
    {
      name: "Error Handling",
      test: async () => {
        const r = await fetch("/api/places/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId: "invalid-place-id" })
        });
        const data = await r.json();
        return { 
          pass: data.status !== "OK" && data.error_message, 
          data 
        };
      }
    }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(
        `${result.pass ? '✅' : '❌'} ${test.name}:`, 
        result.pass ? 'PASS' : 'FAIL',
        result.data
      );
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`, error);
    }
  }
  
  console.log("🏁 QA Complete");
}

// Export for manual testing
if (typeof window !== 'undefined') {
  window.runPlacesQA = runPlacesQA;
}