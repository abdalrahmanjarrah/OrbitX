import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useIntroStore } from './useIntroStore';
import * as THREE from 'three';

const TEXTURE_BASE = '/textures/planets/';

interface PlanetConfig {
  name: string;
  texture: string;
  radius: number;
  distance: number;
  speed: number;
  rotationSpeed: number;
  hasRing?: boolean;
}

const PLANETS: PlanetConfig[] = [
  { name: 'Earth', texture: 'earth.jpg', radius: 0.5, distance: 5, speed: 0.3, rotationSpeed: 0.5 },
  { name: 'Mars', texture: 'mars.jpg', radius: 0.35, distance: 8, speed: 0.22, rotationSpeed: 0.4 },
  { name: 'Jupiter', texture: 'jupiter.jpg', radius: 1.0, distance: 12, speed: 0.15, rotationSpeed: 0.2 },
  { name: 'Saturn', texture: 'saturn.jpg', radius: 0.8, distance: 16, speed: 0.1, rotationSpeed: 0.3, hasRing: true },
];

function Planet({ config }: { config: PlanetConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitAngle = useRef(Math.random() * Math.PI * 2);

  const texture = useLoader(THREE.TextureLoader, `${TEXTURE_BASE}${config.texture}`);
  const ringTexture = useLoader(THREE.TextureLoader, `${TEXTURE_BASE}saturn_ring.png`);

  useFrame(({ clock }) => {
    if (!groupRef.current || !meshRef.current) return;

    orbitAngle.current += config.speed * 0.005;
    groupRef.current.position.x = Math.cos(orbitAngle.current) * config.distance;
    groupRef.current.position.z = Math.sin(orbitAngle.current) * config.distance;

    meshRef.current.rotation.y += config.rotationSpeed * 0.003;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[config.radius, 32, 32]} />
        <meshStandardMaterial map={texture} roughness={0.7} metalness={0.1} />
      </mesh>

      {config.hasRing && (
        <mesh rotation={[Math.PI * 0.45, 0, 0]}>
          <ringGeometry args={[config.radius * 1.4, config.radius * 2.2, 32]} />
          <meshStandardMaterial
            map={ringTexture}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const texture = useLoader(THREE.TextureLoader, `${TEXTURE_BASE}sun.jpg`);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.001;
    if (glowRef.current) {
      glowRef.current.intensity = 2 + Math.sin(clock.getElapsedTime() * 0.5) * 0.3;
    }
  });

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          emissive={new THREE.Color('#ffaa00')}
          emissiveIntensity={1.5}
          emissiveMap={texture}
        />
      </mesh>
      <pointLight ref={glowRef} color="#ffcc44" intensity={2} distance={60} decay={0.5} />
      <mesh>
        <sphereGeometry args={[2.3, 16, 16]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function OrbitalRings() {
  return (
    <group>
      {PLANETS.map((p) => (
        <mesh key={p.name} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[p.distance, 0.005, 8, 64]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

function PlanetParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 300;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 20 + Math.random() * 30;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      col[i * 3] = 0.2 + Math.random() * 0.3;
      col[i * 3 + 1] = 0.5 + Math.random() * 0.5;
      col[i * 3 + 2] = 0.8 + Math.random() * 0.2;
    }
    return [pos, col];
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} vertexColors transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export function SolarSystem() {
  const groupRef = useRef<THREE.Group>(null);
  const showSolarSystem = useIntroStore((s) => s.showSolarSystem);

  useFrame(() => {
    if (!groupRef.current) return;
    const target = showSolarSystem ? 1 : 0;
    groupRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.02);
  });

  return (
    <group ref={groupRef} position={[0, 0, -130]} scale={[0, 0, 0]}>
      <Sun />
      {PLANETS.map((p) => (
        <Planet key={p.name} config={p} />
      ))}
      <OrbitalRings />
      <PlanetParticles />
    </group>
  );
}
