// src/features/location/components/DoelgroepenResult/TargetGroupConnectionGraph.tsx
'use client';

import React, { useMemo } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { PersonaScore } from '../../utils/targetGroupScoring';

interface HousingPersona {
  id: string;
  name: string;
  income_level: string;
  household_type: string;
  age_group: string;
}

interface TargetGroupConnectionGraphProps {
  allPersonas: HousingPersona[];
  allPersonaScores: PersonaScore[];
  locale: Locale;
}

interface Connection {
  from: number;
  to: number;
  count: number;
}

/**
 * Circular connection graph showing relationships between all 27 target groups
 * based on shared characteristics and scoring similarity
 */
export const TargetGroupConnectionGraph: React.FC<TargetGroupConnectionGraphProps> = ({
  allPersonas,
  allPersonaScores,
  locale
}) => {
  // Calculate connections between target groups based on similarity
  const connections = useMemo(() => {
    const connectionMap = new Map<string, number>();

    // Calculate connections based on similar characteristics
    for (let i = 0; i < allPersonas.length; i++) {
      for (let j = i + 1; j < allPersonas.length; j++) {
        const persona1 = allPersonas[i];
        const persona2 = allPersonas[j];

        // Count shared characteristics
        let sharedCount = 0;

        if (persona1.income_level === persona2.income_level) sharedCount += 3;
        if (persona1.household_type === persona2.household_type) sharedCount += 3;
        if (persona1.age_group === persona2.age_group) sharedCount += 3;

        // Also consider scoring similarity
        const score1 = allPersonaScores.find(ps => ps.personaId === persona1.id);
        const score2 = allPersonaScores.find(ps => ps.personaId === persona2.id);

        if (score1 && score2) {
          // Normalize scores and calculate similarity (closer scores = stronger connection)
          const scoreDiff = Math.abs(score1.weightedTotal - score2.weightedTotal);
          const maxDiff = 100; // Assume max difference is 100
          const scoreSimilarity = Math.max(0, maxDiff - scoreDiff) / maxDiff;
          sharedCount += Math.floor(scoreSimilarity * 5); // Add 0-5 points based on score similarity
        }

        // Only add connection if there's some similarity
        if (sharedCount > 0) {
          const key = `${i}-${j}`;
          connectionMap.set(key, sharedCount);
        }
      }
    }

    // Convert to array
    const connectionsArray: Connection[] = [];
    connectionMap.forEach((count, key) => {
      const [from, to] = key.split('-').map(Number);
      connectionsArray.push({ from, to, count });
    });

    return connectionsArray;
  }, [allPersonas, allPersonaScores]);

  // Calculate positions for nodes in a circle
  const nodePositions = useMemo(() => {
    const centerX = 400;
    const centerY = 400;
    const radius = 300;
    const angleStep = (2 * Math.PI) / allPersonas.length;

    return allPersonas.map((_, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }, [allPersonas]);

  // Find max connection count for scaling line thickness
  const maxConnections = useMemo(() => {
    return Math.max(...connections.map(c => c.count), 1);
  }, [connections]);

  const translations = {
    nl: {
      title: 'Verbanden tussen Doelgroepen',
      subtitle: 'Verbindingen op basis van gedeelde kenmerken en score-overeenkomsten',
      connections: 'verbindingen',
    },
    en: {
      title: 'Target Group Connections',
      subtitle: 'Connections based on shared characteristics and score similarity',
      connections: 'connections',
    }
  };

  const t = translations[locale];

  return (
    <div className="w-full h-full flex flex-col items-center p-6">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
        <p className="text-sm text-gray-600">{t.subtitle}</p>
      </div>

      <div className="flex-1 flex items-center justify-center w-full">
        <svg width="800" height="800" viewBox="0 0 800 800" className="max-w-full max-h-full">
          {/* Draw connections first (behind nodes) */}
          <g>
            {connections.map((conn, idx) => {
              const from = nodePositions[conn.from];
              const to = nodePositions[conn.to];
              const thickness = 0.5 + (conn.count / maxConnections) * 4; // 0.5 to 4.5px
              const opacity = 0.1 + (conn.count / maxConnections) * 0.4; // 0.1 to 0.5

              return (
                <line
                  key={idx}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#6e8154"
                  strokeWidth={thickness}
                  opacity={opacity}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* Draw nodes */}
          <g>
            {allPersonas.map((persona, index) => {
              const pos = nodePositions[index];
              const personaScore = allPersonaScores.find(ps => ps.personaId === persona.id);
              const rankPosition = personaScore?.rRankPosition || 999;

              // Color based on rank
              const fillColor = rankPosition <= 4
                ? '#8f9c66' // Top 4 - brighter green
                : '#6e8154'; // Others - medium green

              return (
                <g key={persona.id}>
                  {/* Node circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={12}
                    fill={fillColor}
                    stroke="white"
                    strokeWidth={2}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <title>{persona.name}</title>
                  </circle>

                  {/* Label */}
                  <text
                    x={pos.x}
                    y={pos.y < 400 ? pos.y - 20 : pos.y + 25}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#374151"
                    className="pointer-events-none select-none"
                    style={{ fontWeight: rankPosition <= 4 ? 600 : 400 }}
                  >
                    {persona.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#8f9c66] border-2 border-white"></div>
          <span>{locale === 'nl' ? 'Top 4 doelgroepen' : 'Top 4 target groups'}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="40" height="4">
            <line x1="0" y1="2" x2="40" y2="2" stroke="#6e8154" strokeWidth="4" opacity="0.5" strokeLinecap="round" />
          </svg>
          <span>{locale === 'nl' ? 'Sterkere overeenkomsten' : 'Stronger similarity'}</span>
        </div>
      </div>
    </div>
  );
};

export default TargetGroupConnectionGraph;
