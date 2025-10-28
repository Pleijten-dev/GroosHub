// src/features/location/components/AddressAutocomplete/AddressAutocomplete.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../../../../shared/components/UI';
import { cn } from '../../../../shared/utils/cn';

/**
 * PDOK Suggest API Response
 */
interface PDOKSuggestResponse {
  response: {
    docs: Array<{
      id: string;
      weergavenaam: string;
      type: string;
      score: number;
    }>;
  };
}

export interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (address: string) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  onKeyPress,
  placeholder = 'Enter address...',
  disabled = false,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Fetch suggestions from PDOK Suggest API
   */
  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    try {
      setIsLoading(true);
      const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(query)}&rows=10&fq=type:adres`;

      const response = await fetch(url);
      const data: PDOKSuggestResponse = await response.json();

      if (data.response.docs && data.response.docs.length > 0) {
        const addressSuggestions = data.response.docs
          .map((doc) => doc.weergavenaam)
          .filter((name) => name && name.trim().length > 0);

        setSuggestions(addressSuggestions);
        setShowDropdown(addressSuggestions.length > 0);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle input change with debouncing
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced fetch
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300); // 300ms debounce
  };

  /**
   * Handle suggestion selection
   */
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);

    if (onSelect) {
      onSelect(suggestion);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (onKeyPress) {
        onKeyPress(e);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (onKeyPress) {
          onKeyPress(e);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;

      default:
        if (onKeyPress) {
          onKeyPress(e);
        }
    }
  };

  /**
   * Handle click outside to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion}-${index}`}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                'w-full text-left px-md py-sm text-sm transition-colors',
                'hover:bg-primary-light hover:text-primary',
                'focus:bg-primary-light focus:text-primary focus:outline-none',
                index === selectedIndex && 'bg-primary-light text-primary',
                index === 0 && 'rounded-t-md',
                index === suggestions.length - 1 && 'rounded-b-md'
              )}
            >
              {suggestion}
            </button>
          ))}

          {isLoading && (
            <div className="px-md py-sm text-sm text-text-muted text-center">
              Loading...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
