import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { useControls, button } from 'leva';

const ViewPresets = ({ active, onExit }) => {
  const { set, camera: defaultCamera } = useThree();

  const presetCamera = useRef();
  const controlsRef = useRef();
  const animationRef = useRef();

  const originalPosition = useRef(new Vector3(5, 5, 5));
  const originalTarget = useRef(new Vector3(0, 0, 0));

  useEffect(() => {
    if (active && presetCamera.current) {
      set({ camera: presetCamera.current });
    } else {
      set({ camera: defaultCamera });
    }
  }, [active, set, defaultCamera]);

  const setViewPreset = (viewType) => {
    if (!presetCamera.current || !controlsRef.current) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const distance = 5;
    const target = controlsRef.current.target.clone();
    const newPosition = new Vector3();
    const newUp = new Vector3(0, 1, 0);

    switch (viewType) {
      case 'isometric':
        newPosition.set(distance, distance, distance);
        break;
      case 'front':
        newPosition.set(target.x, target.y, target.z + distance);
        break;
      case 'back':
        newPosition.set(target.x, target.y, target.z - distance);
        break;
      case 'top':
        newPosition.set(target.x, target.y + distance, target.z);
        newUp.set(0, 0, -1);
        break;
      case 'bottom':
        newPosition.set(target.x, target.y - distance, target.z);
        newUp.set(0, 0, 1);
        break;
      case 'left':
        newPosition.set(target.x - distance, target.y, target.z);
        break;
      case 'right':
        newPosition.set(target.x + distance, target.y, target.z);
        break;
      case 'reset':
        newPosition.copy(originalPosition.current);
        target.copy(originalTarget.current);
        break;
      default:
        return;
    }

    const startPosition = presetCamera.current.position.clone();
    const startTarget = controlsRef.current.target.clone();
    const startTime = performance.now();
    const duration = 500;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      presetCamera.current.position.lerpVectors(startPosition, newPosition, progress);

      if (!target.equals(startTarget)) {
        const currentTarget = new Vector3().lerpVectors(startTarget, target, progress);
        controlsRef.current.target.copy(currentTarget);
      }

      if (viewType === 'top' || viewType === 'bottom') {
        presetCamera.current.up.lerpVectors(presetCamera.current.up, newUp, progress);
      }

      presetCamera.current.lookAt(controlsRef.current.target);
      controlsRef.current.update();

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useControls('View Presets', {
    'Isometric': button(() => setViewPreset('isometric')),
    'Front': button(() => setViewPreset('front')),
    'Back': button(() => setViewPreset('back')),
    'Top': button(() => setViewPreset('top')),
    'Bottom': button(() => setViewPreset('bottom')),
    'Left': button(() => setViewPreset('left')),
    'Right': button(() => setViewPreset('right')),
    'Reset': button(() => setViewPreset('reset')),
    'Exit Preset View': button(() => onExit())
    
  });

  return (
    <>
      <perspectiveCamera ref={presetCamera} position={[5, 5, 5]} fov={75} near={0.1} far={1000} />
      <OrbitControls ref={controlsRef} />
    </>
  );
};

export default ViewPresets;
