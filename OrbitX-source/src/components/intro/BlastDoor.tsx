import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useIntroStore } from './useIntroStore';

const DOOR_WIDTH = 3;
const DOOR_HEIGHT = 4;
const DOOR_DEPTH = 0.4;

interface BlastDoorProps {
  position: [number, number, number];
}

export function BlastDoor({ position }: BlastDoorProps) {
  const leftDoorRef = useRef<THREE.Mesh>(null);
  const rightDoorRef = useRef<THREE.Mesh>(null);
  const leftPistonRef = useRef<THREE.Mesh>(null);
  const rightPistonRef = useRef<THREE.Mesh>(null);
  const warningRef = useRef<THREE.PointLight>(null);
  const isOpening = useRef(false);
  const doorOpen = useIntroStore((s) => s.doorOpen);

  const doorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1a1a2e', metalness: 0.95, roughness: 0.2 }),
    [],
  );
  const pistonMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#333344', metalness: 0.9, roughness: 0.3 }),
    [],
  );
  const warningMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ff8c00', emissive: '#ff8c00', emissiveIntensity: 0.8 }),
    [],
  );

  useEffect(() => {
    if (doorOpen && !isOpening.current) {
      isOpening.current = true;
      if (leftDoorRef.current) {
        gsap.to(leftDoorRef.current.position, { x: -DOOR_WIDTH - 0.5, duration: 2, ease: 'power2.inOut' });
      }
      if (rightDoorRef.current) {
        gsap.to(rightDoorRef.current.position, { x: DOOR_WIDTH + 0.5, duration: 2, ease: 'power2.inOut' });
      }
      if (leftPistonRef.current) {
        gsap.to(leftPistonRef.current.scale, { x: 2, duration: 2, ease: 'power2.inOut' });
      }
      if (rightPistonRef.current) {
        gsap.to(rightPistonRef.current.scale, { x: 2, duration: 2, ease: 'power2.inOut' });
      }
    }
  }, [doorOpen]);

  useFrame(({ clock }) => {
    if (warningRef.current) {
      warningRef.current.intensity = 1.5 + Math.sin(clock.getElapsedTime() * 3) * 1;
    }
  });

  return (
    <group position={position}>
      <mesh ref={leftDoorRef} material={doorMat} position={[-DOOR_WIDTH / 2, 0, 0]}>
        <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH]} />
      </mesh>
      <mesh ref={rightDoorRef} material={doorMat} position={[DOOR_WIDTH / 2, 0, 0]}>
        <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH]} />
      </mesh>
      <mesh ref={leftPistonRef} material={pistonMat} position={[-DOOR_WIDTH - 0.3, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.5, 8]} />
      </mesh>
      <mesh ref={rightPistonRef} material={pistonMat} position={[DOOR_WIDTH + 0.3, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.5, 8]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} material={warningMat} position={[side * DOOR_WIDTH * 0.45, -DOOR_HEIGHT * 0.4, 0.25]}>
          <boxGeometry args={[0.8, 0.06, 0.02]} />
        </mesh>
      ))}
      <pointLight ref={warningRef} color="#ff8c00" intensity={1.5} distance={6} position={[0, DOOR_HEIGHT * 0.45, 0.5]} />
      {[
        [0, DOOR_HEIGHT / 2 + 0.1, 0, DOOR_WIDTH * 2 + 0.6, 0.2, 0.5],
        [0, -DOOR_HEIGHT / 2 - 0.1, 0, DOOR_WIDTH * 2 + 0.6, 0.2, 0.5],
      ].map((args, i) => (
        <mesh key={i} position={[args[0] as number, args[1] as number, args[2] as number]}>
          <boxGeometry args={[args[3] as number, args[4] as number, args[5] as number]} />
          <meshStandardMaterial color="#0d0d1a" metalness={0.95} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
