// src/features/location/components/LocationWelcome/AnimatedCube.tsx
// Animated cube component for welcome page - larger and rotating with shape-morphing

"use client";

import React, { useMemo, useRef, useState } from "react";
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
 * Rotating cube scene with shape-morphing animation
 */
function RotatingCubeScene({
  spacing = 1,
  allShapes = [],
  cubeColors = [],
}: {
  spacing?: number;
  allShapes?: number[][];
  cubeColors?: string[];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const timeRef = useRef(0);
  const rotationSpeedRef = useRef(0.002);

  const cubeSize = 1;
  const outerCubeSize = 2 * spacing + cubeSize;

  const NORMAL_SPEED = 0.002;
  const FAST_SPEED = 0.015;
  const SPIN_DURATION = 10; // 10 seconds of normal spinning
  const SPEED_UP_DURATION = 1; // 1 second to speed up
  const FADE_DURATION = 0.5; // 0.5 seconds to fade out/in
  const SPEED_DOWN_DURATION = 1; // 1 second to slow down

  // Complex animation cycle
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Always rotate
      groupRef.current.rotation.y += rotationSpeedRef.current;

      // Update time
      timeRef.current += delta;

      const cycleTime = timeRef.current % (SPIN_DURATION + SPEED_UP_DURATION + FADE_DURATION * 2 + SPEED_DOWN_DURATION);

      if (cycleTime < SPIN_DURATION) {
        // Phase 1: Normal spinning (0-10s)
        rotationSpeedRef.current = NORMAL_SPEED;
        setOpacity(1);

      } else if (cycleTime < SPIN_DURATION + SPEED_UP_DURATION) {
        // Phase 2: Speed up (10-11s)
        const speedUpProgress = (cycleTime - SPIN_DURATION) / SPEED_UP_DURATION;
        rotationSpeedRef.current = NORMAL_SPEED + (FAST_SPEED - NORMAL_SPEED) * speedUpProgress;
        setOpacity(1);

      } else if (cycleTime < SPIN_DURATION + SPEED_UP_DURATION + FADE_DURATION) {
        // Phase 3: Fade out while spinning fast (11-11.5s)
        const fadeProgress = (cycleTime - SPIN_DURATION - SPEED_UP_DURATION) / FADE_DURATION;
        rotationSpeedRef.current = FAST_SPEED;
        setOpacity(1 - fadeProgress);

        // Switch shape at the end of fade out
        if (fadeProgress > 0.9 && opacity > 0.5) {
          setCurrentShapeIndex((prev) => (prev + 1) % allShapes.length);
        }

      } else if (cycleTime < SPIN_DURATION + SPEED_UP_DURATION + FADE_DURATION * 2) {
        // Phase 4: Fade in with new shape (11.5-12s)
        const fadeProgress = (cycleTime - SPIN_DURATION - SPEED_UP_DURATION - FADE_DURATION) / FADE_DURATION;
        rotationSpeedRef.current = FAST_SPEED;
        setOpacity(fadeProgress);

      } else {
        // Phase 5: Slow down (12-13s)
        const slowDownProgress = (cycleTime - SPIN_DURATION - SPEED_UP_DURATION - FADE_DURATION * 2) / SPEED_DOWN_DURATION;
        rotationSpeedRef.current = FAST_SPEED - (FAST_SPEED - NORMAL_SPEED) * slowDownProgress;
        setOpacity(1);
      }
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

  const activeIndices = allShapes[currentShapeIndex] || [];

  return (
    <group ref={groupRef}>
      {/* Lighting */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[-5, 5, 0]} intensity={0.7} castShadow />

      {/* Bounding cube */}
      <BoundingCube size={outerCubeSize} />

      {/* Small cubes with opacity */}
      {positions.map((pos, i) => {
        const isVisible = activeIndices.includes(i);
        return isVisible ? (
          <mesh key={i} position={[pos.x, pos.y, pos.z]} castShadow receiveShadow>
            <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
            <meshStandardMaterial
              color={cubeColors[i] || "#888"}
              roughness={0}
              metalness={0}
              emissive={cubeColors[i] || "#888"}
              emissiveIntensity={0.1}
              transparent={true}
              opacity={opacity}
            />
            <lineSegments>
              <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize)]} />
              <lineBasicMaterial attach="material" color="white" opacity={opacity} transparent={true} />
            </lineSegments>
          </mesh>
        ) : null;
      })}
    </group>
  );
}

/**
 * Animated cube visualization for welcome page
 * - No border
 * - 250% larger (zoom: 125 instead of 50)
 * - Rotating with shape-morphing animation
 * - Cycles through all tetris shapes every ~13 seconds
 */
export interface AnimatedCubeProps {
  allShapes: number[][];
  cubeColors: string[];
}

export function AnimatedCube({
  allShapes,
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
            allShapes={allShapes}
            cubeColors={cubeColors}
          />
        </Canvas>
      </div>
    </div>
  );
}
