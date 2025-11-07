// src/features/location/components/DoelgroepenResult/StaticCube.tsx
// Static cube component for displaying target groups without animation

"use client";

import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Locale } from "../../../../lib/i18n/config";
import { PersonaScore } from "../../utils/targetGroupScoring";
import { getPersonaCubePosition } from "../../utils/cubePositionMapping";

interface HousingPersona {
  id: string;
  name: string;
  income_level: string;
  household_type: string;
  age_group: string;
  description: string;
  current_situation: string;
  desired_situation: string;
  current_property_types: string[];
  desired_property_types: string[];
}

/**
 * Individual small cube component with hover effect
 */
function SmallCube({
  position,
  color,
  visible,
  cubeSize = 1,
  personaName,
  onHoverChange,
}: {
  position: [number, number, number];
  color: string;
  visible: boolean;
  cubeSize?: number;
  personaName?: string;
  onHoverChange?: (hovered: boolean, name: string | null) => void;
}) {
  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  return (
    <group position={position}>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={() => {
          setHovered(true);
          if (onHoverChange && personaName) {
            onHoverChange(true, personaName);
          }
        }}
        onPointerLeave={() => {
          setHovered(false);
          if (onHoverChange) {
            onHoverChange(false, null);
          }
        }}
      >
        <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
        <meshStandardMaterial
          color={color}
          roughness={0}
          metalness={0}
          emissive={color}
          emissiveIntensity={hovered ? 0.5 : 0.1}
        />
      </mesh>

      {/* Edge lines - separate from mesh to avoid pointer conflicts */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize)]} />
        <lineBasicMaterial color="white" linewidth={1} />
      </lineSegments>
    </group>
  );
}

/**
 * Outer bounding cube with subdivision wireframes
 */
function BoundingCube({ size }: { size: number }) {
  const lines: number[] = [];
  const half = size / 2;
  const offset1 = -half + size / 3;
  const offset2 = -half + (2 * size) / 3;

  function addLine(start: THREE.Vector3, end: THREE.Vector3) {
    lines.push(start.x, start.y, start.z, end.x, end.y, end.z);
  }

  // Subdivision lines for each face
  // ---- front (z=half)
  addLine(new THREE.Vector3(offset1, -half, half), new THREE.Vector3(offset1, half, half));
  addLine(new THREE.Vector3(offset2, -half, half), new THREE.Vector3(offset2, half, half));
  addLine(new THREE.Vector3(-half, offset1, half), new THREE.Vector3(half, offset1, half));
  addLine(new THREE.Vector3(-half, offset2, half), new THREE.Vector3(half, offset2, half));
  // ---- back (z=-half)
  addLine(new THREE.Vector3(offset1, -half, -half), new THREE.Vector3(offset1, half, -half));
  addLine(new THREE.Vector3(offset2, -half, -half), new THREE.Vector3(offset2, half, -half));
  addLine(new THREE.Vector3(-half, offset1, -half), new THREE.Vector3(half, offset1, -half));
  addLine(new THREE.Vector3(-half, offset2, -half), new THREE.Vector3(half, offset2, -half));
  // ---- left (x=-half)
  addLine(new THREE.Vector3(-half, -half, offset1), new THREE.Vector3(-half, half, offset1));
  addLine(new THREE.Vector3(-half, -half, offset2), new THREE.Vector3(-half, half, offset2));
  addLine(new THREE.Vector3(-half, offset1, -half), new THREE.Vector3(-half, offset1, half));
  addLine(new THREE.Vector3(-half, offset2, -half), new THREE.Vector3(-half, offset2, half));
  // ---- right (x=half)
  addLine(new THREE.Vector3(half, -half, offset1), new THREE.Vector3(half, half, offset1));
  addLine(new THREE.Vector3(half, -half, offset2), new THREE.Vector3(half, half, offset2));
  addLine(new THREE.Vector3(half, offset1, -half), new THREE.Vector3(half, offset1, half));
  addLine(new THREE.Vector3(half, offset2, -half), new THREE.Vector3(half, offset2, half));
  // ---- top (y=half)
  addLine(new THREE.Vector3(offset1, half, -half), new THREE.Vector3(offset1, half, half));
  addLine(new THREE.Vector3(offset2, half, -half), new THREE.Vector3(offset2, half, half));
  addLine(new THREE.Vector3(-half, half, offset1), new THREE.Vector3(half, half, offset1));
  addLine(new THREE.Vector3(-half, half, offset2), new THREE.Vector3(half, half, offset2));
  // ---- bottom (y=-half)
  addLine(new THREE.Vector3(offset1, -half, -half), new THREE.Vector3(offset1, -half, half));
  addLine(new THREE.Vector3(offset2, -half, -half), new THREE.Vector3(offset2, -half, half));
  addLine(new THREE.Vector3(-half, -half, offset1), new THREE.Vector3(half, -half, offset1));
  addLine(new THREE.Vector3(-half, -half, offset2), new THREE.Vector3(half, -half, offset2));

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(lines), 3)
  );

  return (
    <group>
      <mesh>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial
          transparent
          opacity={0.1}
          color={"#ffffff"}
          side={THREE.BackSide}
        />
      </mesh>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial attach="material" color="white" />
      </lineSegments>
    </group>
  );
}

