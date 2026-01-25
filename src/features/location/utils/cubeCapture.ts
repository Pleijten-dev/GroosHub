/**
 * Cube Capture Utility
 * Renders the 3x3x3 cube visualization off-screen and captures it as an image
 * for PDF export
 */

import * as THREE from 'three';

export interface CubeCaptureOptions {
  /** Target group indices to highlight (0-26 for 3x3x3 cube) */
  targetGroupIndices: number[];
  /** Colors for each cube position */
  cubeColors: string[];
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Background color (default: transparent) */
  backgroundColor?: string | null;
}

export interface CubeCaptureResult {
  /** Base64 encoded PNG data URL */
  dataUrl: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
}

/**
 * Render the cube visualization and capture it as an image
 */
export async function captureCubeVisualization(
  options: CubeCaptureOptions
): Promise<CubeCaptureResult> {
  const {
    targetGroupIndices,
    cubeColors,
    width = 400,
    height = 400,
    backgroundColor = null,
  } = options;

  // Create renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(2); // Higher quality

  // Create scene
  const scene = new THREE.Scene();
  if (backgroundColor) {
    scene.background = new THREE.Color(backgroundColor);
  }

  // Create orthographic camera - zoom value controls apparent size (higher = larger)
  // 160 gives ~20% zoom out compared to 200, showing more context
  const zoom = 160;
  const aspect = width / height;
  const camera = new THREE.OrthographicCamera(
    -width / zoom * aspect,
    width / zoom * aspect,
    height / zoom,
    -height / zoom,
    -100,
    100
  );
  camera.position.set(-10, 10, -10);
  camera.lookAt(0, 0, 0);

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.position.set(-5, 5, 0);
  scene.add(directionalLight);

  // Create cube grid
  const spacing = 1;
  const cubeSize = 1;
  const outerCubeSize = 2 * spacing + cubeSize;

  // Add bounding cube
  addBoundingCube(scene, outerCubeSize);

  // Add small cubes for target groups
  const positions = generateCubePositions(spacing);
  positions.forEach((pos, index) => {
    if (targetGroupIndices.includes(index)) {
      const color = cubeColors[index] || '#888888';
      addSmallCube(scene, [pos.x, pos.y, pos.z], color, cubeSize);
    }
  });

  // Render
  renderer.render(scene, camera);

  // Capture to data URL
  const dataUrl = renderer.domElement.toDataURL('image/png');

  // Clean up
  renderer.dispose();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      if (object.material instanceof THREE.Material) {
        object.material.dispose();
      }
    }
  });

  return {
    dataUrl,
    width,
    height,
  };
}

/**
 * Generate 3x3x3 cube positions
 */
function generateCubePositions(spacing: number): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        positions.push({ x: x * spacing, y: y * spacing, z: z * spacing });
      }
    }
  }
  return positions;
}

/**
 * Add a small cube at the given position
 */
function addSmallCube(
  scene: THREE.Scene,
  position: [number, number, number],
  color: string,
  size: number
): void {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);

  // Main cube mesh
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0,
    metalness: 0,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Edge lines (dark color for visibility on white background)
  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
  const edges = new THREE.LineSegments(edgesGeometry, lineMaterial);
  group.add(edges);

  scene.add(group);
}

/**
 * Add the outer bounding cube with subdivision wireframes
 */
