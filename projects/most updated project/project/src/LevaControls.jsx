import { useControls, button } from 'leva';

// Grid Controls Hook
export const useGridControls = () => {
  return useControls('Grid Settings', {
    'Show Grid': { value: true },
    'Grid Size': { value: 10, min: 1, max: 50, step: 1 },
    'Grid Divisions': { value: 10, min: 5, max: 50, step: 5 },
    'Grid Color': '#888888',
  });
};

// Model Controls Hook
export const useModelControls = (boundingBox) => {
  const size = boundingBox ? {
    x: parseFloat(boundingBox.x.toFixed(3)),
    y: parseFloat(boundingBox.y.toFixed(3)),
    z: parseFloat(boundingBox.z.toFixed(3))
  } : { x: 0, y: 0, z: 0 };

  const modelControls = useControls('Model Controls', {
    color: '#ffaa00',
    scale: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 },
    wireframe: false,
    posX: { value: 0, min: -10, max: 10, step: 0.1 },
    posY: { value: 0, min: -10, max: 10, step: 0.1 },
    posZ: { value: 0, min: -10, max: 10, step: 0.1 },
  });

  useControls('Dimensions', {
    'Dimension X': { value: size.x, editable: false },
    'Dimension Y': { value: size.y, editable: false },
    'Dimension Z': { value: size.z, editable: false },
  });

  return modelControls;
};

// View Controls Hook
export const useViewControls = (viewPresets) => {
  return useControls('View Presets', {
    'Isometric View': button(() => viewPresets.setViewPreset('isometric')),
    'Front View': button(() => viewPresets.setViewPreset('front')),
    'Back View': button(() => viewPresets.setViewPreset('back')),
    'Top View': button(() => viewPresets.setViewPreset('top')),
    'Bottom View': button(() => viewPresets.setViewPreset('bottom')),
    'Left View': button(() => viewPresets.setViewPreset('left')),
    'Right View': button(() => viewPresets.setViewPreset('right')),
    'Orthographic': { 
      value: false,
      onChange: (value) => viewPresets.toggleProjection(value)
    }
  });
};

// Measurement Controls Hook
export const useMeasurementControls = (measurementMode, setMeasurementMode, clearMeasurements) => {
  return useControls('Measurement Tools', {
    'Toggle Measurement': button(() => {
      setMeasurementMode(!measurementMode);
      console.log('Measurement mode:', !measurementMode);
    }),
    'Clear Measurements': button(() => {
      clearMeasurements();
      console.log('Cleared all measurements');
    }),
    'Show Measurements': { value: true }
  });
};

// Clipping Plane Controls Hook
export const useClippingControls = (clippingManager, onUpdate) => {
  return useControls('Cross-Section Tools', {
    'Enable X Clip': { 
      value: false, 
      onChange: (value) => {
        const updatedPlanes = clippingManager.enablePlane('x', value);
        onUpdate(updatedPlanes);
      }
    },
    'X Position': { 
      value: 0, 
      min: -3, 
      max: 3, 
      step: 0.1,
      onChange: (value) => {
        const updatedPlanes = clippingManager.setPlanePosition('x', [value, 0, 0]);
        onUpdate(updatedPlanes);
      }
    },
    'Enable Y Clip': { 
      value: false,
      onChange: (value) => {
        const updatedPlanes = clippingManager.enablePlane('y', value);
        onUpdate(updatedPlanes);
      }
    },
    'Y Position': { 
      value: 0, 
      min: -3, 
      max: 3, 
      step: 0.1,
      onChange: (value) => {
        const updatedPlanes = clippingManager.setPlanePosition('y', [0, value, 0]);
        onUpdate(updatedPlanes);
      }
    },
    'Enable Z Clip': { 
      value: false,
      onChange: (value) => {
        const updatedPlanes = clippingManager.enablePlane('z', value);
        onUpdate(updatedPlanes);
      }
    },
    'Z Position': { 
      value: 0, 
      min: -3, 
      max: 3, 
      step: 0.1,
      onChange: (value) => {
        const updatedPlanes = clippingManager.setPlanePosition('z', [0, 0, value]);
        onUpdate(updatedPlanes);
      }
    }
  });
};