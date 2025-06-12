import { useState, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import React, { Suspense, useEffect } from 'react';
import { OrbitControls, Html } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { useLoader } from '@react-three/fiber'
import { useControls, button } from 'leva';
import * as THREE from 'three';
import { Vector3 } from 'three';
import ViewPresets from './ViewPresets';






// 3D Grid Component
const Grid3D = ({ size = 10, divisions = 10, color = '#888888', visible = true }) => {
  if (!visible) return null;

  const gridRef = useRef();

  useEffect(() => {
    if (!gridRef.current) return;

    // Clear existing children
    while (gridRef.current.children.length) {
      gridRef.current.children[0].removeFromParent();
    }

    const step = size / divisions;
    const halfSize = size / 2;

    // Create geometry for all grid lines
    const points = [];

    // XY plane grid (Z = 0)
    for (let i = 0; i <= divisions; i++) {
      const pos = -halfSize + i * step;
      // Horizontal lines
      points.push(new THREE.Vector3(-halfSize, pos, 0));
      points.push(new THREE.Vector3(halfSize, pos, 0));
      // Vertical lines
      points.push(new THREE.Vector3(pos, -halfSize, 0));
      points.push(new THREE.Vector3(pos, halfSize, 0));
    }

    // XZ plane grid (Y = 0)
    for (let i = 0; i <= divisions; i++) {
      const pos = -halfSize + i * step;
      // Horizontal lines (along X)
      points.push(new THREE.Vector3(-halfSize, 0, pos));
      points.push(new THREE.Vector3(halfSize, 0, pos));
      // Vertical lines (along Z)
      points.push(new THREE.Vector3(pos, 0, -halfSize));
      points.push(new THREE.Vector3(pos, 0, halfSize));
    }

    // YZ plane grid (X = 0)
    for (let i = 0; i <= divisions; i++) {
      const pos = -halfSize + i * step;
      // Horizontal lines (along Y)
      points.push(new THREE.Vector3(0, -halfSize, pos));
      points.push(new THREE.Vector3(0, halfSize, pos));
      // Vertical lines (along Z)
      points.push(new THREE.Vector3(0, pos, -halfSize));
      points.push(new THREE.Vector3(0, pos, halfSize));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.5
    });
    const gridLines = new THREE.LineSegments(geometry, material);
    
    gridRef.current.add(gridLines);

  }, [size, divisions, color, visible]);

  return <group ref={gridRef} />;
};

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
  const geometry = useLoader(STLLoader, '/models/u.STL');
  const meshRef = useRef();
  
  geometry.center();
  geometry.computeBoundingBox();

  const box = geometry.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);

  const { color, scale, wireframe, posX, posY, posZ } = useControls('Model Controls', {
    color: '#ffaa00',
    scale: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 },
    wireframe: false,
    posX: { value: 0, min: -10, max: 10, step: 0.1 },
    posY: { value: 0, min: -10, max: 10, step: 0.1 },
    posZ: { value: 0, min: -10, max: 10, step: 0.1 },
  });

  useControls('Dimensions', {
    'Dimension X': { value: parseFloat(size.x.toFixed(3)), editable: false },
    'Dimension Y': { value: parseFloat(size.y.toFixed(3)), editable: false },
    'Dimension Z': { value: parseFloat(size.z.toFixed(3)), editable: false },
  });

  // Apply clipping planes to material
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const activePlanes = clippingPlanes
        .filter(plane => plane.enabled)
        .map(plane => {
          const planeObject = new THREE.Plane();
          const normal = new THREE.Vector3(...plane.normal).normalize();
          const point = new THREE.Vector3(...plane.position);
          planeObject.setFromNormalAndCoplanarPoint(normal, point);
          return planeObject;
        });
      
      if (activePlanes.length > 0) {
        meshRef.current.material.clippingPlanes = activePlanes;
        meshRef.current.material.clipShadows = true;
        meshRef.current.material.side = THREE.DoubleSide;
      } else {
        meshRef.current.material.clippingPlanes = [];
      }
      meshRef.current.material.needsUpdate = true;
    }
  }, [clippingPlanes]);

  // Enable clipping globally
  useEffect(() => {
    const renderer = meshRef.current?.parent?.parent?.parent?.__r3f?.gl;
    if (renderer) {
      renderer.localClippingEnabled = true;
    }
  }, []);

  return (
    <mesh 
      ref={meshRef}
      geometry={geometry} 
      scale={[scale, scale, scale]} 
      position={[posX, posY, posZ]}
    >
      <meshStandardMaterial 
        color={color} 
        wireframe={wireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
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

const STLViewer = () => {
  const [controls, setControls] = useState(null);
  const [camera, setCamera] = useState(null);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurements, setMeasurements] = useState([]);
  const [usePresetCamera, setUsePresetCamera] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState(null);
  const [clippingPlanes, setClippingPlanes] = useState([
    { id: 'x', position: [0, 0, 0], normal: [1, 0, 0], enabled: false },
    { id: 'y', position: [0, 0, 0], normal: [0, 1, 0], enabled: false },
    { id: 'z', position: [0, 0, 0], normal: [0, 0, 1], enabled: false }
  ]);

  // Grid Controls
  const gridControls = useControls('Grid Settings', {
    'Show Grid': { value: true },
    'Grid Size': { value: 10, min: 1, max: 50, step: 1 },
    'Grid Divisions': { value: 10, min: 5, max: 50, step: 5 },
    'Grid Color': '#888888',
  });

  // View Controls
  // const viewControls = useControls('View Presets', {
  //   'Isometric View': button(() => setViewPreset('isometric')),
  //   'Front View': button(() => setViewPreset('front')),
  //   'Back View': button(() => setViewPreset('back')),
  //   'Top View': button(() => setViewPreset('top')),
  //   'Bottom View': button(() => setViewPreset('bottom')),
  //   'Left View': button(() => setViewPreset('left')),
  //   'Right View': button(() => setViewPreset('right')),
  //   'Orthographic': { 
  //     value: false,
  //     onChange: (value) => toggleProjection(value)
  //   }
  // });

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
      camera.up.set(0, 1, 0);
      camera.fov = 75;
      camera.updateProjectionMatrix();
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
    <div style={{ position: 'relative', width: '1000px', height: '500px' }}>
      <Canvas 
        camera={{ position: [3, 3, 3], fov: 75 }}
        gl={{ localClippingEnabled: true }}
      >

         {!usePresetCamera && <OrbitControls />}

        <ambientLight intensity={0.5} />
        <directionalLight position={[1, 1, 1]} />
        
        {/* Add the ViewPresets component */}
      {/* <ViewPresets /> */}

      {/* View Presets Camera */}
      {usePresetCamera && <ViewPresets active={usePresetCamera} onExit={() => setUsePresetCamera(false)} />}
       {/* Toggle Button */}
      <Html position={[-4, -4, -4]}>
        {/* <button
          style={{ position: 'absolute', top: 10, left: 10, padding: '8px', zIndex: 10 }}
          onClick={() => setUsePresetCamera(!usePresetCamera)}
        >
          {usePresetCamera ? 'Switch to Free View' : 'Switch to Preset Views'}
        </button> */}
      </Html>
        {/* 3D Grid */}
        <Grid3D 
          size={gridControls['Grid Size']}
          divisions={gridControls['Grid Divisions']}
          color={gridControls['Grid Color']}
          visible={gridControls['Show Grid']}
        />

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
          </button></div>

            <div style={{ display: 'flex', gap: '5px' }}>
           <button
          style={{  padding: '5px 10px', }}
          onClick={() => setUsePresetCamera(!usePresetCamera)}
        >
          {usePresetCamera ? 'Switch to Free View' : 'Switch to Preset Views'}
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

export default STLViewer;