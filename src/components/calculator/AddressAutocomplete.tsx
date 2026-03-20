import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
}

export interface AddressSuggestion {
  displayName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onSelect: (result: AddressSuggestion) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapNominatimResult(r: NominatimResult): AddressSuggestion {
  const addr = r.address;
  const houseNumber = addr?.house_number ?? '';
  const road = addr?.road ?? '';
  const street = [houseNumber, road].filter(Boolean).join(' ');
  const city = addr?.city ?? addr?.town ?? addr?.village ?? '';
  const state = addr?.state ?? '';
  const zipCode = addr?.postcode ?? '';

  return {
    displayName: r.display_name,
    street,
    city,
    state,
    zipCode,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Stable fetch function that won't change across renders
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json` +
        `&countrycodes=us&limit=5&addressdetails=1` +
        `&q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      const data: NominatimResult[] = await response.json();
      const mapped = data.map(mapNominatimResult);
      setSuggestions(mapped);
      setIsOpen(mapped.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Close dropdown when clicking outside the component
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Scroll active item into view within the dropdown
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleInputChange = (text: string) => {
    onChange(text);

    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Debounce the fetch by 300ms
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 300);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    // Build a readable address string for the input
    const parts = [suggestion.street, suggestion.city, suggestion.state, suggestion.zipCode].filter(Boolean);
    const addressText = parts.length > 0 ? parts.join(', ') : suggestion.displayName;

    onChange(addressText);
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    onSelect(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex]);
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      }
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      {/* MapPin icon */}
      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />

      {/* Input */}
      <input
        placeholder="Enter address (e.g., 123 Main St, Los Angeles, CA)"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls="address-suggestions"
        aria-activedescendant={
          activeIndex >= 0 ? `address-suggestion-${activeIndex}` : undefined
        }
        className="w-full pl-9 pr-9 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute right-3 top-2.5">
          <svg
            className="w-4 h-4 animate-spin text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id="address-suggestions"
          ref={listRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => {
            const isActive = index === activeIndex;
            const cityStateZip = [
              suggestion.city,
              suggestion.state,
              suggestion.zipCode,
            ]
              .filter(Boolean)
              .join(', ');

            return (
              <li
                key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                id={`address-suggestion-${index}`}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  // Use mouseDown instead of click to fire before the input's
                  // blur event (which would close the dropdown via clickOutside)
                  e.preventDefault();
                  handleSelect(suggestion);
                }}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                <div className="text-sm font-medium truncate">
                  {suggestion.street || suggestion.displayName}
                </div>
                {cityStateZip && (
                  <div className="text-xs text-muted-foreground truncate">
                    {cityStateZip}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
