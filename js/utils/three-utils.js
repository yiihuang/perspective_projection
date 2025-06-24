// Three.js Utility Functions
import { CONFIG } from '../config.js';

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
        LineBasicMaterial: { color: CONFIG.COLORS.projectionLine, linewidth: 2 },
        MeshBasicMaterial: { color: CONFIG.COLORS.viewpoint },
        ProjectionLineMaterial: { color: CONFIG.COLORS.projectionLine, transparent: true, opacity: 0.5 },
        VanishingPointMaterial: { color: CONFIG.COLORS.vanishingPoints.x },
        GuideMaterial: { color: CONFIG.COLORS.guideLines.x, opacity: 0.4, transparent: true, linewidth: 1 }
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

export function updateCubeInScene(scene, targetCube) {
    const sceneObject = findObjectByGeometryType(scene, 'BoxGeometry');
    if (sceneObject) {
        sceneObject.rotation.copy(targetCube.rotation);
        sceneObject.position.copy(targetCube.position);
    }
}

export function updateViewpointInScene(scene, position) {
    const viewpointObject = findObjectByGeometryType(scene, 'SphereGeometry');
    if (viewpointObject) {
        viewpointObject.position.copy(position);
    }
}

export function updateProjectedViewpointMarker(scene, x, y, z = 0.1) {
    const marker = findObjectByGeometryType(scene, 'RingGeometry');
    if (marker) {
        marker.position.set(x, y, z);
    }
} 