function addBoundingCube(scene: THREE.Scene, size: number): void {
  const half = size / 2;
  const offset1 = -half + size / 3;
  const offset2 = -half + (2 * size) / 3;

  const points: number[] = [];

  function addLine(start: THREE.Vector3, end: THREE.Vector3) {
    points.push(start.x, start.y, start.z, end.x, end.y, end.z);
  }

  // Subdivision lines for each face
  // Front (z=half)
  addLine(new THREE.Vector3(offset1, -half, half), new THREE.Vector3(offset1, half, half));
  addLine(new THREE.Vector3(offset2, -half, half), new THREE.Vector3(offset2, half, half));
  addLine(new THREE.Vector3(-half, offset1, half), new THREE.Vector3(half, offset1, half));
  addLine(new THREE.Vector3(-half, offset2, half), new THREE.Vector3(half, offset2, half));

  // Back (z=-half)
  addLine(new THREE.Vector3(offset1, -half, -half), new THREE.Vector3(offset1, half, -half));
  addLine(new THREE.Vector3(offset2, -half, -half), new THREE.Vector3(offset2, half, -half));
  addLine(new THREE.Vector3(-half, offset1, -half), new THREE.Vector3(half, offset1, -half));
  addLine(new THREE.Vector3(-half, offset2, -half), new THREE.Vector3(half, offset2, -half));

  // Left (x=-half)
  addLine(new THREE.Vector3(-half, -half, offset1), new THREE.Vector3(-half, half, offset1));
  addLine(new THREE.Vector3(-half, -half, offset2), new THREE.Vector3(-half, half, offset2));
  addLine(new THREE.Vector3(-half, offset1, -half), new THREE.Vector3(-half, offset1, half));
  addLine(new THREE.Vector3(-half, offset2, -half), new THREE.Vector3(-half, offset2, half));

  // Right (x=half)
  addLine(new THREE.Vector3(half, -half, offset1), new THREE.Vector3(half, half, offset1));
  addLine(new THREE.Vector3(half, -half, offset2), new THREE.Vector3(half, half, offset2));
  addLine(new THREE.Vector3(half, offset1, -half), new THREE.Vector3(half, offset1, half));
  addLine(new THREE.Vector3(half, offset2, -half), new THREE.Vector3(half, offset2, half));

  // Top (y=half)
  addLine(new THREE.Vector3(offset1, half, -half), new THREE.Vector3(offset1, half, half));
  addLine(new THREE.Vector3(offset2, half, -half), new THREE.Vector3(offset2, half, half));
  addLine(new THREE.Vector3(-half, half, offset1), new THREE.Vector3(half, half, offset1));
  addLine(new THREE.Vector3(-half, half, offset2), new THREE.Vector3(half, half, offset2));

  // Bottom (y=-half)
  addLine(new THREE.Vector3(offset1, -half, -half), new THREE.Vector3(offset1, -half, half));
  addLine(new THREE.Vector3(offset2, -half, -half), new THREE.Vector3(offset2, -half, half));
  addLine(new THREE.Vector3(-half, -half, offset1), new THREE.Vector3(half, -half, offset1));
  addLine(new THREE.Vector3(-half, -half, offset2), new THREE.Vector3(half, -half, offset2));

  // Create line segments
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(points), 3)
  );

  // Grid lines (dark color for visibility on white background)
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x666666 });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lines);

  // Semi-transparent bounding box
  const boxGeometry = new THREE.BoxGeometry(size, size, size);
  const boxMaterial = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.05,
    color: 0x888888,
    side: THREE.BackSide,
  });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  scene.add(box);
}

/**
 * Capture all 4 scenario cubes (3 automatic + 1 custom if available)
 */
export async function captureAllScenarioCubes(
  scenarios: {
    scenario1: number[];
    scenario2: number[];
    scenario3: number[];
    customScenario?: number[];
  },
  cubeColors: string[],
  options?: {
    width?: number;
    height?: number;
    backgroundColor?: string;
  }
): Promise<{
  scenario1: CubeCaptureResult;
  scenario2: CubeCaptureResult;
  scenario3: CubeCaptureResult;
  customScenario?: CubeCaptureResult;
}> {
  const captureOptions = {
    width: options?.width || 400,
    height: options?.height || 400,
    backgroundColor: options?.backgroundColor || '#ffffff',
  };

  const [scenario1, scenario2, scenario3] = await Promise.all([
    captureCubeVisualization({
      ...captureOptions,
      targetGroupIndices: scenarios.scenario1,
      cubeColors,
    }),
    captureCubeVisualization({
      ...captureOptions,
      targetGroupIndices: scenarios.scenario2,
      cubeColors,
    }),
    captureCubeVisualization({
      ...captureOptions,
      targetGroupIndices: scenarios.scenario3,
      cubeColors,
    }),
  ]);

  const result: {
    scenario1: CubeCaptureResult;
    scenario2: CubeCaptureResult;
    scenario3: CubeCaptureResult;
    customScenario?: CubeCaptureResult;
  } = {
    scenario1,
    scenario2,
    scenario3,
  };

  if (scenarios.customScenario && scenarios.customScenario.length > 0) {
    result.customScenario = await captureCubeVisualization({
      ...captureOptions,
      targetGroupIndices: scenarios.customScenario,
      cubeColors,
    });
  }

  return result;
}
