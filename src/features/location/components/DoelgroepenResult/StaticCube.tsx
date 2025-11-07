// src/features/location/components/DoelgroepenResult/StaticCube.tsx
// Static cube component for displaying target groups without animation

"use client";

import React, { useMemo, useState } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
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
 * Individual small cube component with hover tooltip
 */
function SmallCube({
  position,
  color,
  visible,
  cubeSize = 1,
  personaName,
}: {
  position: [number, number, number];
  color: string;
  visible: boolean;
  cubeSize?: number;
  personaName?: string;
}) {
  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  return (
    <group position={position}>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
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

      {/* Tooltip */}
      {hovered && personaName && (
        <Html
          position={[0, cubeSize / 2 + 0.5, 0]}
          center
          distanceFactor={6}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap"
            style={{
              transform: 'translateY(-100%)',
              marginTop: '-8px'
            }}
          >
            {personaName}
          </div>
        </Html>
      )}
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
}: {
  spacing?: number;
  targetGroupIndices?: number[];
  cubeColors?: string[];
  indexToPersonaMap?: Record<number, string>;
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
}

export function StaticCube({
  targetGroupIndices,
  cubeColors,
  allPersonas,
  selectedPersonas,
  locale,
}: StaticCubeProps): React.JSX.Element {
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
  return (
    <div className="static-cube">
      <style jsx>{`
        .static-cube {
          background: transparent;
          padding: 0;
          width: 100%;
          height: 100%;
        }

        .cube-canvas {
          width: 100%;
          height: 100%;
          border-radius: 8px;
          background: transparent;
          overflow: hidden;
        }
      `}</style>

      <div className="cube-canvas">
        <Canvas
          orthographic
          camera={{ zoom: 80, position: [-10, 10, -10], near: -100, far: 100 }}
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
          />
        </Canvas>
      </div>
    </div>
  );
}
