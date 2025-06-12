import { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import React, { Suspense } from 'react';
import { OrbitControls, Html } from '@react-three/drei';
import { useControls, button } from 'leva';
import * as THREE from 'three';

// Import various loaders
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader';

// File type detection
const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

const getSupportedFormats = () => {
  return {
    'stl': 'STL Files',
    'obj': 'OBJ Files', 
    'ply': 'PLY Files',
    'gltf': 'GLTF Files',
    'glb': 'GLB Files',
    'fbx': 'FBX Files',
    'dae': 'Collada Files',
    '3mf': '3MF Files'
  };
};

// Universal Model Loader Component
const UniversalModel = ({ filePath, clippingPlanes, onLoadComplete, onLoadError }) => {
  const meshRef = useRef();
  const [modelData, setModelData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { color, scale, wireframe, posX, posY, posZ } = useControls('Model Controls', {
    color: '#ffaa00',
    scale: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 },
    wireframe: false,
    posX: { value: 0, min: -10, max: 10, step: 0.1 },
    posY: { value: 0, min: -10, max: 10, step: 0.1 },
    posZ: { value: 0, min: -10, max: 10, step: 0.1 },
  });

  // Load model based on file extension
  useEffect(() => {
    if (!filePath) return;

    const loadModel = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const extension = getFileExtension(filePath);
        let loader;
        let geometry = null;
        let scene = null;
        
        switch (extension) {
          case 'stl':
            loader = new STLLoader();
            geometry = await new Promise((resolve, reject) => {
              loader.load(filePath, resolve, undefined, reject);
            });
            break;
            
          case 'obj':
            loader = new OBJLoader();
            scene = await new Promise((resolve, reject) => {
              loader.load(filePath, resolve, undefined, reject);
            });
            // Extract geometry from OBJ group
            if (scene.children.length > 0) {
              geometry = scene.children[0].geometry;
            }
            break;
            
          case 'ply':
            loader = new PLYLoader();
            geometry = await new Promise((resolve, reject) => {
              loader.load(filePath, resolve, undefined, reject);
            });
            break;
            
          case 'gltf':
          case 'glb':
            loader = new GLTFLoader();
            const gltfData = await new Promise((resolve, reject) => {
              loader.load(filePath, resolve, undefined, reject);
            });
            scene = gltfData.scene;
            // Extract geometry from first mesh found
            scene.traverse((child) => {
              if (child.isMesh && !geometry) {
                geometry = child.geometry;
              }
            });
            break;
            
          case 'fbx':
            loader = new FBXLoader();
            scene = await new Promise((resolve, reject) => {
              loader.load(filePath, resolve, undefined, reject);
            });
            // Extract geometry from FBX
            scene.traverse((child) => {
              if (child.isMesh && !geometry) {
                geometry = child.geometry;
              }
            });
            break;
            
          case 'dae':
            loader = new ColladaLoader();
            const colladaData = await new Promise((resolve, reject) => {
              loader.load(filePath, resolve, undefined, reject);
            });
            scene = colladaData.scene;
            scene.traverse((child) => {
              if (child.isMesh && !geometry) {
                geometry = child.geometry;
              }
            });
            break;
            
          case '3mf':
            loader = new ThreeMFLoader();
            scene = await new Promise((resolve, reject) => {
              loader.load(filePath, resolve, undefined, reject);
            });
            if (scene.children.length > 0) {
              geometry = scene.children[0].geometry;
            }
            break;
            
          default:
            throw new Error(`Unsupported file format: ${extension}`);
        }

        if (!geometry) {
          throw new Error('No geometry found in the loaded file');
        }

        // Process geometry
        if (geometry.center) geometry.center();
        if (geometry.computeBoundingBox) geometry.computeBoundingBox();
        if (geometry.computeVertexNormals) geometry.computeVertexNormals();

        setModelData({ geometry, originalScene: scene });
        
        // Calculate dimensions
        const box = geometry.boundingBox;
        if (box) {
          const size = new THREE.Vector3();
          box.getSize(size);
          
          // Update dimension controls
          const dimensionControls = useControls('Dimensions', {
            'Dimension X': { value: parseFloat(size.x.toFixed(3)), editable: false },
            'Dimension Y': { value: parseFloat(size.y.toFixed(3)), editable: false },
            'Dimension Z': { value: parseFloat(size.z.toFixed(3)), editable: false },
          });
        }
        
        if (onLoadComplete) onLoadComplete(geometry);
        
      } catch (err) {
        console.error('Error loading model:', err);
        setError(err.message);
        if (onLoadError) onLoadError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();
  }, [filePath]);

  // Apply clipping planes
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

  if (isLoading) {
    return (
      <Html center>
        <div style={{ color: 'white', fontSize: '16px' }}>Loading model...</div>
      </Html>
    );
  }

  if (error) {
    return (
      <Html center>
        <div style={{ color: 'red', fontSize: '16px', textAlign: 'center' }}>
          Error loading model:<br />
          {error}
        </div>
      </Html>
    );
  }

  if (!modelData || !modelData.geometry) {
    return null;
  }

  return (
    <mesh 
      ref={meshRef}
      geometry={modelData.geometry} 
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

// File Upload Component
const FileUploader = ({ onFileSelect, supportedFormats }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const handleFileSelect = (file) => {
    const extension = getFileExtension(file.name);
    if (supportedFormats[extension]) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      onFileSelect(url, file.name);
    } else {
      alert(`Unsupported file format. Supported formats: ${Object.keys(supportedFormats).join(', ')}`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div style={{ margin: '20px 0' }}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragOver ? '#007bff' : '#ccc'}`,
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragOver ? '#f0f8ff' : '#f9f9f9',
          transition: 'all 0.3s ease'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={Object.keys(supportedFormats).map(ext => `.${ext}`).join(',')}
          onChange={(e) => {
            if (e.target.files.length > 0) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          style={{ display: 'none' }}
        />
        
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          {selectedFile ? `Selected: ${selectedFile.name}` : 'Drop a 3D file here or click to browse'}
        </div>
        
        <div style={{ fontSize: '14px', color: '#666' }}>
          Supported formats: {Object.values(supportedFormats).join(', ')}
        </div>
      </div>
    </div>
  );
};

// Main Viewer Component (keeping your existing measurement and clipping logic)
const MultiFormatViewer = () => {
  const [currentFile, setCurrentFile] = useState('/models/u.STL'); // Default file
  const [fileName, setFileName] = useState('u.STL');
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

  const supportedFormats = getSupportedFormats();

  const handleFileSelect = (fileUrl, filename) => {
    setCurrentFile(fileUrl);
    setFileName(filename);
    // Clear measurements when loading new file
    setMeasurements([]);
    setCurrentMeasurement(null);
  };

  // ... (keep all your existing measurement and clipping logic)

  return (
    <div>
      <FileUploader 
        onFileSelect={handleFileSelect}
        supportedFormats={supportedFormats}
      />
      
      <div style={{ position: 'relative', width: '1000px', height: '500px' }}>
        <Canvas 
          camera={{ position: [3, 3, 3], fov: 75 }}
          gl={{ localClippingEnabled: true }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[1, 1, 1]} />
          <Suspense fallback={null}>
            <UniversalModel 
              filePath={currentFile}
              clippingPlanes={clippingPlanes}
              onLoadComplete={(geometry) => {
                console.log('Model loaded successfully:', geometry);
              }}
              onLoadError={(error) => {
                console.error('Model loading failed:', error);
              }}
            />
            
            {/* Your existing measurement and clipping plane visualization components */}
          </Suspense>
          
          <OrbitControls />
        </Canvas>
        
        {/* Current file info */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '3px',
          fontSize: '12px'
        }}>
          Current file: {fileName}
        </div>
      </div>
    </div>
  );
};

export default MultiFormatViewer;