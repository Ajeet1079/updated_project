import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export const Grid3D = ({ 
  size = 10, 
  divisions = 10, 
  color = '#888888', 
  visible = true 
}) => {
  const gridRef = useRef();

  useEffect(() => {
    if (!visible || !gridRef.current) return;

    // Clear existing children
    while (gridRef.current.children.length) {
      gridRef.current.remove(gridRef.current.children[0]);
    }

    const step = size / divisions;
    const halfSize = size / 2;
    const points = [];

    // Helper function to add grid lines for a plane
    const addPlaneLines = (xAxis, yAxis, fixedAxis, fixedValue = 0) => {
      for (let i = 0; i <= divisions; i++) {
        const pos = -halfSize + i * step;
        
        // Horizontal lines
        points.push(new THREE.Vector3(
          xAxis === 'x' ? -halfSize : fixedAxis === 'x' ? fixedValue : pos,
          xAxis === 'y' ? -halfSize : fixedAxis === 'y' ? fixedValue : pos,
          xAxis === 'z' ? -halfSize : fixedAxis === 'z' ? fixedValue : pos
        ));
        points.push(new THREE.Vector3(
          xAxis === 'x' ? halfSize : fixedAxis === 'x' ? fixedValue : pos,
          xAxis === 'y' ? halfSize : fixedAxis === 'y' ? fixedValue : pos,
          xAxis === 'z' ? halfSize : fixedAxis === 'z' ? fixedValue : pos
        ));

        // Vertical lines
        points.push(new THREE.Vector3(
          yAxis === 'x' ? -halfSize : fixedAxis === 'x' ? fixedValue : pos,
          yAxis === 'y' ? -halfSize : fixedAxis === 'y' ? fixedValue : pos,
          yAxis === 'z' ? -halfSize : fixedAxis === 'z' ? fixedValue : pos
        ));
        points.push(new THREE.Vector3(
          yAxis === 'x' ? halfSize : fixedAxis === 'x' ? fixedValue : pos,
          yAxis === 'y' ? halfSize : fixedAxis === 'y' ? fixedValue : pos,
          yAxis === 'z' ? halfSize : fixedAxis === 'z' ? fixedValue : pos
        ));
      }
    };

    // Create grid lines for all three planes
    addPlaneLines('x', 'y', 'z', 0); // XY plane (Z=0)
    addPlaneLines('x', 'z', 'y', 0); // XZ plane (Y=0)
    addPlaneLines('y', 'z', 'x', 0); // YZ plane (X=0)

    // Create the line geometry and material
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.5,
      linewidth: 1
    });

    const gridLines = new THREE.LineSegments(geometry, material);
    gridRef.current.add(gridLines);

    // Add axes helpers
    const axesSize = size * 0.75;
    const axesHelper = new THREE.AxesHelper(axesSize);
    gridRef.current.add(axesHelper);

    // Cleanup function
    return () => {
      if (gridRef.current) {
        while (gridRef.current.children.length) {
          gridRef.current.remove(gridRef.current.children[0]);
        }
      }
    };
  }, [size, divisions, color, visible]);

  if (!visible) return null;

  return <group ref={gridRef} />;
};