// API Keys Configuration
// These keys are used directly in the application

// Use environment variables - never commit real keys
export const API_KEYS = {
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  PLACES_API_KEY: import.meta.env.VITE_PLACES_API_KEY || ''
};

// Helper function to get API key (can be extended to read from env vars)
export const getApiKey = (keyName) => {
  return API_KEYS[keyName] || '';
};

// Export individual keys for convenience
export const OPENAI_API_KEY = API_KEYS.OPENAI_API_KEY;
export const PLACES_API_KEY = API_KEYS.PLACES_API_KEY;

