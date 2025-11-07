// src/features/location/components/LoadingAnimation/LoadingAnimation.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { AnimatedCube } from '../LocationWelcome/AnimatedCube';
import { TETRIS_SHAPES } from '../../utils/cubePatterns';

interface LoadingAnimationProps {
  locale: Locale;
  cubeColors: string[]; // Shared cube colors for consistency
}

const LOADING_MESSAGES = {
  nl: [
    'Adres geocoderen...',
    'CBS Demografie ophalen...',
    'RIVM Gezondheid ophalen...',
    'CBS Leefbaarheid ophalen...',
    'Politie Veiligheid ophalen...',
    'Google Voorzieningen ophalen...',
    'Altum AI Woningmarkt ophalen...'
  ],
  en: [
    'Geocoding address...',
    'Fetching CBS Demographics...',
    'Fetching RIVM Health...',
    'Fetching CBS Livability...',
    'Fetching Police Safety...',
    'Fetching Google Amenities...',
    'Fetching Altum AI Housing Data...'
  ]
};

/**
 * Loading animation component that orchestrates the cube animation and loading messages
 * Animation stages:
 * 1. Search bar fades out (handled by parent)
 * 2. Cube moves to center
 * 3. Loading messages cycle randomly below cube
 * 4. When data ready, cube completes cycle and transitions to target groups
 */
export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  locale,
  cubeColors
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [messageOpacity, setMessageOpacity] = useState(1);

  // Create randomized message order (no repeats until all shown)
  const shuffledMessages = useMemo(() => {
    const messages = LOADING_MESSAGES[locale];
    const shuffled = [...messages];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [locale]);

  // Cycle through loading messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      // Fade out
      setMessageOpacity(0);

      setTimeout(() => {
        // Switch message
        setCurrentMessageIndex(prev => (prev + 1) % shuffledMessages.length);
        // Fade in
        setMessageOpacity(1);
      }, 400); // Half of transition duration (800ms / 2)
    }, 3500); // Show each message for 3.5 seconds

    return () => clearInterval(messageInterval);
  }, [shuffledMessages.length]);

  const allShapes = useMemo(() => TETRIS_SHAPES, []);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center">
      {/* Cube - centered, 40vh height */}
      <div style={{ height: '40vh', width: '100%', maxWidth: '800px' }} className="mb-8">
        <AnimatedCube
          allShapes={allShapes}
          cubeColors={cubeColors}
        />
      </div>

      {/* Loading message - cycles randomly */}
      <div className="text-center">
        <p
          className="text-lg text-text-secondary transition-opacity duration-[800ms]"
          style={{ opacity: messageOpacity }}
        >
          {shuffledMessages[currentMessageIndex]}
        </p>
      </div>
    </div>
  );
};

export default LoadingAnimation;
