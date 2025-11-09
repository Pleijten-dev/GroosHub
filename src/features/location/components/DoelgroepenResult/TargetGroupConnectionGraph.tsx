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
 * based on shared facilities from gemeenschappelijke-voorzieningen.json
 */
export const TargetGroupConnectionGraph: React.FC<TargetGroupConnectionGraphProps> = ({
  allPersonas,
  allPersonaScores,
  locale
}) => {
  // Calculate connections between target groups based on shared facilities
  const connections = useMemo(() => {
    // Import facilities data
    const facilities = require('../../data/sources/gemeenschappelijke-voorzieningen.json');

    const connectionMap = new Map<string, number>();

    facilities.forEach((facility: any) => {
      if (facility.suitableForAll) {
        // Connect all groups to each other
        for (let i = 0; i < allPersonas.length; i++) {
          for (let j = i + 1; j < allPersonas.length; j++) {
            const key = `${i}-${j}`;
            connectionMap.set(key, (connectionMap.get(key) || 0) + 1);
          }
        }
      } else {
        // Connect groups mentioned in targetGroups
        const targetGroups = facility.targetGroups || [];
        const indices = targetGroups
          .map((tg: string) => allPersonas.findIndex(p => p.name === tg))
          .filter((idx: number) => idx !== -1);

        for (let i = 0; i < indices.length; i++) {
          for (let j = i + 1; j < indices.length; j++) {
            const [from, to] = indices[i] < indices[j]
              ? [indices[i], indices[j]]
              : [indices[j], indices[i]];
            const key = `${from}-${to}`;
            connectionMap.set(key, (connectionMap.get(key) || 0) + 1);
          }
        }
      }
    });

    // Convert to array
    const connectionsArray: Connection[] = [];
    connectionMap.forEach((count, key) => {
      const [from, to] = key.split('-').map(Number);
      connectionsArray.push({ from, to, count });
    });

    return connectionsArray;
  }, [allPersonas]);

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
      subtitle: 'Gedeelde voorzieningen tussen alle doelgroepen',
      connections: 'verbindingen',
    },
    en: {
      title: 'Target Group Connections',
      subtitle: 'Shared facilities between all target groups',
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
          <span>{locale === 'nl' ? 'Meer gedeelde voorzieningen' : 'More shared facilities'}</span>
        </div>
      </div>
    </div>
  );
};

export default TargetGroupConnectionGraph;
