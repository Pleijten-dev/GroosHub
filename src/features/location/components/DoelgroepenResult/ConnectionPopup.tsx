// src/features/location/components/DoelgroepenResult/ConnectionPopup.tsx
'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { PersonaScore } from '../../utils/targetGroupScoring';
import { Connection, getTopConnectionsForPersona } from '../../utils/connectionCalculations';

interface HousingPersona {
  id: string;
  name: string;
  income_level: string;
  household_type: string;
  age_group: string;
}

interface ConnectionPopupProps {
  persona: HousingPersona;
  personaScore: PersonaScore;
  allPersonas: HousingPersona[];
  allPersonaScores: PersonaScore[];
  connections: Connection[];
  selectedPersonaIds: string[];
  onSelectPersona: (personaId: string) => void;
  onClose: () => void;
  locale: Locale;
}

export const ConnectionPopup: React.FC<ConnectionPopupProps> = ({
  persona,
  personaScore,
  allPersonas,
  allPersonaScores,
  connections,
  selectedPersonaIds,
  onSelectPersona,
  onClose,
  locale
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Find persona index
  const personaIndex = allPersonaScores.findIndex(ps => ps.personaId === persona.id);

  // Get top 5 connections sorted by R-rank
  const top5Connections = useMemo(() => {
    if (personaIndex === -1) return [];

    const topConnections = getTopConnectionsForPersona(personaIndex, connections, 5);

    // Map to personas and scores, then sort by R-rank
    return topConnections
      .map(conn => {
        const connPersona = allPersonas[conn.index];
        const connScore = allPersonaScores[conn.index];
        return {
          persona: connPersona,
          score: connScore,
          connectionStrength: conn.count,
          index: conn.index
        };
      })
      .sort((a, b) => a.score.rRankPosition - b.score.rRankPosition);
  }, [personaIndex, connections, allPersonas, allPersonaScores]);

  // Calculate shared connections for each connection
  const sharedConnectionsMap = useMemo(() => {
    const map = new Map<number, number>();

    // Get indices of already selected personas
    const selectedIndices = selectedPersonaIds
      .map(id => allPersonaScores.findIndex(ps => ps.personaId === id))
      .filter(idx => idx !== -1);

    // For each connection, count how many selected personas it also connects to
    top5Connections.forEach(conn => {
      let sharedCount = 0;

      selectedIndices.forEach(selectedIdx => {
        // Check if there's a connection between this connection and the selected persona
        const hasConnection = connections.some(c =>
          (c.from === conn.index && c.to === selectedIdx) ||
          (c.to === conn.index && c.from === selectedIdx)
        );
        if (hasConnection) sharedCount++;
      });

      map.set(conn.index, sharedCount);
    });

    return map;
  }, [top5Connections, selectedPersonaIds, allPersonaScores, connections]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const translations = {
    nl: {
      title: 'Top 5 verbindingen voor',
      rRank: 'R-Rank',
      select: 'Selecteer',
      selected: 'Geselecteerd',
      sharedConnections: 'gedeelde verbindingen'
    },
    en: {
      title: 'Top 5 connections for',
      rRank: 'R-Rank',
      select: 'Select',
      selected: 'Selected',
      sharedConnections: 'shared connections'
    }
  };

  const t = translations[locale];

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={popupRef}
        className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-md animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{persona.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 6L18 18M18 6L6 18" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-medium">
              {t.rRank} #{personaScore.rRankPosition}
            </span>
            <span className="text-gray-600">
              {(personaScore.rRank * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Connection list */}
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {top5Connections.map((conn, idx) => {
            const isSelected = selectedPersonaIds.includes(conn.persona.id);
            const sharedCount = sharedConnectionsMap.get(conn.index) || 0;

            return (
              <button
                key={conn.persona.id}
                onClick={() => onSelectPersona(conn.persona.id)}
                className={`
                  w-full p-3 rounded-lg border-2 transition-all text-left
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">#{idx + 1}</span>
                      <span className="font-medium text-gray-900">{conn.persona.name}</span>
                      {isSelected && (
                        <span className="ml-auto text-xs font-medium text-blue-600">
                          {t.selected}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
                      <span>{t.rRank} #{conn.score.rRankPosition}</span>
                      {sharedCount > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="flex gap-0.5">
                            {Array.from({ length: Math.min(sharedCount, 5) }).map((_, i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-green-500"
                              />
                            ))}
                          </div>
                          <span className="text-green-600">
                            {sharedCount} {t.sharedConnections}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 text-center">
          {locale === 'nl'
            ? 'Klik op een doelgroep om deze te selecteren. Klik buiten dit venster om te sluiten.'
            : 'Click on a target group to select it. Click outside to close.'
          }
        </div>
      </div>
    </div>
  );
};
