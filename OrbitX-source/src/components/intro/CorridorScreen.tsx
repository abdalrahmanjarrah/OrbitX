import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface CorridorScreenProps {
  position: [number, number, number];
  rotation: [number, number, number];
  title: string;
  description: string;
  index: number;
}

const NEON_COLOR = new THREE.Color('#00f3ff');
const ACTIVATION_DISTANCE = 12;
const FULL_BRIGHT_DISTANCE = 5;

export function CorridorScreen({ position, rotation, title, description }: CorridorScreenProps) {
  const screenRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const titleRef = useRef<any>(null);
  const descRef = useRef<any>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const { camera } = useThree();
  const currentIntensity = useRef(0);

  useFrame(() => {
    if (!screenRef.current || !materialRef.current) return;

    const dist = camera.position.distanceTo(screenRef.current.position);
    let target = 0;

    if (dist < ACTIVATION_DISTANCE) {
      target = THREE.MathUtils.clamp(
        1 - (dist - FULL_BRIGHT_DISTANCE) / (ACTIVATION_DISTANCE - FULL_BRIGHT_DISTANCE),
        0,
        1,
      );
    }

    currentIntensity.current = THREE.MathUtils.lerp(currentIntensity.current, target, 0.08);
    materialRef.current.emissiveIntensity = currentIntensity.current * 1.5;
    materialRef.current.opacity = 0.15 + currentIntensity.current * 0.85;

    if (glowRef.current) {
      glowRef.current.intensity = currentIntensity.current * 3;
    }

    // Update text opacity
    if (titleRef.current?.material) {
      titleRef.current.material.opacity = currentIntensity.current;
    }
    if (descRef.current?.material) {
      descRef.current.material.opacity = currentIntensity.current * 0.8;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Screen frame */}
      <mesh>
        <boxGeometry args={[3.4, 2.2, 0.1]} />
        <meshStandardMaterial color="#0f1525" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Screen surface */}
      <mesh ref={screenRef} position={[0, 0, 0.06]}>
        <planeGeometry args={[3, 1.8]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#000a14"
          emissive={NEON_COLOR}
          emissiveIntensity={0}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Title text */}
      <Text
        ref={titleRef}
        position={[0, 0.5, 0.15]}
        fontSize={0.22}
        color="#00f3ff"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.6}
      >
        {title}
      </Text>
      {titleRef.current && (titleRef.current.material as THREE.MeshBasicMaterial).opacity === 0 && null}

      {/* Description text */}
      <Text
        ref={descRef}
        position={[0, -0.1, 0.15]}
        fontSize={0.12}
        color="#6699aa"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.6}
      >
        {description}
      </Text>

      {/* Neon glow light */}
      <pointLight ref={glowRef} color="#00f3ff" intensity={0} distance={8} position={[0, 0, 1]} />

      {/* Corner accents */}
      {[[-1.5, 1, 0.06], [1.5, 1, 0.06], [-1.5, -1, 0.06], [1.5, -1, 0.06]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.15, 0.15, 0.02]} />
          <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}
