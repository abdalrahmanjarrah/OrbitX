import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const STAR_COUNT = 1500;
const SHOOTING_STAR_COUNT = 5;

export function Stars() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.3}
        sizeAttenuation
        transparent
        opacity={0.9}
      />
    </points>
  );
}

export function ShootingStars() {
  const starsRef = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    starsRef.current.forEach((star, i) => {
      if (!star) return;
      const cycle = (t * 0.3 + i * 2.5) % 8;
      if (cycle < 0.5) {
        star.visible = true;
        const progress = cycle / 0.5;
        star.position.set(-50 + progress * 100, 20 - progress * 40, -30 + i * 15);
        (star.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
      } else {
        star.visible = false;
      }
    });
  });

  return (
    <group>
      {Array.from({ length: SHOOTING_STAR_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) starsRef.current[i] = el; }}
          visible={false}
        >
          <boxGeometry args={[2, 0.02, 0.02]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}
