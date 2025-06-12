import { useState, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import React, { Suspense, useEffect } from 'react';
import { OrbitControls, Html, useGLTF } from '@react-three/drei';
import { useControls, button } from 'leva';
import * as THREE from 'three';

// Simple Line component since drei's Line might not be available
const SimpleLine = ({ start, end, color = 'red' }) => {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={2} />
    </line>
  );
};

// Measurement Line Component
const MeasurementLine = ({ start, end, distance, visible }) => {
  if (!visible || !start || !end) return null;

  const midPoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];

  return (
    <group>
      {/* Measurement line */}
      <SimpleLine start={start} end={end} color="red" />
      
      {/* Start point */}
      <mesh position={start}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial color="red" />
      </mesh>
      
      {/* End point */}
      <mesh position={end}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial color="red" />
      </mesh>
      
      {/* Distance label */}
      <Html position={midPoint} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(255, 0, 0, 0.9)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          border: '1px solid white'
        }}>
          {distance.toFixed(3)} units
        </div>
      </Html>
    </group>
  );
};

// Clipping Plane Visualization
const ClippingPlaneViz = ({ position, normal, enabled, color = 'yellow' }) => {
  if (!enabled) return null;

  // Create rotation to align plane with normal
  const up = new THREE.Vector3(0, 0, 1);
  const normalVec = new THREE.Vector3(...normal);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalVec);

  return (
    <mesh position={position} quaternion={quaternion}>
      <planeGeometry args={[8, 8]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={0.3} 
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

const Model = ({ clippingPlanes }) => {
  const { scene, nodes, materials } = useGLTF('/models/table.glb');
  const groupRef = useRef();
  const [boundingBox, setBoundingBox] = useState(null);
  const [dimensions, setDimensions] = useState({ x: 0, y: 0, z: 0 });

  // Calculate bounding box and dimensions
  useEffect(() => {
    if (scene) {
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      // Center the model
      const center = box.getCenter(new THREE.Vector3());
      scene.position.sub(center);
      
      setBoundingBox(box);
      setDimensions({
        x: parseFloat(size.x.toFixed(3)),
        y: parseFloat(size.y.toFixed(3)),
        z: parseFloat(size.z.toFixed(3))
      });
    }
  }, [scene]);

  const { color, scale, wireframe, posX, posY, posZ, showTextures } = useControls('Model Controls', {
    color: '#ffaa00',
    scale: { value: 1, min: 0.1, max: 10, step: 0.1 },
    wireframe: false,
    showTextures: { value: true },
    posX: { value: 0, min: -10, max: 10, step: 0.1 },
    posY: { value: 0, min: -10, max: 10, step: 0.1 },
    posZ: { value: 0, min: -10, max: 10, step: 0.1 },
  });

  useControls('Dimensions', {
    'Dimension X': { value: dimensions.x, editable: false },
    'Dimension Y': { value: dimensions.y, editable: false },
    'Dimension Z': { value: dimensions.z, editable: false },
  });

  // Apply clipping planes and material overrides
  useEffect(() => {
    if (groupRef.current) {
      const activePlanes = clippingPlanes
        .filter(plane => plane.enabled)
        .map(plane => {
          const planeObject = new THREE.Plane();
          const normal = new THREE.Vector3(...plane.normal).normalize();
          const point = new THREE.Vector3(...plane.position);
          planeObject.setFromNormalAndCoplanarPoint(normal, point);
          return planeObject;
        });

      groupRef.current.traverse((child) => {
        if (child.isMesh) {
          // Clone material to avoid affecting other instances
          if (!child.userData.originalMaterial) {
            child.userData.originalMaterial = child.material.clone();
          }
          
          let material = child.userData.originalMaterial.clone();
          
          // Apply color override if not showing textures
          if (!showTextures) {
            material.color = new THREE.Color(color);
            material.map = null;
            material.normalMap = null;
            material.roughnessMap = null;
            material.metalnessMap = null;
          }
          
          material.wireframe = wireframe;
          material.side = THREE.DoubleSide;
          
          // Apply clipping planes
          if (activePlanes.length > 0) {
            material.clippingPlanes = activePlanes;
            material.clipShadows = true;
          } else {
            material.clippingPlanes = [];
          }
          
          material.needsUpdate = true;
          child.material = material;
        }
      });
    }
  }, [clippingPlanes, color, wireframe, showTextures]);

  // Enable clipping globally
  useEffect(() => {
    const renderer = groupRef.current?.parent?.parent?.parent?.__r3f?.gl;
    if (renderer) {
      renderer.localClippingEnabled = true;
    }
  }, []);

  if (!scene) return null;

  return (
    <group 
      ref={groupRef}
      scale={[scale, scale, scale]} 
      position={[posX, posY, posZ]}
    >
      <primitive object={scene} />
    </group>
  );
};

// Click Handler Component
const ClickHandler = ({ onMeshClick, measurementMode }) => {
  const { gl, camera, scene } = useThree();

  useEffect(() => {
    const handleClick = (event) => {
      if (!measurementMode || !onMeshClick) return;
      
      event.preventDefault();
      
      // Get canvas bounds
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();
      
      // Calculate mouse coordinates
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Create raycaster
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      
      // Find intersectable objects (exclude measurement spheres and planes)
      const intersectable = [];
      scene.traverse((child) => {
        if (child.isMesh && 
            child.geometry.type !== 'SphereGeometry' && 
            child.geometry.type !== 'PlaneGeometry' &&
            !child.geometry.type.includes('Line')) {
          intersectable.push(child);
        }
      });
      
      const intersects = raycaster.intersectObjects(intersectable, true);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        console.log('Clicked point:', point);
        onMeshClick([point.x, point.y, point.z]);
      }
    };

    if (measurementMode) {
      gl.domElement.addEventListener('click', handleClick);
      gl.domElement.style.cursor = 'crosshair';
    } else {
      gl.domElement.style.cursor = 'default';
    }

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
      gl.domElement.style.cursor = 'default';
    };
  }, [measurementMode, onMeshClick, gl, camera, scene]);

  return null;
};

