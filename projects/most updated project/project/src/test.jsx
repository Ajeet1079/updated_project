import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import ViewPresets from './ViewPresets';

export default function STLViewer() {
  const [usePresetCamera, setUsePresetCamera] = useState(false);

  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 75 }}>
      {/* Free Orbit Controls */}
      {!usePresetCamera && <OrbitControls />}

      {/* STL Model */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {/* Example Mesh - Replace with your STL Model */}
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="orange" />
      </mesh>

      {/* View Presets Camera */}
      {usePresetCamera && <ViewPresets active={usePresetCamera} onExit={() => setUsePresetCamera(false)} />}

      {/* Toggle Button */}
      <Html position={[0, 0, 0]}>
        <button
          style={{ position: 'absolute', top: 10, left: 10, padding: '8px', zIndex: 10 }}
          onClick={() => setUsePresetCamera(!usePresetCamera)}
        >
          {usePresetCamera ? 'Switch to Free View' : 'Switch to Preset Views'}
        </button>
      </Html>
    </Canvas>
  );
}
