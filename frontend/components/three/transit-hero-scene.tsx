'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

// Road component with lane markings
function Road() {
  return (
    <group>
      {/* Main road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]}>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color='#1a1a2e' roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Road borders with neon glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.04, 3.9]}>
        <planeGeometry args={[20, 0.08]} />
        <meshStandardMaterial color='#ccff00' emissive='#ccff00' emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.04, -3.9]}>
        <planeGeometry args={[20, 0.08]} />
        <meshStandardMaterial color='#ccff00' emissive='#ccff00' emissiveIntensity={0.5} />
      </mesh>
      {/* Center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.03, 0]}>
        <planeGeometry args={[20, 0.05]} />
        <meshStandardMaterial color='#ffffff' emissive='#ffffff' emissiveIntensity={0.3} />
      </mesh>
      {/* Lane markings - animated dashes */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-8 + i * 2, -1.03, 1.3]}>
          <planeGeometry args={[0.8, 0.04]} />
          <meshStandardMaterial color='#ffffff' emissive='#ffffff' emissiveIntensity={0.2} />
        </mesh>
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-8 + i * 2, -1.03, -1.3]}>
          <planeGeometry args={[0.8, 0.04]} />
          <meshStandardMaterial color='#ffffff' emissive='#ffffff' emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// Moving bus component with color variants
function MovingBus({ color, lane, speed, initialZ }: { color: 'green' | 'red'; lane: number; speed: number; initialZ: number }) {
  const ref = useRef<THREE.Group>(null);
  const scale = 0.65;

  useFrame((state) => {
    if (ref.current) {
      // Move along X axis (forward on road)
      ref.current.position.x += speed * 0.016;

      // Reset position when vehicle goes off screen
      if (ref.current.position.x > 10) {
        ref.current.position.x = -10;
      }

      // Slight bounce animation
      ref.current.position.y = -0.3 + Math.sin(state.clock.elapsedTime * 3 + lane) * 0.02;
    }
  });

  return (
    <group ref={ref} position={[-10 + initialZ, -0.3, lane]} scale={scale}>
      <Float speed={2} rotationIntensity={0.05} floatIntensity={0.1}>
        <ColoredBusModel color={color} />
      </Float>
    </group>
  );
}

// Colored bus model - tall body, small wheels (real bus proportions)
export function ColoredBusModel({ color }: { color: 'green' | 'red' }) {
  const bodyColor = color === 'green' ? '#22c55e' : '#ef4444';
  const darkColor = color === 'green' ? '#15803d' : '#991b1b';

  return (
    <group>
      {/* Main bus body - taller and longer */}
      <RoundedBox args={[3.2, 1.4, 1.1]} radius={0.18} position={[0, 0.2, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.35} />
      </RoundedBox>

      {/* Roof */}
      <RoundedBox args={[3.15, 0.08, 1.05]} radius={0.04} position={[0, 0.94, 0]}>
        <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
      </RoundedBox>

      {/* Bottom darker section */}
      <RoundedBox args={[3.2, 0.25, 1.1]} radius={0.05} position={[0, -0.4, 0]}>
        <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
      </RoundedBox>

      {/* Front windshield - large (positioned outside body to prevent z-fighting) */}
      <mesh position={[1.605, 0.4, 0]}>
        <boxGeometry args={[0.04, 0.55, 0.85]} />
        <meshStandardMaterial color='#0ea5e9' metalness={0.7} roughness={0.1} />
      </mesh>

      {/* Back window */}
      <mesh position={[-1.605, 0.4, 0]}>
        <boxGeometry args={[0.04, 0.5, 0.8]} />
        <meshStandardMaterial color='#0ea5e9' metalness={0.7} roughness={0.1} />
      </mesh>

      {/* Side windows - right side (3 windows, door takes 4th spot) */}
      {[-1.1, -0.45, 0.2].map((x, i) => (
        <mesh key={`r-${i}`} position={[x, 0.4, 0.56]}>
          <boxGeometry args={[0.55, 0.5, 0.04]} />
          <meshStandardMaterial color='#7dd3fc' metalness={0.6} roughness={0.12} />
        </mesh>
      ))}

      {/* Side windows - left side (4 windows, no door) */}
      {[-1.1, -0.45, 0.2, 0.85].map((x, i) => (
        <mesh key={`l-${i}`} position={[x, 0.4, -0.56]}>
          <boxGeometry args={[0.55, 0.5, 0.04]} />
          <meshStandardMaterial color='#7dd3fc' metalness={0.6} roughness={0.12} />
        </mesh>
      ))}

      {/* Door on right side */}
      <mesh position={[0.95, 0.1, 0.56]}>
        <boxGeometry args={[0.45, 0.95, 0.04]} />
        <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Door window */}
      <mesh position={[0.95, 0.45, 0.575]}>
        <boxGeometry args={[0.35, 0.3, 0.02]} />
        <meshStandardMaterial color='#7dd3fc' metalness={0.6} roughness={0.12} />
      </mesh>

      {/* Window divider strips (right side - 2 dividers between 3 windows) */}
      {[-0.78, -0.13].map((x, i) => (
        <mesh key={`rd-${i}`} position={[x, 0.4, 0.58]}>
          <boxGeometry args={[0.05, 0.55, 0.02]} />
          <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
        </mesh>
      ))}

      {/* Window divider strips (left side - 3 dividers between 4 windows) */}
      {[-0.78, -0.13, 0.52].map((x, i) => (
        <mesh key={`ld-${i}`} position={[x, 0.4, -0.58]}>
          <boxGeometry args={[0.05, 0.55, 0.02]} />
          <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
        </mesh>
      ))}

      {/* Headlights */}
      <mesh position={[1.61, -0.2, 0.35]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color='#fef9c3' emissive='#fef08a' emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[1.61, -0.2, -0.35]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color='#fef9c3' emissive='#fef08a' emissiveIntensity={1.2} />
      </mesh>

      {/* Taillights */}
      <RoundedBox args={[0.04, 0.12, 0.15]} radius={0.02} position={[-1.61, -0.15, 0.4]}>
        <meshStandardMaterial color='#ff0000' emissive='#ff0000' emissiveIntensity={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.04, 0.12, 0.15]} radius={0.02} position={[-1.61, -0.15, -0.4]}>
        <meshStandardMaterial color='#ff0000' emissive='#ff0000' emissiveIntensity={0.9} />
      </RoundedBox>

      {/* Small wheels (4 total - 2 each side) */}
      <Wheel position={[-1.05, -0.6, 0.55]} />
      <Wheel position={[1.05, -0.6, 0.55]} />
      <Wheel position={[-1.05, -0.6, -0.55]} />
      <Wheel position={[1.05, -0.6, -0.55]} />
    </group>
  );
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      {/* Tire */}
      <mesh>
        <cylinderGeometry args={[0.13, 0.13, 0.14, 24]} />
        <meshStandardMaterial color='#0a0a0a' roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Rim */}
      <mesh position={[0, 0.001, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.15, 16]} />
        <meshStandardMaterial color='#cbd5e1' roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}

