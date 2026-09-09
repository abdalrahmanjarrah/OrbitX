import { useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Corridor } from './Corridor';
import { CorridorScreen } from './CorridorScreen';
import { NeonStrip, NeonRing } from './NeonStrip';
import { BlastDoor } from './BlastDoor';
import { SolarSystem } from './SolarSystem';
import { Stars, ShootingStars } from './Stars';
import { IntroUI } from './IntroUI';
import { useIntroStore } from './useIntroStore';
import type { IntroViewProps } from '../../views/IntroView';

const CORRIDOR_LENGTH = 120;
const SCREEN_POSITIONS: { z: number; title: string; desc: string }[] = [
  { z: -15, title: 'محطات التركيز', desc: 'اختر محطتك وابدأ جلسة تركيز مع مؤقت ذكي ورادار حضور' },
  { z: -30, title: 'المجتمع الفضائي', desc: 'انضم لأسطول، تحدَ أصدقاءك بمبارزة تركيز' },
  { z: -45, title: 'تحدي الحفرة السوداء', desc: 'تحدي أسبوعي جماعي — اجمع ساعات مع فريقك' },
  { z: -60, title: 'خزانة المعرفة', desc: 'قرآن، وعي، يوميات كونية — اقرأ وتأمل وانشر' },
  { z: -75, title: 'نظام التقدم', desc: '9 مراتب من المبتدئ إلى الأسطورة — كل يوم صعود' },
  { z: -90, title: 'درع الحماية', desc: 'رادار الحضور يكشف الغش ويحمي تقدمك' },
];

const NEON_STRIP_POSITIONS = [
  { pos: [-2.95, 1.9, -60] as [number, number, number], rot: [0, 0, 0] as [number, number, number], len: 120 },
  { pos: [2.95, 1.9, -60] as [number, number, number], rot: [0, 0, 0] as [number, number, number], len: 120 },
  { pos: [-2.95, -1.9, -60] as [number, number, number], rot: [0, 0, 0] as [number, number, number], len: 120 },
  { pos: [2.95, -1.9, -60] as [number, number, number], rot: [0, 0, 0] as [number, number, number], len: 120 },
];

function CameraRig() {
  const { camera } = useThree();
  const scrollProgress = useIntroStore((s) => s.scrollProgress);
  const setScrollProgress = useIntroStore((s) => s.setScrollProgress);
  const setActiveScreen = useIntroStore((s) => s.setActiveScreen);
  const setDoorOpen = useIntroStore((s) => s.setDoorOpen);
  const setShowSolarSystem = useIntroStore((s) => s.setShowSolarSystem);

  useFrame(() => {
    const targetZ = -scrollProgress * CORRIDOR_LENGTH;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0, 0.1);

    let activeIdx = -1;
    for (let i = 0; i < SCREEN_POSITIONS.length; i++) {
      const dist = Math.abs(camera.position.z - SCREEN_POSITIONS[i].z);
      if (dist < 8) {
        activeIdx = i;
        break;
      }
    }
    setActiveScreen(activeIdx);

    if (scrollProgress > 0.93) setDoorOpen(true);
    if (scrollProgress > 0.97) setShowSolarSystem(true);
  });

  return null;
}

function Scene() {
  return (
    <>
      <CameraRig />

      <ambientLight intensity={0.15} color="#1a2a4a" />
      <pointLight position={[0, 2, 0]} intensity={1} color="#00f3ff" distance={15} decay={0.5} />
      <pointLight position={[0, 2, -30]} intensity={0.8} color="#0088ff" distance={15} decay={0.5} />
      <pointLight position={[0, 2, -60]} intensity={0.6} color="#00f3ff" distance={15} decay={0.5} />
      <pointLight position={[0, 2, -90]} intensity={0.8} color="#ff8800" distance={15} decay={0.5} />
      <fog attach="fog" args={['#000010', 20, 80]} />

      <Corridor />

      {NEON_STRIP_POSITIONS.map((s, i) => (
        <NeonStrip key={i} position={s.pos} rotation={s.rot} length={s.len} />
      ))}

      {[0, -20, -40, -60, -80].map((z, i) => (
        <NeonRing key={i} position={[0, 0, z]} radius={3.2} />
      ))}

      {SCREEN_POSITIONS.map((s, i) => (
        <group key={i}>
          <CorridorScreen
            position={[-2.8, 0.3, s.z]}
            rotation={[0, Math.PI / 2, 0]}
            title={s.title}
            description={s.desc}
            index={i}
          />
          <CorridorScreen
            position={[2.8, 0.3, s.z]}
            rotation={[0, -Math.PI / 2, 0]}
            title={s.title}
            description={s.desc}
            index={i + 100}
          />
        </group>
      ))}

      <BlastDoor position={[0, 0, -105]} />
      <SolarSystem />
      <Stars />
      <ShootingStars />
    </>
  );
}

export function IntroExperience({ onLogin, onGuest, inviterName }: IntroViewProps) {
  const setScrollProgress = useIntroStore((s) => s.setScrollProgress);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY * 0.0004;
    useIntroStore.setState((s) => ({
      scrollProgress: Math.max(0, Math.min(1, s.scrollProgress + delta)),
    }));
  }, []);

  return (
    <div
      onWheel={handleWheel}
      style={{ width: '100vw', height: '100vh', background: '#000008', position: 'relative' }}
    >
      <Canvas
        gl={{
          powerPreference: 'high-performance',
          antialias: false,
          alpha: false,
        }}
        camera={{ position: [0, 0, 0], fov: 65, near: 0.1, far: 300 }}
        dpr={[1, 1.5]}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#000008']} />
        <Scene />
      </Canvas>

      <IntroUI onLogin={onLogin} onGuest={onGuest} inviterName={inviterName} />
    </div>
  );
}
