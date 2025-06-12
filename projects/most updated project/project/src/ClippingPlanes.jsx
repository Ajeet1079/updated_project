import React from 'react';
import * as THREE from 'three';

// Clipping Plane Visualization
export const ClippingPlaneViz = ({ position, normal, enabled, color = 'yellow' }) => {
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

// Clipping Plane Manager Class
export class ClippingPlaneManager {
  constructor() {
    this.planes = [
      { id: 'x', position: [0, 0, 0], normal: [1, 0, 0], enabled: false },
      { id: 'y', position: [0, 0, 0], normal: [0, 1, 0], enabled: false },
      { id: 'z', position: [0, 0, 0], normal: [0, 0, 1], enabled: false }
    ];
  }

  updatePlane(id, updates) {
    this.planes = this.planes.map(plane => 
      plane.id === id ? { ...plane, ...updates } : plane
    );
    return this.planes;
  }

  getActivePlanes() {
    return this.planes
      .filter(plane => plane.enabled)
      .map(plane => {
        const planeObject = new THREE.Plane();
        const normal = new THREE.Vector3(...plane.normal).normalize();
        const point = new THREE.Vector3(...plane.position);
        planeObject.setFromNormalAndCoplanarPoint(normal, point);
        return planeObject;
      });
  }

  enablePlane(id, enabled) {
    return this.updatePlane(id, { enabled });
  }

  setPlanePosition(id, position) {
    return this.updatePlane(id, { position });
  }

  reset() {
    this.planes = this.planes.map(plane => ({ ...plane, enabled: false, position: [0, 0, 0] }));
    return this.planes;
  }
}