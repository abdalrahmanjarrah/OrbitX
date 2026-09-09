import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const NEON_COLOR = new THREE.Color('#00f3ff');

interface NeonStripProps {
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
}

export function NeonStrip({ position, rotation, length }: NeonStripProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity = 0.4 + Math.sin(clock.getElapsedTime() * 0.5 + phase.current) * 0.15;
  });

  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[length, 0.04, 0.02]} />
      <meshStandardMaterial
        ref={matRef}
        color="#001a22"
        emissive={NEON_COLOR}
        emissiveIntensity={0.5}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

interface NeonRingProps {
  position: [number, number, number];
  radius?: number;
}

export function NeonRing({ position, radius = 3.5 }: NeonRingProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 0.8 + phase.current) * 0.2;
  });

  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.02, 8, 64]} />
      <meshStandardMaterial
        ref={matRef}
        color="#001a22"
        emissive={NEON_COLOR}
        emissiveIntensity={0.4}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}
