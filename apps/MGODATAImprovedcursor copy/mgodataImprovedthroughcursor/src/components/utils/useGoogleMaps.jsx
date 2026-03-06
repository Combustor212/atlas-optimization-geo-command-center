import { useState, useEffect, useRef, useCallback } from 'react';

// Global state
let globalLoadingPromise = null;
let globalIsLoaded = false;
let globalError = null;
let cachedApiKey = null;

// ============================================================================
// API KEY LOADER
// ============================================================================
export async function loadGoogleMapsApiKey(forceReload = false) {
  if (cachedApiKey && !forceReload) {
    return cachedApiKey;
  }

  if (forceReload) {
    cachedApiKey = null;
  }

  try {
    // Get API key from config
    const { PLACES_API_KEY } = await import('@/config/apiKeys');
    const apiKey = PLACES_API_KEY;
    
    if (apiKey && apiKey.length > 0) {
      cachedApiKey = apiKey;
    } else {
      cachedApiKey = "";
    }
    
    return cachedApiKey;
  } catch (error) {
    // Silent failure - return empty string
    return "";
  }
}

// Helper function to reset and reload everything
export function resetGoogleMaps() {
  globalLoadingPromise = null;
  globalIsLoaded = false;
  globalError = null;
  cachedApiKey = null;
  
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  if (window.initGoogleMaps) {
    delete window.initGoogleMaps;
  }
}

// ============================================================================
// SCRIPT LOADER - with places library
// ============================================================================
function loadGoogleMapsScript() {
  if (globalLoadingPromise) {
    return globalLoadingPromise;
  }

  if (globalIsLoaded) {
    return Promise.resolve();
  }

  if (globalError) {
    return Promise.reject(globalError);
  }

  globalLoadingPromise = new Promise(async (resolve, reject) => {
    try {
      if (window.google && window.google.maps && window.google.maps.places) {
        globalIsLoaded = true;
        globalLoadingPromise = null;
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        const timeout = setTimeout(() => {
          globalError = new Error("Script load timeout");
          globalLoadingPromise = null;
          reject(globalError);
        }, 15000);

        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            clearInterval(checkLoaded);
            clearTimeout(timeout);
            globalIsLoaded = true;
            globalLoadingPromise = null;
            resolve();
          }
        }, 100);
        return;
      }

      const key = await loadGoogleMapsApiKey(true);
      
      if (!key || key.length === 0) {
        // Silent failure - don't throw error
        globalError = new Error("API key not available");
        globalLoadingPromise = null;
        reject(globalError);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      window.initGoogleMaps = () => {
        globalIsLoaded = true;
        globalLoadingPromise = null;
        resolve();
      };

      const timeout = setTimeout(() => {
        globalError = new Error("Script load timeout");
        globalLoadingPromise = null;
        reject(globalError);
      }, 15000);

      script.onerror = (error) => {
        clearTimeout(timeout);
        globalError = new Error("Script load failed");
        globalLoadingPromise = null;
        reject(globalError);
      };

      document.head.appendChild(script);
    } catch (error) {
      globalError = error;
      globalLoadingPromise = null;
      reject(error);
    }
  });

  return globalLoadingPromise;
}

// ============================================================================
// REACT HOOK
// ============================================================================
export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(globalIsLoaded);
  const [error, setError] = useState(globalError);
  const [isLoading, setIsLoading] = useState(!globalIsLoaded && !globalError);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    if (globalIsLoaded) {
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    if (globalError) {
      setError(globalError);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    loadGoogleMapsScript()
      .then(() => {
        if (isMounted.current) {
          setIsLoaded(true);
          setIsLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        // Silent failure - just set error state without logging
        if (isMounted.current) {
          setError(err);
          setIsLoading(false);
          setIsLoaded(false);
        }
      });

    return () => {
      isMounted.current = false;
    };
  }, []);

  return { isLoaded, error, isLoading };
}

// Helper to extract address components
function extractComponent(components, type, useShort = false) {
  if (!components) return '';
  const component = components.find(c => c.types.includes(type));
  return component ? (useShort ? component.short_name : component.long_name) : '';
}

// ============================================================================
// ENHANCED AUTOCOMPLETE HOOK - GLOBAL, NO RESTRICTIONS
// ============================================================================
export function usePlacesAutocomplete(inputRef, onPlaceSelected, options = {}) {
  const { isLoaded } = useGoogleMaps();
  const autocompleteRef = useRef(null);
  const listenerRef = useRef(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onPlaceSelectedRef.current = onPlaceSelected;

  useEffect(() => {
    if (!isLoaded || !inputRef?.current) {
      return;
    }

    if (!window.google?.maps?.places) {
      return;
    }

    const input = inputRef.current;

    try {
      if (autocompleteRef.current) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        } catch (e) {
          // Silent cleanup
        }
        autocompleteRef.current = null;
      }

      const autocompleteOptions = {
        fields: ['place_id', 'name', 'formatted_address', 'address_components', 'geometry', 'types', 'international_phone_number'],
        types: options.types || ['establishment'],
        ...options
      };

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        input,
        autocompleteOptions
      );

      listenerRef.current = autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();

        if (!place || !place.place_id) {
          return;
        }

        const placeData = {
          business_name: place.name || '',
          city: extractComponent(place.address_components, 'locality'),
          state: extractComponent(place.address_components, 'administrative_area_level_1', true),
          country: extractComponent(place.address_components, 'country'),
          zip: extractComponent(place.address_components, 'postal_code'),
          address: place.formatted_address || '',
          phone: place.international_phone_number || '',
          place_id: place.place_id,
          geometry: place.geometry,
          types: place.types || []
        };

        const cb = onPlaceSelectedRef.current;
        if (cb) cb(placeData);
      });

      return () => {
        if (listenerRef.current) {
          try {
            window.google.maps.event.removeListener(listenerRef.current);
          } catch (e) {
            // Silent cleanup
          }
        }

        if (autocompleteRef.current) {
          try {
            window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          } catch (e) {
            // Silent cleanup
          }
          autocompleteRef.current = null;
        }
      };

    } catch (error) {
      // Silent failure - autocomplete just won't work
    }

  }, [isLoaded, inputRef, options.types]);

  return { isLoaded };
}

// ============================================================================
// Manual Autocomplete Service (fallback if widget doesn't work)
// ============================================================================
export function useAutocompleteService() {
  const { isLoaded } = useGoogleMaps();
  const serviceRef = useRef(null);
  const [isServiceReady, setIsServiceReady] = useState(false);

  useEffect(() => {
    if (isLoaded && window.google?.maps?.places) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
      setIsServiceReady(true);
    } else {
      setIsServiceReady(false);
    }
  }, [isLoaded]);

  const getPredictions = useCallback(async (input, options = {}) => {
    if (!serviceRef.current) {
      return [];
    }

    return new Promise((resolve, reject) => {
      serviceRef.current.getPlacePredictions(
        {
          input,
          types: ['establishment'],
          ...options
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            resolve(predictions || []);
          } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            reject(new Error(`Autocomplete failed: ${status}`));
          }
        }
      );
    });
  }, []);

  return { getPredictions, isLoaded: isLoaded && isServiceReady };
}