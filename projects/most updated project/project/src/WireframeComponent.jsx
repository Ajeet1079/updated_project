import React, { useEffect, useRef } from 'react';
import { useControls } from 'leva';
import * as THREE from 'three';

// Wireframe Hook
export const useWireframe = () => {
  const wireframeControls = useControls('Wireframe Controls', {
    'Enable Wireframe': { value: false },
    'Wireframe Color': { value: '#ffffff' },
    'Wireframe Opacity': { value: 1.0, min: 0.1, max: 1.0, step: 0.1 },
    'Show Solid': { value: true },
    'Solid Opacity': { value: 1.0, min: 0.1, max: 1.0, step: 0.1 }
  });

  return wireframeControls;
};

// Wireframe Manager Component
export const WireframeManager = ({ meshRef, wireframeControls, modelColor }) => {
  const wireframeMeshRef = useRef();

  // Create and manage wireframe mesh
  useEffect(() => {
    if (!meshRef.current || !wireframeControls['Enable Wireframe']) {
      // Remove wireframe mesh if it exists
      if (wireframeMeshRef.current) {
        wireframeMeshRef.current.parent?.remove(wireframeMeshRef.current);
        wireframeMeshRef.current = null;
      }
      return;
    }

    const originalMesh = meshRef.current;
    const geometry = originalMesh.geometry;

    // Create wireframe mesh if it doesn't exist
    if (!wireframeMeshRef.current) {
      const wireframeGeometry = new THREE.WireframeGeometry(geometry);
      const wireframeMaterial = new THREE.LineBasicMaterial({ 
        color: wireframeControls['Wireframe Color'],
        transparent: true,
        opacity: wireframeControls['Wireframe Opacity']
      });

      wireframeMeshRef.current = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
      
      // Copy transform from original mesh
      wireframeMeshRef.current.position.copy(originalMesh.position);
      wireframeMeshRef.current.rotation.copy(originalMesh.rotation);
      wireframeMeshRef.current.scale.copy(originalMesh.scale);
      
      // Add to the same parent as the original mesh
      originalMesh.parent.add(wireframeMeshRef.current);
    }

    // Update wireframe material properties
    if (wireframeMeshRef.current) {
      wireframeMeshRef.current.material.color.set(wireframeControls['Wireframe Color']);
      wireframeMeshRef.current.material.opacity = wireframeControls['Wireframe Opacity'];
      wireframeMeshRef.current.material.needsUpdate = true;
    }

  }, [meshRef, wireframeControls, wireframeControls['Enable Wireframe']]);

  // Update original mesh material properties
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material;
      
      // Set visibility of solid mesh
      material.visible = wireframeControls['Show Solid'];
      
      // Set opacity of solid mesh
      material.transparent = wireframeControls['Solid Opacity'] < 1.0;
      material.opacity = wireframeControls['Solid Opacity'];
      
      material.needsUpdate = true;
    }
  }, [meshRef, wireframeControls['Show Solid'], wireframeControls['Solid Opacity']]);

  // Sync transformations
  useEffect(() => {
    if (meshRef.current && wireframeMeshRef.current) {
      const originalMesh = meshRef.current;
      const wireframeMesh = wireframeMeshRef.current;
      
      // Copy transform properties
      wireframeMesh.position.copy(originalMesh.position);
      wireframeMesh.rotation.copy(originalMesh.rotation);
      wireframeMesh.scale.copy(originalMesh.scale);
    }
  });

  return null; // This component doesn't render anything directly
};

// Alternative Wireframe Component that renders inline
export const InlineWireframe = ({ geometry, position, rotation, scale, wireframeControls }) => {
  if (!wireframeControls['Enable Wireframe']) return null;

  return (
    <lineSegments position={position} rotation={rotation} scale={scale}>
      <wireframeGeometry args={[geometry]} />
      <lineBasicMaterial 
        color={wireframeControls['Wireframe Color']}
        transparent={true}
        opacity={wireframeControls['Wireframe Opacity']}
      />
    </lineSegments>
  );
};

export default WireframeManager;