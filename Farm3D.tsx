import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, useGLTF, Environment, KeyboardControls, Cloud, Clouds, Grid, ContactShadows, Billboard, Text, useKeyboardControls } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';

class ModelErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error("Model Error:", error); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}
import Ecctrl from 'ecctrl';
import { doc, updateDoc, increment, onSnapshot, collection, setDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { X, Store, MousePointer2, Leaf, Bird, Settings, Star } from 'lucide-react';
import * as THREE from 'three';
import { FARM_PLANTS, FARM_ANIMALS, FARM_STRUCTURES, ALL_FARM_ITEMS } from '../lib/farm';

// --- Types ---
export interface FarmItem {
  id: string; // unique instance id
  typeId: string; // matches FARM_PLANTS or FARM_ANIMALS
  position: [number, number, number];
  rotation: [number, number, number];
  type: 'plant' | 'animal' | 'structure';
}

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['Shift'] },
];

function ExternalModel({ url, scale }: { url: string; scale: number[] }) {
  const { scene } = useGLTF(url);
  const clonedScene = React.useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  return <primitive object={clonedScene} scale={scale} />;
}

function ModelRenderer({ item, userXp, isStudying }: { item: FarmItem & { createdAt?: number, createdAtXp?: number }, userXp: number, isStudying?: boolean }) {
  const meta = ALL_FARM_ITEMS.find(i => i.id === item.typeId) as any;
  if (!meta) return null;

  const [x, y, z] = item.position;
  const [rx, ry, rz] = item.rotation;
  const isAnimal = FARM_ANIMALS.some(a => a.id === item.typeId);
  const isStructure = FARM_STRUCTURES.some(s => s.id === item.typeId);

  // Animated scaling logic
  const groupRef = useRef<THREE.Group>(null);
  const isPlant = !isAnimal && !isStructure;

  useFrame((state) => {
    if (groupRef.current) {
      if (isPlant) {
        // Growth based on XP gained since planting
        let targetScale = 1;
        if (item.createdAtXp !== undefined) {
           const requiredXpForFullGrown = meta.price ? meta.price : 500; 
           const gainedXp = Math.max(0, userXp - item.createdAtXp);
           targetScale = Math.min(1, gainedXp / requiredXpForFullGrown);
           targetScale = Math.max(0.2, targetScale); // Start at 20% size
        } else if (item.createdAt) {
           // Fallback for old items: growth based on time
           const ageMs = Date.now() - item.createdAt;
           const growthDuration = 60000;
           targetScale = Math.min(1, ageMs / growthDuration);
           targetScale = Math.max(0.2, targetScale);
        }
        groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      }

      if (isAnimal) {
        if (isStudying === false) { // strict false, undefined means true
          // Sleep (lie down flat on the ground)
          groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -Math.PI / 2, 0.05);
          groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0.2, 0.05); 
        } else {
          // Awake (stand up and subtle jump)
          groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
          groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, Math.sin(state.clock.getElapsedTime() * 3) * 0.1 + (meta.scale[1] / 2 + 0.1), 0.1);
        }
      }
    }
  });

  return (
    <RigidBody type={isAnimal ? "dynamic" : "fixed"} colliders={false} position={[x, y + meta.scale[1]/2 + 0.1, z]} rotation={[rx, ry, rz]}>
      <CuboidCollider args={[meta.scale[0]/2, meta.scale[1]/2, meta.scale[2]/2]} />
      <group ref={groupRef}>
        {meta.modelUrl ? (
          <ModelErrorBoundary fallback={<mesh><boxGeometry args={meta.scale as any}/><meshStandardMaterial color={meta.color}/></mesh>}>
            <Suspense fallback={<mesh><boxGeometry args={meta.scale as any}/><meshStandardMaterial color={meta.color}/></mesh>}>
              <ExternalModel url={meta.modelUrl} scale={meta.scale} />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          <mesh castShadow receiveShadow>
            <boxGeometry args={meta.scale as any} />
            <meshStandardMaterial color={meta.color || '#AAFF00'} />
          </mesh>
        )}
        {/* Name/Status Billboard */}
        <Billboard position={[0, meta.scale[1] + 0.5, 0]}>
           <Text fontSize={0.3} color="white" outlineWidth={0.03} outlineColor="black">{meta.icon}</Text>
           {isAnimal && isStudying === false && (
             <Text position={[0.5, 0.5, 0]} fontSize={0.2} color="#87CEEB" outlineWidth={0.02} outlineColor="black">Zzz...</Text>
           )}
        </Billboard>
      </group>
    </RigidBody>
  );
}