// Animated lane markers that move with traffic
function MovingLaneMarkers() {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.position.x += 0.02;
      if (ref.current.position.x > 2) {
        ref.current.position.x = 0;
      }
    }
  });

  return (
    <group ref={ref}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-10 + i * 3, -1.02, 0]}>
          <circleGeometry args={[0.15, 16]} />
          <meshStandardMaterial color='#ccff00' emissive='#ccff00' emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export function TransitHeroScene() {
  return (
    <div className='relative h-[460px] w-full overflow-hidden rounded-[28px]'>
      {/* Background gradient */}
      <div className='absolute inset-0' style={{
        background: 'radial-gradient(80% 60% at 50% 0%, rgba(204, 255, 0, 0.15), transparent 60%), radial-gradient(60% 40% at 80% 100%, rgba(139, 92, 246, 0.1), transparent 60%), linear-gradient(180deg, #0a0a0f 0%, #07070a 100%)'
      }} />

      <Canvas camera={{ position: [0, 2.5, 8], fov: 45 }} shadows>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow color='#ffffff' />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} color='#ccff00' />

        {/* Road */}
        <Road />

        {/* Moving buses - green and red only */}
        {/* Top lane - green buses */}
        <MovingBus color='green' lane={2} speed={1.5} initialZ={0} />
        <MovingBus color='green' lane={2} speed={1.5} initialZ={7} />

        {/* Middle lane - red buses */}
        <MovingBus color='red' lane={0} speed={1.8} initialZ={3} />
        <MovingBus color='red' lane={0} speed={1.8} initialZ={10} />

        {/* Bottom lane - mixed */}
        <MovingBus color='green' lane={-2} speed={2} initialZ={1} />
        <MovingBus color='red' lane={-2} speed={2} initialZ={8} />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
          <planeGeometry args={[30, 20]} />
          <meshStandardMaterial color='#050508' />
        </mesh>
      </Canvas>

      {/* Top-left status */}
      <div className='pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-[#ccff00]/30 bg-black/40 px-3 py-1.5 backdrop-blur-sm'>
        <span className='flex h-2 w-2 rounded-full bg-[#ccff00] animate-pulse' />
        <span className='text-xs text-white/80 font-medium'>Live Transit Flow</span>
      </div>

      {/* Bottom-right chips */}
      <div className='pointer-events-none absolute bottom-4 right-4 flex items-center gap-3'>
        <span className='chip chip-success text-xs'>4 Active Routes</span>
        <span className='chip chip-info text-xs'>Real-time</span>
      </div>
    </div>
  );
}
