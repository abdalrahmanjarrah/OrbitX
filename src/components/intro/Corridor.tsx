import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CORRIDOR_LENGTH = 120;
const CORRIDOR_WIDTH = 6;
const CORRIDOR_HEIGHT = 4;
const SEGMENT_SIZE = 2;

export function Corridor() {
  const groupRef = useRef<THREE.Group>(null);

  const { floorGeo, wallGeo, ceilingGeo } = useMemo(() => {
    const floor = new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_LENGTH, 1, CORRIDOR_LENGTH / SEGMENT_SIZE);
    floor.rotateX(-Math.PI / 2);

    const wall = new THREE.PlaneGeometry(CORRIDOR_LENGTH, CORRIDOR_HEIGHT, CORRIDOR_LENGTH / SEGMENT_SIZE, 1);
    const ceil = new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_LENGTH, 1, CORRIDOR_LENGTH / SEGMENT_SIZE);
    ceil.rotateX(Math.PI / 2);

    return { floorGeo: floor, wallGeo: wall, ceilingGeo: ceil };
  }, []);

  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0d0d1a',
        metalness: 0.92,
        roughness: 0.28,
        envMapIntensity: 0.3,
      }),
    [],
  );

  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0a0a14',
        metalness: 0.85,
        roughness: 0.35,
      }),
    [],
  );

  return (
    <group ref={groupRef}>
      {/* Floor */}
      <mesh geometry={floorGeo} material={floorMat} position={[0, -CORRIDOR_HEIGHT / 2, -CORRIDOR_LENGTH / 2]} />

      {/* Ceiling */}
      <mesh geometry={ceilingGeo} material={metalMat} position={[0, CORRIDOR_HEIGHT / 2, -CORRIDOR_LENGTH / 2]} />

      {/* Left wall */}
      <mesh
        geometry={wallGeo}
        material={metalMat}
        position={[-CORRIDOR_WIDTH / 2, 0, -CORRIDOR_LENGTH / 2]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* Right wall */}
      <mesh
        geometry={wallGeo}
        material={metalMat}
        position={[CORRIDOR_WIDTH / 2, 0, -CORRIDOR_LENGTH / 2]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* Ambient light inside corridor */}
      <pointLight position={[0, 2, -5]} intensity={0.3} color="#0a1628" distance={20} />
    </group>
  );
}