function SimpleCharacter({ name, isLocal = false }: { name: string, isLocal?: boolean }) {
  // Kenney-style Blocky Character
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  
  const [_, get] = useKeyboardControls();

  useFrame((state) => {
    if (isLocal && leftLegRef.current && rightLegRef.current && leftArmRef.current && rightArmRef.current) {
      const { forward, backward, leftward, rightward } = get();
      if (forward || backward || leftward || rightward) {
        const time = state.clock.getElapsedTime() * 15;
        // Legs
        leftLegRef.current.rotation.x = Math.sin(time) * 0.6;
        rightLegRef.current.rotation.x = Math.sin(time + Math.PI) * 0.6;
        // Arms (opposite to legs)
        leftArmRef.current.rotation.x = Math.sin(time + Math.PI) * 0.5;
        rightArmRef.current.rotation.x = Math.sin(time) * 0.5;
      } else {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
        leftArmRef.current.rotation.x = 0;
        rightArmRef.current.rotation.x = 0;
      }
      
      if (headRef.current) {
        // limit pitch
        headRef.current.rotation.x = Math.max(-0.5, Math.min(0.5, state.camera.rotation.x));
      }
    }
  });

  return (
    <group position={[0, -0.7, 0]}>
      {/* Body / Torso */}
      <mesh castShadow receiveShadow position={[0, 0.65, 0]}>
        <boxGeometry args={[0.4, 0.5, 0.2]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.8} />
      </mesh>
      
      {/* Arms */}
      {/* Left Arm Pivot */}
      <group ref={leftArmRef} position={[-0.3, 0.85, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <boxGeometry args={[0.18, 0.4, 0.18]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.8} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, -0.45, 0]}>
          <boxGeometry args={[0.18, 0.1, 0.18]} />
          <meshStandardMaterial color="#ffcda3" roughness={0.8} />
        </mesh>
      </group>

      {/* Right Arm Pivot */}
      <group ref={rightArmRef} position={[0.3, 0.85, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <boxGeometry args={[0.18, 0.4, 0.18]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.8} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, -0.45, 0]}>
          <boxGeometry args={[0.18, 0.1, 0.18]} />
          <meshStandardMaterial color="#ffcda3" roughness={0.8} />
        </mesh>
      </group>
      
      {/* Legs */}
      <group ref={leftLegRef} position={[-0.11, 0.4, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <boxGeometry args={[0.18, 0.4, 0.18]} />
          <meshStandardMaterial color="#8b4513" roughness={0.8} />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[0.11, 0.4, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <boxGeometry args={[0.18, 0.4, 0.18]} />
          <meshStandardMaterial color="#8b4513" roughness={0.8} />
        </mesh>
      </group>

      {/* Head Pivot */}
      <group ref={headRef} position={[0, 0.9, 0]}>
        {/* Head Mesh */}
        <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color="#ffcda3" roughness={0.8} />
        </mesh>
        {/* Hair */}
        <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
          <boxGeometry args={[0.42, 0.08, 0.42]} />
          <meshStandardMaterial color="#4a3018" roughness={0.9} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.1, 0.25, 0.21]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color="#111" roughness={0.2} />
        </mesh>
        <mesh position={[0.1, 0.25, 0.21]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color="#111" roughness={0.2} />
        </mesh>
      </group>
      
      {/* Name tag */}
      <Billboard position={[0, 1.6, 0]}>
        <Text fontSize={0.15} color="white" outlineWidth={0.02} outlineColor="black">{name}</Text>
      </Billboard>
    </group>
  );
}

function ShopBuilding({ onNear }: { onNear: (near: boolean) => void }) {
  const shopRef = useRef<THREE.Group>(null);
  const lastState = useRef(false);
  
  useFrame(({ camera }) => {
    if (!shopRef.current) return;
    const dist = camera.position.distanceTo(shopRef.current.position);
    const isNear = dist < 12;
    if (isNear !== lastState.current) {
       lastState.current = isNear;
       onNear(isNear);
    }
  });

  return (
    <group ref={shopRef} position={[15, 0, -15]}>
      {/* 3D Model for the shop */}
      <ModelErrorBoundary fallback={
        <group position={[0, 2, 0]}>
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[5, 4, 5]} />
            <meshStandardMaterial color="#8B4513" roughness={0.9} />
          </mesh>
        </group>
      }>
        <Suspense fallback={
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[4, 4, 4]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
        }>
          <ExternalModel url="https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/house-3/model.gltf" scale={[6, 6, 6]} />
        </Suspense>
      </ModelErrorBoundary>

      {/* Sign */}
      <Billboard position={[0, 8, 0]}>
        <Text fontSize={1.5} color="gold" outlineWidth={0.08} outlineColor="black" fontWeight="bold">🏪 المتجر</Text>
      </Billboard>

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[5, 3, 5]} position={[0, 3, 0]} />
      </RigidBody>
    </group>
  );
}

function FarmPlot({ position, name }: { position: [number, number, number], name: string }) {
  // A 20x20 dirt plot with fences on the edges
  // Front edge has a small opening (gate)
  return (
    <group position={position}>
      {/* Dirt ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20, 4, 4]} />
        <meshStandardMaterial color="#3b2f2f" roughness={1} metalness={0.1} />
      </mesh>
      
      {/* 3D Plowed Dirt Rows */}
      <group position={[0, 0.05, 0]}>
        {[...Array(6)].map((_, i) => (
          <mesh key={i} position={[(i - 2.5) * 3, 0, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.3, 0.5, 18, 5]} />
            <meshStandardMaterial color="#2c1e16" roughness={1} />
          </mesh>
        ))}
      </group>

      <Billboard position={[0, 3, 0]}>
         <Text fontSize={1.2} color="#ffffff" outlineWidth={0.1} outlineColor="black" fontWeight="bold">مزرعة {name}</Text>
      </Billboard>

      {/* Fences */}
      <RigidBody type="fixed" colliders="cuboid">
        {/* Left */}
        <mesh position={[-10, 0.5, 0]}><boxGeometry args={[0.2, 1, 20]} /><meshStandardMaterial color="#8B4513" /></mesh>
        {/* Right */}
        <mesh position={[10, 0.5, 0]}><boxGeometry args={[0.2, 1, 20]} /><meshStandardMaterial color="#8B4513" /></mesh>
        {/* Back */}
        <mesh position={[0, 0.5, -10]}><boxGeometry args={[20, 1, 0.2]} /><meshStandardMaterial color="#8B4513" /></mesh>
        {/* Front (with gate gap) */}
        <mesh position={[-6.5, 0.5, 10]}><boxGeometry args={[7, 1, 0.2]} /><meshStandardMaterial color="#8B4513" /></mesh>
        <mesh position={[6.5, 0.5, 10]}><boxGeometry args={[7, 1, 0.2]} /><meshStandardMaterial color="#8B4513" /></mesh>
        {/* Wooden Arch Gate */}
        <mesh position={[-3,  1.5, 10]}><boxGeometry args={[0.3, 3, 0.3]} /><meshStandardMaterial color="#5C4033" /></mesh>
        <mesh position={[3,   1.5, 10]}><boxGeometry args={[0.3, 3, 0.3]} /><meshStandardMaterial color="#5C4033" /></mesh>
        <mesh position={[0,   3.15, 10]}><boxGeometry args={[6.3, 0.3, 0.3]} /><meshStandardMaterial color="#5C4033" /></mesh>
      </RigidBody>
    </group>
  );
}

function WorldMap({ items, onPlaceItem, userXp, isStudying }: { items: FarmItem[], onPlaceItem?: (point: any) => void, userXp: number, isStudying: boolean }) {
  return (
    <group>
      {/* Ground - Main terrain */}
      <RigidBody type="fixed" colliders="cuboid" friction={2}>
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          receiveShadow 
          onClick={(e) => {
            if (onPlaceItem) {
              e.stopPropagation();
              onPlaceItem(e.point);
            }
          }}
        >
          <planeGeometry args={[200, 200, 16, 16]} />
          <meshStandardMaterial 
            color="#348C31" 
            roughness={1} 
            metalness={0} 
            flatShading 
            wireframe={false}
          />
        </mesh>
      </RigidBody>
      
      {/* Walls/Boundaries */}
      <RigidBody type="fixed" position={[100, 20, 0]}>
        <CuboidCollider args={[1, 20, 100]} />
      </RigidBody>
      <RigidBody type="fixed" position={[-100, 20, 0]}>
        <CuboidCollider args={[1, 20, 100]} />
      </RigidBody>
      <RigidBody type="fixed" position={[0, 20, 100]}>
        <CuboidCollider args={[100, 20, 1]} />
      </RigidBody>
      <RigidBody type="fixed" position={[0, 20, -100]}>
        <CuboidCollider args={[100, 20, 1]} />
      </RigidBody>

      <Suspense fallback={null}>
         {/* Scattered Trees */}
         <RigidBody type="fixed" colliders={false} position={[20, 0, -30]}>
            <ExternalModel url="https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/tree-big/model.gltf" scale={[4, 4, 4]} />
            <CuboidCollider args={[1, 5, 1]} position={[0, 5, 0]} />
         </RigidBody>
         <RigidBody type="fixed" colliders={false} position={[-20, 0, -40]}>
            <ExternalModel url="https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/tree-small/model.gltf" scale={[3, 3, 3]} />
            <CuboidCollider args={[0.8, 3, 0.8]} position={[0, 3, 0]} />
         </RigidBody>
         <RigidBody type="fixed" colliders={false} position={[-35, 0, -10]}>
            <ExternalModel url="https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/tree-big/model.gltf" scale={[5, 5, 5]} />
            <CuboidCollider args={[1.2, 6, 1.2]} position={[0, 6, 0]} />
         </RigidBody>
      </Suspense>

      {/* Multiple Farm Plots */}
      <FarmPlot position={[-25, 0.01, 15]} name="الشمالية" />
      <FarmPlot position={[0, 0.01, 20]} name="المركزية" />
      <FarmPlot position={[25, 0.01, 15]} name="الشرقية" />

      {items.map((item) => (
        <ModelRenderer key={item.id} item={item} userXp={userXp} isStudying={isStudying} />
      ))}
    </group>
  );
}

export function Farm3D({ 
  onClose, 
  worldId, 
  isOwner,
  currentUserName,
  userItems = [],
  userXp = 0,
  isStudying = true
}: { 
  onClose: () => void; 
  worldId: string; 
  isOwner: boolean;
  currentUserName: string;
  userItems?: string[];
  userXp?: number;
  isStudying?: boolean;
}) {
  const [hasStarted, setHasStarted] = useState(false);
  const [items, setItems] = useState<FarmItem[]>([]);
  const [otherPlayers, setOtherPlayers] = useState<any[]>([]);
  const [selectedItemToPlace, setSelectedItemToPlace] = useState<string | null>(null);
  const [activeShop, setActiveShop] = useState<'plants' | 'animals' | null>(null);
  const [isNearShop, setIsNearShop] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  const placedTypeIds = items.map(i => i.typeId);
  const unplacedItems = userItems.filter(id => !placedTypeIds.includes(id));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && isNearShop && !activeShop) {
        document.exitPointerLock();
        setActiveShop('plants');
      }
      if (e.code === 'KeyI' && !activeShop) {
        document.exitPointerLock();
        setIsInventoryOpen(prev => !prev);
      }
      if (e.code === 'Escape') {
        setActiveShop(null);
        setIsInventoryOpen(false);
        setSelectedItemToPlace(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNearShop, activeShop]);

  // Fetch world items
  useEffect(() => {
    const unsub = onSnapshot(collection(db, `worlds/${worldId}/items`), (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FarmItem));
      setItems(fetchedItems);
    }, (error) => {
      console.error("Firestore Error in items:", error);
    });
    return () => unsub();
  }, [worldId]);

  // Sync player position
  const myPosRef = useRef([0, 2, 0]);
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const interval = setInterval(() => {
      setDoc(doc(db, `worlds/${worldId}/players/${uid}`), {
        name: currentUserName,
        position: myPosRef.current,
        timestamp: Date.now()
      }, { merge: true }).catch(err => console.error("Error updating player pos:", err));
    }, 2000);

    const unsub = onSnapshot(collection(db, `worlds/${worldId}/players`), (snapshot) => {
      const players: any[] = [];
      const now = Date.now();
      snapshot.forEach(doc => {
        if (doc.id !== uid) {
          const data = doc.data();
          if (now - data.timestamp < 10000) {
            players.push({ id: doc.id, ...data });
          }
        }
      });
      setOtherPlayers(players);
    }, (error) => {
      console.error("Firestore Error in players:", error);
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [worldId, currentUserName]);

  const handlePlaceItem = async (point: any) => {
    if (!selectedItemToPlace || !isOwner) return;
    
    // Find item meta to get the correct type
    const meta = ALL_FARM_ITEMS.find(i => i.id === selectedItemToPlace);
    if (!meta) return;
    const isAnimalOrBird = FARM_ANIMALS.some(a => a.id === selectedItemToPlace);
    const typeStr = isAnimalOrBird ? 'animal' : 'plant';

    try {
      const newItemRef = doc(collection(db, `worlds/${worldId}/items`));
      await setDoc(newItemRef, {
        typeId: selectedItemToPlace,
        position: [point.x, point.y, point.z],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        type: typeStr,
        createdAt: Date.now(),
        createdAtXp: userXp
      });
      setSelectedItemToPlace(null);
    } catch(e) {
      console.error("Error placing item", e);
    }
  };

  const handlePurchase = async (item: any) => {
    if (!auth.currentUser) return;
    if (userXp < item.price) {
      alert("ليس لديك ما يكفي من الخبرة (XP) للشراء!");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        xp: increment(-item.price), // Deducts XP to buy
        items: arrayUnion(item.id)
      });
      alert(`تم إضافة ${item.name} إلى محفظتك!`);
    } catch(e) {
      console.error("Purchase error", e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-sky-300">
      {/* UI Overlay */}
      {hasStarted && (
        <div className="absolute top-6 left-6 z-10 flex gap-3">
          <button 
            onClick={onClose}
            className="bg-black/40 text-white p-3 rounded-full hover:bg-red-500/80 backdrop-blur-md border border-white/20 transition-all shadow-lg group"
          >
            <X size={24} className="group-hover:scale-110 transition-transform" />
          </button>
          <button 
            className="bg-black/40 text-white p-3 rounded-full hover:bg-black/60 backdrop-blur-md border border-white/20 transition-all shadow-lg group"
          >
            <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      )}

      {hasStarted && (
        <div className="absolute top-6 right-6 z-10 flex gap-3">
          <div className="bg-black/60 text-white px-5 py-2.5 rounded-full backdrop-blur-md border border-white/20 flex items-center gap-3 shadow-lg">
            <div className="flex flex-col text-right">
              <h2 className="font-bold text-sm leading-tight text-emerald-400">{isOwner ? 'مزرعتي 🌿' : `مزرعة ${currentUserName}`}</h2>
              <span className="text-xs text-gray-300 font-mono font-medium">Player</span>
            </div>
            <div className="h-8 w-px bg-white/20 mx-1"></div>
            <div className="flex items-center gap-2">
               <span className="text-lg font-bold text-amber-400 font-mono tracking-wider">{userXp}</span>
               <Star size={18} className="text-amber-400 fill-amber-400" />
            </div>
          </div>
        </div>
      )}

      {isNearShop && !activeShop && isOwner && hasStarted && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 bg-black/80 text-white px-8 py-3 rounded-full backdrop-blur-md border border-white/20 animate-bounce shadow-xl flex items-center gap-3">
          <span className="bg-white/20 px-2 py-1 rounded text-sm font-bold font-mono">E</span>
          <h2 className="font-bold text-lg text-center">لدخول المتجر</h2>
        </div>
      )}

      {isOwner && !activeShop && hasStarted && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 drop-shadow-2xl">
          {(!isInventoryOpen) && (
            <button onClick={() => setIsInventoryOpen(true)} className="bg-black/80 hover:bg-black p-3 rounded-full text-white backdrop-blur-md border border-white/20 shadow-[-0_0_15px_rgba(255,255,255,0.1)] flex items-center gap-3 transition-transform hover:scale-105 active:scale-95">
              <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold font-mono">I</span>
              <span className="font-bold">المحفظة / Inventory ({unplacedItems.length})</span>
            </button>
          )}

          {isInventoryOpen && (
            <div className="bg-black/90 p-4 rounded-2xl backdrop-blur-md border border-white/20 max-w-[90vw] shadow-[0_0_40px_rgba(0,0,0,0.8)] animate-fade-in-up">
              <div className="flex justify-between items-center mb-3">
                 <h3 className="text-white text-sm font-bold flex items-center gap-2"><span className="bg-white/20 px-1.5 py-0.5 rounded font-mono text-[10px]">I</span> محتويات الحقيبة</h3>
                 <button onClick={() => setIsInventoryOpen(false)} className="text-gray-400 hover:text-white bg-white/5 rounded-full p-1"><X size={16} /></button>
              </div>
              
              {unplacedItems.length === 0 ? (
                 <div className="text-gray-500 text-sm py-8 px-12 text-center border-2 border-dashed border-white/10 rounded-xl mb-2">حقيبتك فارغة. قم بزيارة المتجر لشراء البذور والحيوانات!</div>
              ) : (
                <div className="flex flex-row gap-2 overflow-x-auto custom-scrollbar pb-2 px-1 items-center">
                  <div className="text-emerald-400 text-xs font-bold whitespace-nowrap bg-emerald-900/40 p-2 rounded-lg border border-emerald-500/20 shadow-inner mr-2">انقر للاختيار <br/> وضع في المزرعة 👉</div>
                  {unplacedItems.map(typeId => {
                    const meta = ALL_FARM_ITEMS.find(i => i.id === typeId) as any;
                    if (!meta) return null;
                    const isSelected = selectedItemToPlace === typeId;
                    return (
                      <button
                        key={typeId}
                        onClick={() => setSelectedItemToPlace(isSelected ? null : typeId)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all w-24 h-24 shrink-0 ${isSelected ? 'bg-emerald-500/20 border-emerald-500 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.4)] z-20 relative' : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'}`}
                      >
                        <div className="text-3xl mb-1 filter drop-shadow-md">{meta.icon}</div>
                        <span className="text-[10px] text-white truncate max-w-full block font-bold">{meta.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedItemToPlace && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none drop-shadow-2xl text-4xl text-white/50 font-bold bg-black/50 px-4 py-2 rounded-lg">
          + انقر على الأرض 
        </div>
      )}

      {/* Start Menu Overlay */}
      {!hasStarted && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center overflow-hidden">
          {/* Immersive background elements */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-transparent to-transparent z-0"></div>
          
          <div className="relative z-10 w-full max-w-3xl p-8 flex flex-col items-center text-center animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight drop-shadow-2xl">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">Orbit</span>Farm 🌿
            </h1>
            <p className="text-xl text-gray-200 mb-12 max-w-xl leading-relaxed drop-shadow-md">
              {isOwner ? 'استكشف مزرعتك، ازرع المحاصيل، واجمع الحيوانات.' : `مرحباً بك في مزرعة ${currentUserName}`}
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-12 px-4">
              <div className="bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-2 shadow-lg hover:bg-white/5 transition-colors">
                <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">حركة</span>
                <span className="font-mono text-lg font-bold text-emerald-400">WASD</span>
              </div>
              <div className="bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-2 shadow-lg hover:bg-white/5 transition-colors">
                <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">ركض</span>
                <span className="font-mono text-lg font-bold text-sky-400">Shift</span>
              </div>
              <div className="bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-2 shadow-lg hover:bg-white/5 transition-colors">
                <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">قفز</span>
                <span className="font-mono text-lg font-bold text-purple-400">Space</span>
              </div>
              <div className="bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-2 shadow-lg hover:bg-white/5 transition-colors">
                <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">المتجر</span>
                <span className="font-mono text-lg font-bold text-amber-400">E</span>
              </div>
            </div>

            <button 
              onClick={() => setHasStarted(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xl px-14 py-5 rounded-full shadow-[0_0_40px_rgba(52,211,153,0.4)] hover:shadow-[0_0_60px_rgba(52,211,153,0.6)] transition-all transform hover:scale-105"
            >
              دخول العالم المفتوح
            </button>
            <button 
              onClick={onClose}
              className="mt-6 text-gray-400 hover:text-white transition-colors text-sm font-medium"
            >
              العودة للخلف
            </button>
          </div>
        </div>
      )}

      {/* Modern Shops UI Overlay */}
      {activeShop && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0b0c10]/90 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-4xl p-6 md:p-10 shadow-2xl relative max-h-[90vh] flex flex-col pointer-events-auto">
            <button onClick={() => setActiveShop(null)} className="absolute top-6 left-6 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
               <X size={24} />
            </button>
            <h2 className="text-3xl font-bold text-white mb-6 font-['Space_Grotesk'] text-center drop-shadow-lg">
              🏪 متجر المزرعة
            </h2>
            
            <div className="flex justify-center gap-4 mb-8">
              <button 
                onClick={() => setActiveShop('plants')}
                className={`px-6 py-2.5 rounded-full font-bold transition-all border ${activeShop === 'plants' ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
              >
                🌱 المشاتل
              </button>
              <button 
                onClick={() => setActiveShop('animals')}
                className={`px-6 py-2.5 rounded-full font-bold transition-all border ${activeShop === 'animals' ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
              >
                🐾 الحظيرة
              </button>
            </div>

            <div className="flex justify-center mb-8">
              <span className="bg-gradient-to-r from-emerald-900/50 to-emerald-800/50 text-emerald-300 px-6 py-2.5 rounded-full font-bold text-lg border border-emerald-500/30 shadow-lg flex items-center gap-2">
                 رصيدك الحالي: {userXp} XP 💎
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar p-2">
               {(activeShop === 'plants' ? FARM_PLANTS : FARM_ANIMALS).map(item => {
                 const isOwned = userItems.includes(item.id);
                 const canAfford = userXp >= item.price;
                 return (
                   <div key={item.id} className="bg-black/60 border border-white/5 rounded-2xl p-5 flex flex-col items-center text-center relative transition-all hover:-translate-y-1 hover:bg-white/5 hover:border-white/20 hover:shadow-xl group">
                     <div className="text-5xl mb-4 bg-gradient-to-b from-white/10 to-white/5 w-24 h-24 rounded-full flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform drop-shadow-2xl">{item.icon}</div>
                     <h3 className="text-white font-bold text-lg mb-1">{item.name}</h3>
                     <p className="text-gray-400 text-[11px] mb-4 h-10 overflow-hidden">{item.desc}</p>
                     
                     {isOwned ? (
                       <div className="mt-auto w-full py-2.5 bg-emerald-900/40 text-emerald-400 rounded-xl font-bold text-sm border border-emerald-500/30">
                         مملوك ✔️
                       </div>
                     ) : (
                       <button 
                         onClick={() => handlePurchase(item)}
                         disabled={!canAfford}
                         className={`mt-auto w-full py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${canAfford ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                       >
                         شراء بـ {item.price} XP
                       </button>
                     )}
                   </div>
                 )
               })}
            </div>
          </div>
        </div>
      )}

      {/* Make canvas non-blocking for events but capture pointer properly by having ecctrl wrapper around camera */}
      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }} style={{ cursor: selectedItemToPlace || activeShop || !hasStarted || isInventoryOpen ? 'auto' : 'crosshair' }} className={activeShop || !hasStarted || isInventoryOpen ? 'pointer-events-none' : ''}>
          
          <fog attach="fog" args={['#e8d2ac', 10, 80]} />
          
          <Sky sunPosition={[50, 5, -50]} turbidity={2.5} rayleigh={2} mieCoefficient={0.005} mieDirectionalG={0.8} />
          
          <ambientLight intensity={0.5} color="#ffd1a3" />
          <directionalLight 
            castShadow 
            color="#ffecd4"
            position={[50, 20, -50]} 
            intensity={2} 
            shadow-mapSize={1024} 
            shadow-camera-near={0.5} 
            shadow-camera-far={200} 
            shadow-camera-left={-20} 
            shadow-camera-right={20} 
            shadow-camera-top={20} 
            shadow-camera-bottom={-20}
            shadow-bias={-0.001}
          />
          
          <ContactShadows position={[0, 0.05, 0]} opacity={0.6} scale={100} blur={2} far={20} resolution={1024} color="#000000" />
          
          <Clouds material={THREE.MeshBasicMaterial}>
            <Cloud segments={20} bounds={[50, 10, 50]} volume={20} color="#ffffff" position={[0, 40, 0]} />
          </Clouds>

          <Physics gravity={[0, -9.81, 0]}>
            <WorldMap items={items} onPlaceItem={handlePlaceItem} userXp={userXp} isStudying={isStudying} />
            
            <ShopBuilding onNear={setIsNearShop} />

            {/* Current Player Controller utilizing ecctrl (WASD + Mouse look) */}
            <Ecctrl 
              camInitDis={-5} 
              camMaxDis={-10} 
              maxVelLimit={4} 
              jumpVel={4.5}
              position={[0, 6, 0]}
              capsuleRadius={0.3}
              capsuleHalfHeight={0.4}
              camCollision={true} // enable cam collision so it doesnt clip through walls
              dragDampingC={0.4}
              friction={2}
            >
              <SimpleCharacter name={currentUserName} isLocal={true} />
            </Ecctrl>
            
            {/* Other Players */}
            {otherPlayers.map(p => (
              <RigidBody key={p.id} type="kinematicPosition" colliders={false} position={p.position}>
                 <SimpleCharacter name={p.name} />
                 <CuboidCollider args={[0.25, 0.35, 0.25]} position={[0, 0, 0]} />
              </RigidBody>
            ))}
          </Physics>
        </Canvas>
      </KeyboardControls>
    </div>
  );
}
