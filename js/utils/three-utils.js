// Three.js Utility Functions
import { config } from '../config.js';
import { state } from '../state.js';

// Utility function to safely dispose Three.js objects
export function safeDispose(object) {
    if (!object) return;
    
    if (object.geometry) {
        object.geometry.dispose();
    }
    if (object.material) {
        if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
        } else {
            object.material.dispose();
        }
    }
    if (object.children) {
        object.children.forEach(child => safeDispose(child));
    }
}

// Helper function to clear and dispose group contents
export function clearGroup(group) {
    group.children.forEach(child => safeDispose(child));
    group.clear();
}

// Utility functions for common object management
export function findObjectByGeometryType(scene, geometryType) {
    return scene.children.find(child => child.geometry && child.geometry.type === geometryType);
}

export function createMaterial(type, options = {}) {
    const defaults = {
        LineBasicMaterial: { color: config.COLORS.projectionLine, linewidth: 2 },
        MeshBasicMaterial: { color: config.COLORS.viewpoint },
        ProjectionLineMaterial: { color: config.COLORS.projectionLine, transparent: true, opacity: 0.5 },
        VanishingPointMaterial: { color: config.COLORS.vanishingPoints.x },
        GuideMaterial: { color: config.COLORS.guideLines.x, opacity: 0.4, transparent: true, linewidth: 1 }
    };
    
    const config = { ...defaults[type], ...options };
    
    switch (type) {
        case 'LineBasicMaterial':
        case 'ProjectionLineMaterial':
        case 'GuideMaterial':
            return new THREE.LineBasicMaterial(config);
        case 'MeshBasicMaterial':
        case 'VanishingPointMaterial':
            return new THREE.MeshBasicMaterial(config);
        default:
            return new THREE.MeshBasicMaterial(config);
    }
}

export function updateCubeInScene(sceneId, targetCube, scene) {
    const sceneObject = findObjectByGeometryType(scene, 'BoxGeometry');
    if (sceneObject) {
        sceneObject.rotation.copy(targetCube.rotation);
        sceneObject.position.copy(targetCube.position);
    }
}

export function updateViewpointInScene(sceneId, position, scene) {
    const viewpointObject = findObjectByGeometryType(scene, 'SphereGeometry');
    if (viewpointObject) {
        viewpointObject.position.copy(position);
    }
}

export function updateProjectedViewpointMarker(sceneId, x, y, scene, z = 0.1) {
    const marker = findObjectByGeometryType(scene, 'RingGeometry');
    if (marker) {
        marker.position.set(x, y, z);
    }
}

export function getCachedWorldVertices(cube) {
    cube.updateMatrixWorld();
    
    // Check if cube transform has changed
    if (!state.lastCubeMatrixWorld.equals(cube.matrixWorld) || !state.cachedWorldVertices) {
        const halfSize = config.CUBE_SIZE / 2;
        const localVertices = [
            new THREE.Vector3(-halfSize, -halfSize, -halfSize), new THREE.Vector3( halfSize, -halfSize, -halfSize),
            new THREE.Vector3( halfSize,  halfSize, -halfSize), new THREE.Vector3(-halfSize,  halfSize, -halfSize),
            new THREE.Vector3(-halfSize, -halfSize,  halfSize), new THREE.Vector3( halfSize, -halfSize,  halfSize),
            new THREE.Vector3( halfSize,  halfSize,  halfSize), new THREE.Vector3(-halfSize,  halfSize,  halfSize)
        ];
        
        state.cachedWorldVertices = localVertices.map(v => v.clone().applyMatrix4(cube.matrixWorld));
        state.lastCubeMatrixWorld.copy(cube.matrixWorld);
    }
    
    return state.cachedWorldVertices;
} 