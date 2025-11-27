'use client';

import { useEffect, useState } from 'react';

interface SectionViewProps {
  layers: Array<{
    id: string;
    position: number;
    material_id: string;
    material_name?: string;
    material_category?: string;
    thickness: number; // in meters
    coverage: number;
  }>;
  locale: 'nl' | 'en';
  width?: number;
  maxHeight?: number;
}

/**
 * SectionView - Renders an architectural cross-section of a building assembly
 * Uses Dutch architectural hatching conventions (NEN standards)
 */
export default function SectionView({
  layers,
  locale,
  width = 600,
  maxHeight = 800
}: SectionViewProps) {
  const [scale, setScale] = useState(1000); // pixels per meter

  // Calculate total thickness and appropriate scale
  useEffect(() => {
    const totalThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0);
    if (totalThickness > 0) {
      // Calculate scale to fit in maxHeight (leave some margin)
      const calculatedScale = (maxHeight * 0.9) / totalThickness;
      setScale(calculatedScale);
    }
  }, [layers, maxHeight]);

  const totalThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0);
  const totalHeight = totalThickness * scale;

  const translations = {
    nl: {
      thickness: 'Dikte',
      totalThickness: 'Totale dikte',
      coverage: 'Dekking',
      noLayers: 'Geen lagen toegevoegd'
    },
    en: {
      thickness: 'Thickness',
      totalThickness: 'Total thickness',
      coverage: 'Coverage',
      noLayers: 'No layers added'
    }
  };

  const t = translations[locale];

  if (layers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-base border border-gray-200">
        <p className="text-gray-400">{t.noLayers}</p>
      </div>
    );
  }

  // Map material categories to hatch pattern IDs
  const getCategoryHatch = (category?: string): string => {
    if (!category) return 'none';

    // Handle air cavity
    if (category === 'AIR_CAVITY') return 'air';

    const cat = category.toLowerCase();

    // Concrete and cement-based
    if (cat.includes('concrete') || cat.includes('beton')) return 'concrete';
    if (cat.includes('cement') || cat.includes('mortar')) return 'concrete';

    // Masonry
    if (cat.includes('brick') || cat.includes('steen') || cat.includes('masonry')) return 'brick';
    if (cat.includes('block') || cat.includes('blok')) return 'brick';

    // Timber/Wood
    if (cat.includes('timber') || cat.includes('wood') || cat.includes('hout')) return 'timber';
    if (cat.includes('plywood') || cat.includes('osb') || cat.includes('mdf')) return 'timber';

    // Insulation
    if (cat.includes('insulation') || cat.includes('isolatie') || cat.includes('isolation')) return 'insulation';
    if (cat.includes('mineral wool') || cat.includes('glaswol') || cat.includes('steenwol')) return 'insulation';
    if (cat.includes('eps') || cat.includes('xps') || cat.includes('polyurethaan')) return 'insulation';

    // Steel/Metal
    if (cat.includes('steel') || cat.includes('staal') || cat.includes('metal')) return 'steel';
    if (cat.includes('aluminium') || cat.includes('aluminum')) return 'steel';

    // Glass
    if (cat.includes('glass') || cat.includes('glas')) return 'glass';

    // Plaster/Gypsum
    if (cat.includes('plaster') || cat.includes('gypsum') || cat.includes('gips')) return 'plaster';

    // Waterproofing/Membranes
    if (cat.includes('membrane') || cat.includes('waterproof') || cat.includes('bitumen')) return 'membrane';

    // Stone
    if (cat.includes('stone') || cat.includes('steen') || cat.includes('granite') || cat.includes('marble')) return 'stone';

    // Air gap
    if (cat.includes('air') || cat.includes('lucht') || cat.includes('cavity')) return 'air';

    return 'default';
  };

  // Format thickness for display
  const formatThickness = (meters: number): string => {
    if (meters >= 1) {
      return `${meters.toFixed(2)} m`;
    } else if (meters >= 0.01) {
      return `${(meters * 100).toFixed(0)} cm`;
    } else {
      return `${(meters * 1000).toFixed(0)} mm`;
    }
  };

  let currentY = 0;

  return (
    <div className="space-y-base">
      {/* Header */}
      <div className="flex items-center justify-end text-xs text-gray-500">
        <span>{t.totalThickness}: {formatThickness(totalThickness)}</span>
      </div>

      {/* SVG Section Drawing */}
      <svg
        width={width}
        height={totalHeight + 40}
        className="border border-gray-300 bg-white rounded-base"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Define hatch patterns following Dutch architectural conventions */}
        <defs>
          {/* Concrete - diagonal lines 45° */}
          <pattern id="concrete" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="8" x2="8" y2="0" stroke="#000" strokeWidth="0.5" />
          </pattern>

          {/* Brick - cross-hatching */}
          <pattern id="brick" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="10" x2="10" y2="0" stroke="#000" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="10" y2="10" stroke="#000" strokeWidth="0.5" />
          </pattern>

          {/* Timber - vertical grain with cross lines */}
          <pattern id="timber" x="0" y="0" width="12" height="20" patternUnits="userSpaceOnUse">
            <line x1="3" y1="0" x2="3" y2="20" stroke="#000" strokeWidth="0.5" />
            <line x1="9" y1="0" x2="9" y2="20" stroke="#000" strokeWidth="0.5" />
            <line x1="0" y1="7" x2="12" y2="7" stroke="#000" strokeWidth="0.3" />
            <line x1="0" y1="14" x2="12" y2="14" stroke="#000" strokeWidth="0.3" />
          </pattern>

          {/* Insulation - wavy/zigzag pattern */}
          <pattern id="insulation" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
            <path d="M0,5 L5,2 L10,5 L15,2 L20,5" stroke="#000" strokeWidth="0.6" fill="none" />
            <path d="M0,8 L5,5 L10,8 L15,5 L20,8" stroke="#000" strokeWidth="0.6" fill="none" />
          </pattern>

          {/* Steel - diagonal lines 135° (opposite to concrete) */}
          <pattern id="steel" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="8" y2="8" stroke="#000" strokeWidth="0.6" />
          </pattern>

          {/* Glass - very light diagonal */}
          <pattern id="glass" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="20" x2="20" y2="0" stroke="#888" strokeWidth="0.3" opacity="0.3" />
          </pattern>

          {/* Plaster - light stippling */}
          <pattern id="plaster" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="3" r="0.4" fill="#666" opacity="0.3" />
            <circle cx="7" cy="7" r="0.4" fill="#666" opacity="0.3" />
          </pattern>

          {/* Membrane - horizontal lines */}
          <pattern id="membrane" x="0" y="0" width="10" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="2" x2="10" y2="2" stroke="#000" strokeWidth="0.8" />
          </pattern>

          {/* Stone - irregular pattern */}
          <pattern id="stone" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="4" r="0.8" fill="#444" />
            <circle cx="9" cy="8" r="0.6" fill="#444" />
            <circle cx="12" cy="3" r="0.7" fill="#444" />
            <circle cx="5" cy="11" r="0.5" fill="#444" />
          </pattern>

          {/* Air gap - empty/white */}
          <pattern id="air" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="15" height="15" fill="white" />
          </pattern>

          {/* Default - light diagonal */}
          <pattern id="default" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="10" x2="10" y2="0" stroke="#666" strokeWidth="0.4" opacity="0.5" />
          </pattern>
        </defs>

        {/* Render each layer */}
        {layers.map((layer, index) => {
          const layerHeight = layer.thickness * scale;
          const y = currentY;
          currentY += layerHeight;

          const hatchPattern = getCategoryHatch(layer.material_category);
          const fillUrl = `url(#${hatchPattern})`;

          return (
            <g key={layer.id}>
              {/* Layer rectangle with hatch pattern */}
              <rect
                x="50"
                y={y + 20}
                width={width - 100}
                height={layerHeight}
                fill={hatchPattern === 'air' ? 'white' : fillUrl}
                stroke="#333"
                strokeWidth="1"
              />

              {/* Layer boundary line (emphasized) */}
              <line
                x1="50"
                y1={y + 20}
                x2={width - 50}
                y2={y + 20}
                stroke="#000"
                strokeWidth="1.5"
              />

              {/* Dimension line on the left */}
              <line
                x1="20"
                y1={y + 20}
                x2="20"
                y2={y + 20 + layerHeight}
                stroke="#000"
                strokeWidth="0.5"
              />
              <line x1="15" y1={y + 20} x2="25" y2={y + 20} stroke="#000" strokeWidth="0.5" />
              <line x1="15" y1={y + 20 + layerHeight} x2="25" y2={y + 20 + layerHeight} stroke="#000" strokeWidth="0.5" />

              {/* Thickness label */}
              <text
                x="10"
                y={y + 20 + layerHeight / 2}
                fontSize="9"
                fill="#000"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {formatThickness(layer.thickness)}
              </text>

              {/* Material name label (inside layer if space allows) */}
              {layerHeight > 15 && (
                <text
                  x={width / 2}
                  y={y + 20 + layerHeight / 2}
                  fontSize="10"
                  fill="#000"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontWeight="500"
                >
                  {layer.material_name || `Layer ${index + 1}`}
                </text>
              )}

              {/* Position badge */}
              <circle
                cx={width - 50}
                cy={y + 20 + layerHeight / 2}
                r="10"
                fill="#477638"
                opacity="0.9"
              />
              <text
                x={width - 50}
                y={y + 20 + layerHeight / 2}
                fontSize="9"
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="bold"
              >
                {layer.position}
              </text>

              {/* Coverage indicator (if not 100%) */}
              {layer.coverage < 1 && (
                <text
                  x={width - 80}
                  y={y + 20 + layerHeight / 2}
                  fontSize="8"
                  fill="#666"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {Math.round(layer.coverage * 100)}%
                </text>
              )}
            </g>
          );
        })}

        {/* Bottom boundary line */}
        <line
          x1="50"
          y1={currentY + 20}
          x2={width - 50}
          y2={currentY + 20}
          stroke="#000"
          strokeWidth="2"
        />
      </svg>

      {/* Legend */}
      <div className="text-xs text-gray-600 space-y-xs">
        <div className="font-medium">{locale === 'nl' ? 'Legenda arcering:' : 'Hatch legend:'}</div>
        <div className="grid grid-cols-2 gap-xs text-[10px]">
          <div>• Beton/Concrete: ////</div>
          <div>• Metselwerk/Masonry: XXXX</div>
          <div>• Hout/Timber: ||||</div>
          <div>• Isolatie/Insulation: ∼∼∼</div>
          <div>• Staal/Steel: \\\\\\</div>
          <div>• Membraan/Membrane: ═══</div>
        </div>
      </div>
    </div>
  );
}