/**
 * Static cube scene (no rotation)
 */
function StaticCubeScene({
  spacing = 1,
  targetGroupIndices = [],
  cubeColors = [],
  indexToPersonaMap = {},
  onCubeHover,
}: {
  spacing?: number;
  targetGroupIndices?: number[];
  cubeColors?: string[];
  indexToPersonaMap?: Record<number, string>;
  onCubeHover?: (personaName: string | null) => void;
}) {
  const cubeSize = 1;
  const outerCubeSize = 2 * spacing + cubeSize;

  const positions = useMemo(() => {
    const posArray: Array<{ x: number; y: number; z: number }> = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          posArray.push({ x: x * spacing, y: y * spacing, z: z * spacing });
        }
      }
    }
    return posArray;
  }, [spacing]);

  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[-5, 5, 0]} intensity={0.7} castShadow />

      {/* Bounding cube */}
      <BoundingCube size={outerCubeSize} />

      {/* Small cubes */}
      {positions.map((pos, i) => (
        <SmallCube
          key={i}
          position={[pos.x, pos.y, pos.z]}
          color={cubeColors[i] || "#888"}
          visible={targetGroupIndices.includes(i)}
          cubeSize={cubeSize}
          personaName={indexToPersonaMap[i]}
          onHoverChange={(hovered, name) => {
            if (onCubeHover) {
              onCubeHover(hovered ? name : null);
            }
          }}
        />
      ))}
    </group>
  );
}

/**
 * Static cube visualization for result display
 * - No rotation
 * - Shows specific target group configuration
 * - Larger size (80 zoom vs 70)
 * - User can orbit with mouse
 * - Hover tooltips showing persona names
 */
export interface StaticCubeProps {
  targetGroupIndices: number[];
  cubeColors: string[];
  allPersonas: HousingPersona[];
  selectedPersonas: PersonaScore[];
  locale: Locale;
  zoom?: number;
}

export function StaticCube({
  targetGroupIndices,
  cubeColors,
  allPersonas,
  selectedPersonas,
  locale,
  zoom = 80,
}: StaticCubeProps): React.JSX.Element {
  const [hoveredPersona, setHoveredPersona] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Create mapping from cube index to persona name
  const indexToPersonaMap = useMemo(() => {
    const map: Record<number, string> = {};

    selectedPersonas.forEach((personaScore) => {
      const persona = allPersonas.find(p => p.id === personaScore.personaId);
      if (!persona) return;

      const { index } = getPersonaCubePosition({
        income_level: persona.income_level,
        age_group: persona.age_group,
        household_type: persona.household_type,
      });

      map[index] = persona.name;
    });

    return map;
  }, [selectedPersonas, allPersonas]);

  // Track mouse position for tooltip
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };
  return (
    <div className="static-cube" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        className="cube-canvas"
        onMouseMove={handleMouseMove}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          background: 'transparent',
          overflow: 'hidden'
        }}
      >
        <Canvas
          orthographic
          camera={{ zoom, position: [-10, 10, -10], near: -100, far: 100 }}
          shadows
        >
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            rotateSpeed={0.5}
          />
          <StaticCubeScene
            spacing={1}
            targetGroupIndices={targetGroupIndices}
            cubeColors={cubeColors}
            indexToPersonaMap={indexToPersonaMap}
            onCubeHover={setHoveredPersona}
          />
        </Canvas>
      </div>

      {/* Mouse-following tooltip */}
      {hoveredPersona && (
        <div
          style={{
            position: 'fixed',
            left: mousePosition.x + 15,
            top: mousePosition.y + 15,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <div className="bg-white text-black px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap border border-gray-200">
            {hoveredPersona}
          </div>
        </div>
      )}
    </div>
  );
}
