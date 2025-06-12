import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useControls, button } from 'leva';
import * as THREE from 'three';

// Import loaders
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// File type categories
const FILE_CATEGORIES = {
  NATIVE: ['stl', 'obj', 'ply', 'gltf', 'glb', 'fbx', 'dae', '3mf'],
  CAD: ['step', 'stp', 'iges', 'igs', 'brep', '3dm', 'dwg', 'dxf'],
  MESH: ['off', 'x3d', 'wrl']
};

const ALL_SUPPORTED_FORMATS = [...FILE_CATEGORIES.NATIVE, ...FILE_CATEGORIES.CAD, ...FILE_CATEGORIES.MESH];

// Conversion service client
class ConversionService {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async convertFile(file, options = {}) {
    const formData = new FormData();
    formData.append('cadFile', file);
    formData.append('precision', options.precision || '0.1');
    formData.append('angularDeflection', options.angularDeflection || '0.1');

    try {
      const response = await fetch(`${this.baseUrl}/convert`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Conversion failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Conversion service error:', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Enhanced File Uploader with Conversion
const AdvancedFileUploader = ({ onFileReady, onLoadingChange }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState('');
  const [serviceAvailable, setServiceAvailable] = useState(false);
  const fileInputRef = useRef();
  const conversionService = useRef(new ConversionService());

  // Check service availability on mount
  useEffect(() => {
    const checkService = async () => {
      const available = await conversionService.current.checkHealth();
      setServiceAvailable(available);
      if (!available) {
        console.warn('CAD conversion service is not available. CAD files will not be supported.');
      }
    };
    checkService();
  }, []);

  const getFileCategory = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (FILE_CATEGORIES.NATIVE.includes(ext)) return 'NATIVE';
    if (FILE_CATEGORIES.CAD.includes(ext)) return 'CAD';
    if (FILE_CATEGORIES.MESH.includes(ext)) return 'MESH';
    return 'UNKNOWN';
  };

  const handleFileSelect = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (!ALL_SUPPORTED_FORMATS.includes(extension)) {
      alert(`Unsupported file format: ${extension}`);
      return;
    }

    setSelectedFile(file);
    const category = getFileCategory(file.name);

    try {
      if (category === 'NATIVE') {
        // Direct loading for native formats
        const url = URL.createObjectURL(file);
        onFileReady(url, file.name, extension);
      } else if (category === 'CAD') {
        // Conversion required for CAD formats
        if (!serviceAvailable) {
          alert('CAD conversion service is not available. Please start the conversion server.');
          return;
        }

        setIsConverting(true);
        onLoadingChange(true);
        setConversionProgress('Uploading file...');

        const conversionOptions = {
          precision: 0.1,
          angularDeflection: 0.1
        };

        setConversionProgress('Converting to STL...');
        const result = await conversionService.current.convertFile(file, conversionOptions);
        
        setConversionProgress('Download converted file...');
        const convertedUrl = `${conversionService.current.baseUrl}${result.downloadUrl}`;
        
        onFileReady(convertedUrl, file.name, 'stl');
        setConversionProgress('Conversion complete!');
        
        setTimeout(() => {
          setIsConverting(false);
          onLoadingChange(false);
          setConversionProgress('');
        }, 1000);

      } else {
        alert(`Format ${extension} requires additional processing not yet implemented.`);
      }
    } catch (error) {
      console.error('File processing error:', error);
      alert(`Error processing file: ${error.message}`);
      setIsConverting(false);
      onLoadingChange(false);
      setConversionProgress('');
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

  const getNativeFormats = () => FILE_CATEGORIES.NATIVE.join(', ').toUpperCase();
  const getCADFormats = () => FILE_CATEGORIES.CAD.join(', ').toUpperCase();

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
          cursor: isConverting ? 'not-allowed' : 'pointer',
          backgroundColor: dragOver ? '#f0f8ff' : '#f9f9f9',
          transition: 'all 0.3s ease',
          opacity: isConverting ? 0.7 : 1
        }}
        onClick={() => !isConverting && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALL_SUPPORTED_FORMATS.map(ext => `.${ext}`).join(',')}
          onChange={(e) => {
            if (e.target.files.length > 0 && !isConverting) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          style={{ display: 'none' }}
          disabled={isConverting}
        />
        
        {isConverting ? (
          <div>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#007bff' }}>
              Converting CAD File...
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
              {conversionProgress}
            </div>
            <div style={{ 
              width: '100%', 
              height: '4px', 
              backgroundColor: '#e0e0e0', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#007bff',
                animation: 'progress 2s infinite'
              }} />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              {selectedFile ? `Selected: ${selectedFile.name}` : 'Drop a 3D file here or click to browse'}
            </div>
            
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
              <div><strong>Native formats (direct loading):</strong> {getNativeFormats()}</div>
              <div style={{ marginTop: '5px' }}>
                <strong>CAD formats (conversion required):</strong> {getCADFormats()}
                {!serviceAvailable && (
                  <span style={{ color: 'red', marginLeft: '10px' }}>
                    (Conversion service offline)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

// Universal Model Component (enhanced from previous version)
const UniversalModel = ({ filePath, fileName, fileFormat, clippingPlanes, onLoadComplete, onLoadError }) => {
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

  // Enhanced loader with better error handling
  useEffect(() => {
    if (!filePath) return;

    const loadModel = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let loader;
        let geometry = null;
        let scene = null;
        
        // Use the provided format or detect from filename
        const extension = fileFormat || fileName.split('.').pop().toLowerCase();
        
        switch (extension) {
          case 'stl':
            loader = new STLLoader();
            geometry = await new Promise((resolve, reject) => {
              loader.load(
                filePath, 
                resolve, 
                (progress) => console.log('Loading progress:', progress),
                reject
              );
            });
            break;
            
          case 'obj':
            loader = new OBJLoader();
            scene = await new Promise((resolve, reject) => {
              loader.load(filePath, resolve, undefined, reject);
            });
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
            scene.traverse((child) => {
              if (child.isMesh && !geometry) {
                geometry = child.geometry;
              }
            });
            break;
            
          default:
            throw new Error(`Loader not implemented for format: ${extension}`);
        }

        if (!geometry) {
          throw new Error('No geometry found in the loaded file');
        }

        // Process geometry
        if (geometry.center) geometry.center();
        if (geometry.computeBoundingBox) geometry.computeBoundingBox();
        if (geometry.computeVertexNormals) geometry.computeVertexNormals();

        setModelData({ geometry, originalScene: scene });
        
        // Calculate and display dimensions
        if (geometry.boundingBox) {
          const box = geometry.boundingBox;
          const size = new THREE.Vector3();
          box.getSize(size);
          
          console.log('Model dimensions:', {
            x: size.x.toFixed(3),
            y: size.y.toFixed(3),
            z: size.z.toFixed(3)
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
  }, [filePath, fileName, fileFormat]);

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

  if (isLoading) {
    return (
      <Html center>
        <div style={{ 
          color: 'white', 
          fontSize: '16px', 
          background: 'rgba(0,0,0,0.8)', 
          padding: '10px', 
          borderRadius: '5px' 
        }}>
          Loading {fileName}...
        </div>
      </Html>
    );
  }

  if (error) {
    return (
      <Html center>
        <div style={{ 
          color: 'red', 
          fontSize: '16px', 
          textAlign: 'center',
          background: 'rgba(0,0,0,0.8)', 
          padding: '10px', 
          borderRadius: '5px',
          maxWidth: '300px'
        }}>
          Error loading {fileName}:<br />
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

// Main Integrated Viewer Component
const IntegratedCADViewer = () => {
  const [currentFile, setCurrentFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileFormat, setFileFormat] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clippingPlanes, setClippingPlanes] = useState([
    { id: 'x', position: [0, 0, 0], normal: [1, 0, 0], enabled: false },
    { id: 'y', position: [0, 0, 0], normal: [0, 1, 0], enabled: false },
    { id: 'z', position: [0, 0, 0], normal: [0, 0, 1], enabled: false }
  ]);

  // Clipping plane controls
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
      min: -5, 
      max: 5, 
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
      min: -5, 
      max: 5, 
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
      min: -5, 
      max: 5, 
      step: 0.1,
      onChange: (value) => {
        setClippingPlanes(prev => prev.map(plane => 
          plane.id === 'z' ? { ...plane, position: [0, 0, value] } : plane
        ));
      }
    }
  });

  const handleFileReady = (fileUrl, filename, format) => {
    setCurrentFile(fileUrl);
    setFileName(filename);
    setFileFormat(format);
    console.log(`File ready: ${filename} (${format})`);
  };

  const handleLoadingChange = (loading) => {
    setIsLoading(loading);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Universal CAD/3D Model Viewer
      </h1>
      
      <AdvancedFileUploader 
        onFileReady={handleFileReady}
        onLoadingChange={handleLoadingChange}
      />
      
      {(currentFile || isLoading) && (
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '600px', 
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <Canvas 
            camera={{ position: [5, 5, 5], fov: 75 }}
            gl={{ localClippingEnabled: true }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} />
            <pointLight position={[-10, -10, -5]} />
            
            <Suspense fallback={null}>
              {currentFile && !isLoading && (
                <UniversalModel 
                  filePath={currentFile}
                  fileName={fileName}
                  fileFormat={fileFormat}
                  clippingPlanes={clippingPlanes}
                  onLoadComplete={(geometry) => {
                    console.log('Model loaded successfully');
                  }}
                  onLoadError={(error) => {
                    console.error('Model loading failed:', error);
                  }}
                />
              )}
            </Suspense>
            
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
            />
          </Canvas>
          
          {/* File info overlay */}
          {fileName && (
            <div style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}>
              {fileName} ({fileFormat.toUpperCase()})
            </div>
          )}
        </div>
      )}
      
      {!currentFile && !isLoading && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          color: '#666',
          fontSize: '18px'
        }}>
          Upload a 3D file to begin viewing
        </div>
      )}
    </div>
  );
};

export default IntegratedCADViewer;