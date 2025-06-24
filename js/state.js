// State Management
import { config } from './config.js';

// Global application state
export const state = {
    // Three.js objects
    scenes: {},
    cameras: {},
    renderers: {},
    
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
    zoomLevel2D: config.DEFAULTS.zoomLevel2D,
    
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

export function generateUpdateHash() {
    const pos = state.viewpointPosition;
    const rot = state.cube ? state.cube.rotation : { x: 0, y: 0, z: 0 };
    const cubePos = state.cube ? state.cube.position : { x: 0, y: 0, z: 0 };
    
    return `${pos.x},${pos.y},${pos.z},${state.hemisphereRadius},${rot.x},${rot.y},${rot.z},${cubePos.x},${cubePos.y},${cubePos.z}`;
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