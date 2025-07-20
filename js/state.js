// State Management
import { config } from './config.js';

// Global application state
export const state = {
    // Three.js objects
    scenes: {},
    cameras: {},
    renderers: {},
    
    // Master 3D scene (shared between linear3D and hemi3D viewports)
    master3D: null,
    
    // 3D objects
    cube: null,
    viewpointSphere: null,
    imagePlane: null,
    hemisphere: null,
    hemisphereCenter: new THREE.Vector3(),
    
    // Parameters
    hemisphereRadius: config.DEFAULTS.hemisphereRadius,
    viewpointPosition: new THREE.Vector3(
        config.DEFAULTS.viewpointPosition.x,
        config.DEFAULTS.viewpointPosition.y,
        config.DEFAULTS.viewpointPosition.z
    ),
    cubeLocalRotation: { ...config.DEFAULTS.cubeLocalRotation },
    // Precise orientation using zx'z'' intrinsic Euler angles (in degrees)
    cubeEulerAngles: { ...config.DEFAULTS.cubeEulerAngles },
    rotationMode: config.DEFAULTS.rotationMode,
    zoomLevel2D: config.DEFAULTS.zoomLevel2D,
    zoom3D: config.DEFAULTS.zoom3D,
    
    // Groups for different elements
    groups: {},
    
    // Window management
    windowStates: {
        'linear3D-window': true,
        'linear2D-window': true,
        'hemi3D-window': true,
        'hemi2D-window': true
    },
    
    // Drag state for window management
    dragState: {
        isDragging: false,
        currentWindow: null,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0
    },
    
    // Performance optimization state
    needsUpdate: {
        linear: true,
        hemi: true,
        render: true
    },
    
    // Viewport-specific dirty tracking
    viewportDirty: {
        linear3D: true,
        linear2D: true,
        hemi3D: true,
        hemi2D: true
    },
    
    // Ray visualization toggles
    showRedRays: true,  // Controls whether to show full red rays
    
    // Linear projection plane shape toggle
    linearProjectionShape: 'circle', // 'square' or 'circle'
    
    // Cached data for performance
    cachedWorldVertices: null,
    lastCubeMatrixWorld: new THREE.Matrix4(),
    lastUpdateHash: '',
    
    // Performance monitoring
    performance: {
        updateTimeout: null,
        renderStats: {
            totalFrames: 0,
            skippedFrames: 0,
            lastFPS: 60,
            renderTime: 0,
            lastFPSTime: Date.now()
        }
    },
    
    // Flattened performance properties for easier access
    lastActivity: Date.now(),
    isIdle: false,
    frameCount: 0,
    lastFrameTime: Date.now(),
    targetFPS: config.PERFORMANCE.targetFPS,
    frameInterval: config.PERFORMANCE.frameInterval
};

// State helper functions
export function getImagePlaneZ() {
    return state.viewpointPosition.z - state.hemisphereRadius;
}

// Rotation mode management
export function setRotationMode(mode) {
    if (mode !== 'local' && mode !== 'precise') {
        console.warn(`Invalid rotation mode: ${mode}. Using 'local' instead.`);
        mode = 'local';
    }
    state.rotationMode = mode;
    console.log(`Rotation mode set to: ${mode}`);
}

export function isLocalRotationMode() {
    return state.rotationMode === 'local';
}

export function isPreciseOrientationMode() {
    return state.rotationMode === 'precise';
}

export function generateUpdateHash() {
    const pos = state.viewpointPosition;
    const rot = state.cube ? state.cube.rotation : { x: 0, y: 0, z: 0 };
    const cubePos = state.cube ? state.cube.position : { x: 0, y: 0, z: 0 };
    
    // Include rotation mode and appropriate rotation data
    const rotationData = state.rotationMode === 'local' 
        ? `${state.cubeLocalRotation.x},${state.cubeLocalRotation.y},${state.cubeLocalRotation.z}`
        : `${state.cubeEulerAngles.alpha},${state.cubeEulerAngles.beta},${state.cubeEulerAngles.gamma}`;
    
    return `${pos.x},${pos.y},${pos.z},${state.hemisphereRadius},${rot.x},${rot.y},${rot.z},${cubePos.x},${cubePos.y},${cubePos.z},${rotationData},${state.rotationMode}`;
}

export function markViewportsDirty(updateType = 'all') {
    if (updateType === 'all') {
        Object.keys(state.viewportDirty).forEach(key => state.viewportDirty[key] = true);
        state.needsUpdate.linear = true;
        state.needsUpdate.hemi = true;
    } else if (updateType === 'linear') {
        state.viewportDirty.linear3D = true;
        state.viewportDirty.linear2D = true;
        state.needsUpdate.linear = true;
    } else if (updateType === 'hemi') {
        state.viewportDirty.hemi3D = true;
        state.viewportDirty.hemi2D = true;
        state.needsUpdate.hemi = true;
    } else if (updateType === 'camera') {
        state.viewportDirty.linear3D = true;
        state.viewportDirty.hemi3D = true;
    } else if (updateType === 'zoom2D') {
        state.viewportDirty.linear2D = true;
        state.viewportDirty.hemi2D = true;
    }
    
    state.needsUpdate.render = true;
} 