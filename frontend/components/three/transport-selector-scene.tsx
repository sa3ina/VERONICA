'use client';

import { Canvas } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import { TransportType } from '@/lib/types';
import { ColoredBusModel } from './transit-hero-scene';

export function TransportSelectorScene({ type }: { type: TransportType }) {
  // Map transport type to bus color (green/red rotation)
  const color: 'green' | 'red' = type === 'bus' || type === 'metro' ? 'green' : 'red';

  return (
    <div className='h-72 overflow-hidden rounded-[28px]' style={{ border: '1px solid rgba(204, 255, 0, 0.2)', background: 'radial-gradient(circle at top, rgba(204, 255, 0, 0.15), transparent 50%), radial-gradient(circle at bottom right, rgba(139, 92, 246, 0.1), transparent 60%), linear-gradient(180deg, #0a0a0f 0%, #07070a 100%)' }}>
      <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} color='#ffffff' />
        <directionalLight position={[-3, 3, -2]} intensity={0.6} color='#ccff00' />
        <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.3}>
          <group position={[0, 0, 0]} scale={0.85}>
            <ColoredBusModel color={color} />
          </group>
        </Float>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]}>
          <circleGeometry args={[5, 64]} />
          <meshStandardMaterial color='#050508' />
        </mesh>
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.9} />
      </Canvas>
    </div>
  );
}
