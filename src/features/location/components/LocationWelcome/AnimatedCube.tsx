// src/features/location/components/LocationWelcome/AnimatedCube.tsx
// Animated cube component for welcome page - larger and rotating

"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Individual small cube component
 */
function SmallCube({
  position,
  color,
  visible,
  cubeSize = 1,
}: {
  position: [number, number, number];
  color: string;
  visible: boolean;
  cubeSize?: number;
}) {
  if (!visible) return null;
  const boxGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
      <meshStandardMaterial
        color={color}
        roughness={0}
        metalness={0}
        emissive={color}
        emissiveIntensity={0.1}
      />
      <lineSegments>
        <edgesGeometry attach="geometry" args={[boxGeo]} />
        <lineBasicMaterial attach="material" color="white" />
      </lineSegments>
    </mesh>
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
 * Rotating cube scene
 */
function RotatingCubeScene({
  spacing = 1,
  activeIndices = [],
  cubeColors = [],
}: {
  spacing?: number;
  activeIndices?: number[];
  cubeColors?: string[];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const cubeSize = 1;
  const outerCubeSize = 2 * spacing + cubeSize;

  // Slow rotation animation
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002; // Slow rotation around Y axis
    }
  });

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
    <group ref={groupRef}>
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
          visible={activeIndices.includes(i)}
          cubeSize={cubeSize}
        />
      ))}
    </group>
  );
}

/**
 * Animated cube visualization for welcome page
 * - No border
 * - 250% larger (zoom: 125 instead of 50)
 * - Slowly rotating
 */
export interface AnimatedCubeProps {
  activeIndices: number[];
  cubeColors: string[];
}

export function AnimatedCube({
  activeIndices,
  cubeColors,
}: AnimatedCubeProps): React.JSX.Element {
  return (
    <div className="animated-cube">
      <style jsx>{`
        .animated-cube {
          background: transparent;
          padding: 0;
          width: 100%;
          height: 600px;
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
          camera={{ zoom: 125, position: [-10, 10, -10], near: -100, far: 100 }}
          shadows
        >
          <RotatingCubeScene
            spacing={1}
            activeIndices={activeIndices}
            cubeColors={cubeColors}
          />
        </Canvas>
      </div>
    </div>
  );
}
