/**
 * Smart Business Search Input - same Google Places autocomplete used in the scanner.
 * Lets users search and select their exact business for accurate lead capture.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGoogleMaps, useAutocompleteService } from '@/components/utils/useGoogleMaps';
import { Check, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BusinessSearchInput({
  value = '',
  onChange,
  onPlaceSelect,
  label = 'Business Name',
  id,
  placeholder,
  className,
  inputClassName,
  disabled = false,
  required = false,
  showSmartSearchBadge = true,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [placeId, setPlaceId] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const { isLoaded: mapsLoaded, error: mapsError } = useGoogleMaps();
  const { getPredictions, isLoaded: autocompleteReady } = useAutocompleteService();

  const fetchSuggestions = useCallback(
    async (query) => {
      if (!query || query.length < 2 || !getPredictions) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      setIsLoadingSuggestions(true);
      try {
        const preds = await getPredictions(query);
        setSuggestions(preds || []);
        setShowDropdown((preds?.length ?? 0) > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [getPredictions]
  );

  const handleSelectPrediction = useCallback(
    (prediction) => {
      const pid = prediction.place_id;
      const displayName = prediction.structured_formatting?.main_text ?? prediction.description ?? '';

      if (!pid) return;

      onChange?.(displayName);
      setPlaceId(pid);
      setShowDropdown(false);
      setSuggestions([]);

      onPlaceSelect?.({ placeId: pid, name: displayName, prediction });
    },
    [onChange, onPlaceSelect]
  );

  const handleInputChange = (e) => {
    const v = e.target.value;
    onChange?.(v);
    if (placeId) {
      setPlaceId(null);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce fetch when user types
  useEffect(() => {
    if (!autocompleteReady || !value || placeId) {
      if (!value || placeId) {
        setSuggestions([]);
        setShowDropdown(false);
      }
      return;
    }
    const t = setTimeout(() => fetchSuggestions(value), 300);
    return () => clearTimeout(t);
  }, [value, placeId, autocompleteReady, fetchSuggestions]);

  const inputId = id || 'business-search';

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {label && (
        <Label htmlFor={inputId} className="block text-slate-700 font-medium mb-2">
          {label}
          {showSmartSearchBadge && (
            <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
              <Sparkles className="w-3 h-3" />
              Smart Search
            </span>
          )}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={
            autocompleteReady
              ? placeholder || "Type to search: e.g., Starbucks Dubai Mall"
              : "Loading search..."
          }
          className={cn(
            "h-11 border-2 rounded-xl",
            placeId && "border-green-300 bg-green-50/30",
            inputClassName
          )}
          autoComplete="off"
          required={required}
          disabled={disabled || !autocompleteReady}
        />
        {(isLoadingSuggestions || (showDropdown && suggestions.length > 0)) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoadingSuggestions ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : null}
          </div>
        )}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-[10000] w-full mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
            {suggestions.map((pred, idx) => (
              <button
                key={pred.place_id ?? idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectPrediction(pred);
                }}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-slate-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="font-semibold text-sm text-slate-900">
                  {pred.structured_formatting?.main_text ?? pred.description}
                </div>
                {pred.structured_formatting?.secondary_text && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    {pred.structured_formatting.secondary_text}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
