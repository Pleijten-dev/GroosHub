// components/location/DoelgroepenTabContent/CubeVisualization.tsx
// 3D Cube visualization component for doelgroepen selection
// Restored to original styling with split file structure

"use client";

import React, { useState, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, OrbitControlsProps } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

/**
 * Props for CubeVisualization component
 */
export interface CubeVisualizationProps {
  activeIndices: number[];
  cubeColors: string[];
  locale?: 'nl' | 'en';
}

/* ------------------------------------------------------------------
   Original Components: SmallCube, BoundingCube, CubeScene
   ------------------------------------------------------------------ */

/**
 * Individual small cube component (restored from original)
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
 * Outer bounding cube with subdivision wireframes (restored from original)
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
 * Main 3D scene with cubes and bounding structure (restored from original)
 */
function CubeScene({
  spacing = 1,
  activeIndices = [],
  cubeColors = [],
}: {
  spacing?: number;
  activeIndices?: number[];
  cubeColors?: string[];
}) {
  const cubeSize = 1;
  const outerCubeSize = 2 * spacing + cubeSize;

  // Original positioning logic: (-1 to 1) * spacing
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
    <>
      {/* Original lighting setup */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[-5, 5, 0]} intensity={0.7} castShadow />

      {/* Bounding cube with subdivision wireframes */}
      <BoundingCube size={outerCubeSize} />

      {/* Small cubes in 3x3x3 grid */}
      {positions.map((pos, i) => (
        <SmallCube
          key={i}
          position={[pos.x, pos.y, pos.z]}
          color={cubeColors[i] || "#888"}
          visible={activeIndices.includes(i)}
          cubeSize={cubeSize}
        />
      ))}
    </>
  );
}

/**
 * Original SnapBack OrbitControls with lerp animation (restored from original)
 */
function SnapBackOrbitControls(props: OrbitControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);

  const initialPosition = useMemo(() => new THREE.Vector3(-10, 10, -10), []);
  const initialTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(() => {
    if (isSnapping && controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.lerp(initialPosition, 0.1);
      controlsRef.current.target.lerp(initialTarget, 0.1);
      controlsRef.current.update();
      if (camera.position.distanceTo(initialPosition) < 0.1) {
        setIsSnapping(false);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enablePan={false}
      rotateSpeed={1}
      zoomSpeed={1}
      onEnd={() => setIsSnapping(true)}
      {...props}
    />
  );
}

/**
 * Main CubeVisualization component with axis labels
 */
export function CubeVisualization({
  activeIndices,
  cubeColors,
  locale = 'nl'
}: CubeVisualizationProps): React.JSX.Element {
  const labels = locale === 'nl' ? {
    title: '3D Doelgroepen Visualisatie',
    xAxis: 'Inkomen',
    xLow: 'Laag',
    xMid: 'Gemiddeld',
    xHigh: 'Hoog',
    yAxis: 'Leeftijd',
    yYoung: '20-35 jr',
    yMiddle: '35-55 jr',
    ySenior: '55+ jr',
    zAxis: 'Huishouden',
    zSingle: '1-pers',
    zCouple: '2-pers',
    zFamily: 'Gezin',
    controls: 'Sleep om te roteren',
  } : {
    title: '3D Target Groups Visualization',
    xAxis: 'Income',
    xLow: 'Low',
    xMid: 'Medium',
    xHigh: 'High',
    yAxis: 'Age',
    yYoung: '20-35 yrs',
    yMiddle: '35-55 yrs',
    ySenior: '55+ yrs',
    zAxis: 'Household',
    zSingle: 'Single',
    zCouple: 'Couple',
    zFamily: 'Family',
    controls: 'Drag to rotate',
  };

  return (
    <div className="cube-visualization">
      <style jsx>{`
        .cube-visualization {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
        }

        .cube-section-title {
          font-size: 16px;
          margin-bottom: 15px;
          color: #444;
          text-align: center;
          font-weight: 600;
        }

        .cube-container {
          width: 100%;
          height: 350px;
          border: 1px solid #eee;
          border-radius: 8px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          overflow: hidden;
          position: relative;
        }

        .cube-controls {
          margin-top: 15px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }

        .cube-legend {
          margin-top: 15px;
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          gap: 10px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
          font-size: 11px;
        }

        .legend-axis {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .legend-title {
          font-weight: 600;
          color: #333;
          margin-bottom: 2px;
        }

        .legend-value {
          color: #666;
          padding-left: 8px;
        }
      `}</style>

      <h3 className="cube-section-title">{labels.title}</h3>

      <div className="cube-container">
        <Canvas
          orthographic
          camera={{ zoom: 50, position: [-10, 10, -10], near: -100, far: 100 }}
          shadows
        >
          <SnapBackOrbitControls />
          <CubeScene
            spacing={1}
            activeIndices={activeIndices}
            cubeColors={cubeColors}
          />
        </Canvas>
      </div>

      <div className="cube-controls">
        {labels.controls}
      </div>

      <div className="cube-legend">
        <div className="legend-axis">
          <div className="legend-title">← {labels.xAxis} →</div>
          <div className="legend-value">{labels.xLow} | {labels.xMid} | {labels.xHigh}</div>
        </div>
        <div className="legend-axis">
          <div className="legend-title">↓ {labels.yAxis} ↑</div>
          <div className="legend-value">{labels.yYoung} | {labels.yMiddle} | {labels.ySenior}</div>
        </div>
        <div className="legend-axis">
          <div className="legend-title">⊙ {labels.zAxis} ⊙</div>
          <div className="legend-value">{labels.zSingle} | {labels.zCouple} | {labels.zFamily}</div>
        </div>
      </div>
    </div>
  );
}