// Camera Controls Component
const CameraControls = ({ onControlsReady }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    if (controlsRef.current && onControlsReady) {
      onControlsReady(controlsRef.current, camera);
    }
  }, [onControlsReady, camera]);

  return <OrbitControls ref={controlsRef} args={[camera, gl.domElement]} />;
};

const ResponsiveGLBViewer = () => {
  const containerRef = useRef();

  return (
    <div ref={containerRef} style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden'
    }}>
      <GLBViewer />
    </div>
  );
};

const GLBViewer = () => {
  const [controls, setControls] = useState(null);
  const [camera, setCamera] = useState(null);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurements, setMeasurements] = useState([]);
  const [currentMeasurement, setCurrentMeasurement] = useState(null);
  const [clippingPlanes, setClippingPlanes] = useState([
    { id: 'x', position: [0, 0, 0], normal: [1, 0, 0], enabled: false },
    { id: 'y', position: [0, 0, 0], normal: [0, 1, 0], enabled: false },
    { id: 'z', position: [0, 0, 0], normal: [0, 0, 1], enabled: false }
  ]);

  // Measurement Controls
  const measurementControls = useControls('Measurement Tools', {
    'Toggle Measurement': button(() => {
      setMeasurementMode(!measurementMode);
      setCurrentMeasurement(null);
      console.log('Measurement mode:', !measurementMode);
    }),
    'Clear Measurements': button(() => {
      setMeasurements([]);
      setCurrentMeasurement(null);
      console.log('Cleared all measurements');
    }),
    'Show Measurements': { value: true }
  });

  // Clipping Plane Controls
  const clippingControls = useControls('Cross-Section Tools', {
    'Enable X Clip': { 
      value: false, 
      onChange: (value) => {
        setClippingPlanes(prev => prev.map(plane => 
          plane.id === 'x' ? { ...plane, enabled: value } : plane
        ));
      }
    },
    'X Position': { 
      value: 0, 
      min: -3, 
      max: 3, 
      step: 0.1,
      onChange: (value) => {
        setClippingPlanes(prev => prev.map(plane => 
          plane.id === 'x' ? { ...plane, position: [value, 0, 0] } : plane
        ));
      }
    },
    'Enable Y Clip': { 
      value: false,
      onChange: (value) => {
        setClippingPlanes(prev => prev.map(plane => 
          plane.id === 'y' ? { ...plane, enabled: value } : plane
        ));
      }
    },
    'Y Position': { 
      value: 0, 
      min: -3, 
      max: 3, 
      step: 0.1,
      onChange: (value) => {
        setClippingPlanes(prev => prev.map(plane => 
          plane.id === 'y' ? { ...plane, position: [0, value, 0] } : plane
        ));
      }
    },
    'Enable Z Clip': { 
      value: false,
      onChange: (value) => {
        setClippingPlanes(prev => prev.map(plane => 
          plane.id === 'z' ? { ...plane, enabled: value } : plane
        ));
      }
    },
    'Z Position': { 
      value: 0, 
      min: -3, 
      max: 3, 
      step: 0.1,
      onChange: (value) => {
        setClippingPlanes(prev => prev.map(plane => 
          plane.id === 'z' ? { ...plane, position: [0, 0, value] } : plane
        ));
      }
    }
  });

  const handleControlsReady = (controlsInstance, cameraInstance) => {
    setControls(controlsInstance);
    setCamera(cameraInstance);
  };

  const handleMeshClick = (point) => {
    console.log('Mesh clicked at:', point);
    
    if (!measurementMode) return;

    if (!currentMeasurement) {
      // Start new measurement
      setCurrentMeasurement({ start: point, end: null });
      console.log('Started measurement at:', point);
    } else {
      // Complete measurement
      const distance = Math.sqrt(
        Math.pow(point[0] - currentMeasurement.start[0], 2) +
        Math.pow(point[1] - currentMeasurement.start[1], 2) +
        Math.pow(point[2] - currentMeasurement.start[2], 2)
      );
      
      const newMeasurement = {
        id: Date.now(),
        start: currentMeasurement.start,
        end: point,
        distance: distance
      };
      
      console.log('Completed measurement:', newMeasurement);
      setMeasurements(prev => [...prev, newMeasurement]);
      setCurrentMeasurement(null);
    }
  };

  const resetView = () => {
    if (camera && controls) {
      camera.position.set(3, 3, 3);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  };

  const pan = (dx, dy) => {
    if (controls) {
      controls.target.x += dx;
      controls.target.y += dy;
      controls.update();
    }
  };

  const zoom = (factor) => {
    if (camera) {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      camera.position.add(direction.multiplyScalar((factor - 1) * 2));
      if (controls) controls.update();
    }
  };

  const rotateView = (axis, angle) => {
    if (camera && controls) {
      const spherical = new THREE.Spherical();
      const target = controls.target;
      const position = camera.position.clone().sub(target);
      
      spherical.setFromVector3(position);
      
      if (axis === 'horizontal') {
        spherical.theta += angle;
      } else if (axis === 'vertical') {
        spherical.phi += angle;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
      }
      
      position.setFromSpherical(spherical);
      camera.position.copy(position.add(target));
      controls.update();
    }
  };

  return (
    <div style={{ position: 'relative', width: '2000px', height: '700px' }}>
      <Canvas 
        camera={{ position: [3, 3, 3], fov: 75 }}
        gl={{ localClippingEnabled: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[1, 1, 1]} />
        <Suspense fallback={null}>
          <Model clippingPlanes={clippingPlanes} />
          
          {/* Render measurements */}
          {measurementControls['Show Measurements'] && measurements.map(measurement => (
            <MeasurementLine
              key={measurement.id}
              start={measurement.start}
              end={measurement.end}
              distance={measurement.distance}
              visible={true}
            />
          ))}
          
          {/* Render current measurement in progress */}
          {currentMeasurement && (
            <mesh position={currentMeasurement.start}>
              <sphereGeometry args={[0.05]} />
              <meshBasicMaterial color="lime" />
            </mesh>
          )}
          
          {/* Render clipping plane visualizations */}
          {clippingPlanes.map(plane => (
            <ClippingPlaneViz
              key={plane.id}
              position={plane.position}
              normal={plane.normal}
              enabled={plane.enabled}
            />
          ))}
        </Suspense>
        
        <CameraControls onControlsReady={handleControlsReady} />
        <ClickHandler onMeshClick={handleMeshClick} measurementMode={measurementMode} />
      </Canvas>
      
      {/* Control Panel */}
      <div className="controls-panel" style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '5px',
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        borderRadius: '5px'
      }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={resetView} style={{ padding: '5px 10px', fontSize: '12px' }}>
            Reset View
          </button>
          <button onClick={() => zoom(1.2)} style={{ padding: '5px 10px', fontSize: '12px' }}>
            Zoom In
          </button>
          <button onClick={() => zoom(0.8)} style={{ padding: '5px 10px', fontSize: '12px' }}>
            Zoom Out
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={() => pan(-0.5, 0)} style={{ padding: '5px 10px', fontSize: '12px' }}>
            ← Pan
          </button>
          <button onClick={() => pan(0.5, 0)} style={{ padding: '5px 10px', fontSize: '12px' }}>
            Pan →
          </button>
          <button onClick={() => pan(0, 0.5)} style={{ padding: '5px 10px', fontSize: '12px' }}>
            ↑ Pan
          </button>
          <button onClick={() => pan(0, -0.5)} style={{ padding: '5px 10px', fontSize: '12px' }}>
            ↓ Pan
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={() => rotateView('horizontal', 0.2)} style={{ padding: '5px 10px', fontSize: '12px' }}>
            ↻ Rotate
          </button>
          <button onClick={() => rotateView('horizontal', -0.2)} style={{ padding: '5px 10px', fontSize: '12px' }}>
            ↺ Rotate
          </button>
          <button onClick={() => rotateView('vertical', 0.2)} style={{ padding: '5px 10px', fontSize: '12px' }}>
            ↕ Tilt
          </button>
          <button onClick={() => rotateView('vertical', -0.2)} style={{ padding: '5px 10px', fontSize: '12px' }}>
            ↕ Tilt
          </button>
        </div>
      </div>

      {/* Measurement Status */}
      {measurementMode && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: currentMeasurement ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {currentMeasurement ? 
            'Click second point to complete measurement' : 
            'Click first point to start measurement'
          }
        </div>
      )}

      {/* Measurements List */}
      {measurements.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          maxHeight: '200px',
          overflowY: 'auto',
          minWidth: '250px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Measurements ({measurements.length})</h4>
          {measurements.map((measurement, index) => (
            <div key={measurement.id} style={{ fontSize: '12px', marginBottom: '5px', fontFamily: 'monospace' }}>
              #{index + 1}: {measurement.distance.toFixed(3)} units
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Preload the GLB model
useGLTF.preload('/models/model.glb');

export default GLBViewer;