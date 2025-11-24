// src/features/location/components/DoelgroepenResult/TargetGroupConnectionGraph.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { PersonaScore } from '../../utils/targetGroupScoring';
import { calculateConnections, getTopConnectionsForPersona, Connection } from '../../utils/connectionCalculations';

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

/**
 * Circular connection graph showing relationships between all 27 target groups
 * based on shared characteristics and scoring similarity
 */
export const TargetGroupConnectionGraph: React.FC<TargetGroupConnectionGraphProps> = ({
  allPersonas,
  allPersonaScores,
  locale
}) => {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  // Calculate connections between target groups based on shared amenities
  const connections = useMemo(() => {
    return calculateConnections(allPersonas);
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

  // Get top 5 connections for hovered/selected node (for node opacity control)
  const top5ConnectionIndices = useMemo(() => {
    const activeNode = selectedNode !== null ? selectedNode : hoveredNode;
    if (activeNode === null) return new Set<number>();

    const nodeConnections = getTopConnectionsForPersona(activeNode, connections, 5);
    return new Set(nodeConnections.map(conn => conn.index));
  }, [hoveredNode, selectedNode, connections]);

  // Get top 5 connections for selected node (for side panel)
  const topConnections = useMemo(() => {
    if (selectedNode === null) return null;

    const nodeConnections = getTopConnectionsForPersona(selectedNode, connections, 5);

    return nodeConnections.map(conn => {
      return {
        persona: allPersonas[conn.index],
        count: conn.count,
        index: conn.index
      };
    });
  }, [selectedNode, connections, allPersonas]);

  const translations = {
    nl: {
      title: 'Verbanden tussen Doelgroepen',
      subtitle: 'Verbindingen op basis van gedeelde voorzieningen en ruimtes',
      connections: 'verbindingen',
    },
    en: {
      title: 'Target Group Connections',
      subtitle: 'Connections based on shared amenities and spaces',
      connections: 'connections',
    }
  };

  const t = translations[locale];

  return (
    <div className="w-full h-full flex flex-col p-6">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
        <p className="text-sm text-gray-600">{t.subtitle}</p>
      </div>

      <div className="flex-1 flex items-start gap-6 w-full min-h-0">
        {/* Graph container */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <svg width="800" height="800" viewBox="0 0 800 800" className="max-w-full max-h-full">
          {/* Draw connections first (behind nodes) */}
          <g>
            {connections.map((conn, idx) => {
              const from = nodePositions[conn.from];
              const to = nodePositions[conn.to];

              // Cap connection count at 20 for thickness calculation
              const cappedCount = Math.min(conn.count, 20);
              const maxConnectionsCapped = Math.min(maxConnections, 20);

              // Use exponential scale for thickness - makes weak connections much thinner
              const normalizedStrength = cappedCount / maxConnectionsCapped;
              const thickness = 0.2 + Math.pow(normalizedStrength, 2) * 5; // 0.2 to 5.2px (exponential)
              const baseOpacity = 0.05 + Math.pow(normalizedStrength, 1.5) * 0.5; // 0.05 to 0.55 (power scale)

              // Check if this connection is related to hovered or selected node
              const activeNode = selectedNode !== null ? selectedNode : hoveredNode;
              const isRelated = activeNode !== null && (conn.from === activeNode || conn.to === activeNode);
              const shouldFade = activeNode !== null && !isRelated;

              // Apply opacity based on hover state
              const opacity = shouldFade ? baseOpacity * 0.1 : baseOpacity;
              const strokeColor = isRelated ? '#8f9c66' : '#6e8154';

              return (
                <line
                  key={idx}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={strokeColor}
                  strokeWidth={thickness}
                  opacity={opacity}
                  strokeLinecap="round"
                  className="transition-opacity duration-300"
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

              // Determine active state and opacity
              const activeNode = selectedNode !== null ? selectedNode : hoveredNode;
              const isActive = index === activeNode;
              const isInTop5Connections = top5ConnectionIndices.has(index);

              // When hovering/selecting, only show active node and its top 5 connections at full opacity
              let nodeOpacity = 1;
              if (activeNode !== null && !isActive && !isInTop5Connections) {
                nodeOpacity = 0.1; // Fade out nodes that aren't the active node or in its top 5 connections
              }

              // Color based on rank and selection state
              const isTopRanked = rankPosition <= 5;
              const baseColor = isTopRanked
                ? '#8f9c66' // Top 5 R-rank - brighter green
                : '#6e8154'; // Others - medium green
              const fillColor = isActive ? '#b0b877' : baseColor;

              return (
                <g key={persona.id} opacity={nodeOpacity}>
                  {/* Node circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isActive ? 14 : 12}
                    fill={fillColor}
                    stroke="white"
                    strokeWidth={isActive ? 3 : 2}
                    className="cursor-pointer transition-all duration-300"
                    onMouseEnter={() => setHoveredNode(index)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(index === selectedNode ? null : index)}
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
                    style={{ fontWeight: isActive || isTopRanked ? 600 : 400 }}
                  >
                    {persona.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-col items-center gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#8f9c66] border-2 border-white"></div>
            <span>{locale === 'nl' ? 'Top 5 R-rank doelgroepen' : 'Top 5 R-rank groups'}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="40" height="4">
              <line x1="0" y1="2" x2="40" y2="2" stroke="#6e8154" strokeWidth="4" opacity="0.5" strokeLinecap="round" />
            </svg>
            <span>{locale === 'nl' ? 'Meer gedeelde voorzieningen' : 'More shared amenities'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{locale === 'nl' ? 'Tip: Hover/klik om top 5 verbindingen te zien' : 'Tip: Hover/click to see top 5 connections'}</span>
          </div>
        </div>
      </div>

        {/* Top connections panel - right side */}
        {topConnections && selectedNode !== null && (
          <div className="w-80 flex-shrink-0 bg-white/80 backdrop-blur-md rounded-lg border border-gray-200 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {locale === 'nl' ? 'Top 5 verbindingen voor' : 'Top 5 connections for'} {allPersonas[selectedNode].name}
              </h4>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                  <path d="M4 4L12 12M12 4L4 12" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {topConnections.map((conn, idx) => (
                <div
                  key={conn.index}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setSelectedNode(conn.index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 w-4">#{idx + 1}</span>
                    <span className="text-sm text-gray-900">{conn.persona.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1 bg-[#8f9c66] rounded-full"
                      style={{ width: `${(conn.count / maxConnections) * 40}px` }}
                    ></div>
                    <span className="text-xs text-gray-600">{conn.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TargetGroupConnectionGraph;
