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
        LineBasicMaterial: { color: config.COLORS.cubeEdge, linewidth: 2 },
        MeshBasicMaterial: { color: config.COLORS.viewpoint },
        ProjectionLineMaterial: { color: config.COLORS.projectionLine, transparent: true, opacity: 0.5 },
        VanishingPointMaterial: { color: config.COLORS.vanishingPoints.x },
        GuideMaterial: { color: config.COLORS.guideLines.x, opacity: 0.4, transparent: true, linewidth: 1 }
    };
    
    const materialConfig = { ...defaults[type], ...options };
    
    switch (type) {
        case 'LineBasicMaterial':
        case 'ProjectionLineMaterial':
        case 'GuideMaterial':
            return new THREE.LineBasicMaterial(materialConfig);
        case 'MeshBasicMaterial':
        case 'VanishingPointMaterial':
            return new THREE.MeshBasicMaterial(materialConfig);
        default:
            return new THREE.MeshBasicMaterial(materialConfig);
    }
}

/**
 * Phase 2: Shared Ray Materials
 * Pre-created materials to eliminate duplication across projection files
 */
export const RAY_MATERIALS = {
    // Green intersection rays (viewpoint → projection surface)
    GREEN_INTERSECTION: new THREE.LineBasicMaterial({ 
        color: 0x00ff00, 
        opacity: 0.9,
        transparent: true,
        linewidth: 3
    }),
    
    // Red complement rays (projection surface → target, for complementary system)
    RED_COMPLEMENT: new THREE.LineBasicMaterial({ 
        color: 0xff3333, 
        opacity: 0.7,
        transparent: true,
        linewidth: 2
    }),
    
    // Red full rays (viewpoint → target, for single ray system)
    RED_FULL: new THREE.LineBasicMaterial({ 
        color: 0xff3333, 
        opacity: 0.8,
        transparent: true,
        linewidth: 3
    }),
    
    // Red extended rays (hemispherical projection extended rays)
    RED_EXTENDED: new THREE.LineBasicMaterial({ 
        color: 0xff3333, 
        opacity: 0.7,
        transparent: true,
        linewidth: 3
    }),
    
    // Red complement hemispherical (hemisphere intersection → extended point)
    RED_COMPLEMENT_HEMI: new THREE.LineBasicMaterial({ 
        color: 0xff3333, 
        opacity: 0.6,
        transparent: true,
        linewidth: 2
    })
};

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

export function updateShared3DScene(sceneId, scene, groups, cube, viewpointSphere, options = {}) {
    // Update common objects that appear in both 3D scenes
    updateCubeInScene(sceneId, cube, scene);
    updateViewpointInScene(sceneId, state.viewpointPosition, scene);
    
    // Only clear projection lines if not using custom ray handling
    // (When using custom ray handling, projections manage their own clearing)
    if (!options.customRayHandling) {
        clearGroup(groups.projectionLines);
    }
    
    // Get world vertices for ray drawing
    const worldVertices = getCachedWorldVertices(cube);
    
    // Draw projection rays only if not using custom ray handling
    if (!options.customRayHandling) {
        worldVertices.forEach(worldVertex => {
            const lineMat = createMaterial('ProjectionLineMaterial', options.rayMaterial || {});
            
            let endPoint;
            if (options.extendedRays) {
                // Extended rays (hemispherical style)
                const rayDirection = worldVertex.clone().sub(state.viewpointPosition).normalize();
                endPoint = state.viewpointPosition.clone().add(rayDirection.clone().multiplyScalar(30));
            } else {
                // Short rays (linear style)
                endPoint = worldVertex;
            }
            
            const ray = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([state.viewpointPosition, endPoint]), 
                lineMat
            );
            groups.projectionLines.add(ray);
        });
    }
    
    return worldVertices;
}

/**
 * Phase 3: Simplified Master Scene Update Function
 * Eliminates redundant parameters by using master3D architecture directly
 */
export function updateMaster3DScene(options = {}) {
    // Access master scene objects directly from state
    const scene = state.master3D;
    const groups = state.groups.master3D;
    
    // Find cube and viewpoint objects in master scene
    const cube = findObjectByGeometryType(scene, 'BoxGeometry');
    const viewpointSphere = findObjectByGeometryType(scene, 'SphereGeometry');
    
    if (!cube || !viewpointSphere) {
        console.warn('Master scene objects not found. Ensure setupMaster3DScene() was called.');
        return [];
    }
    
    // Update shared objects in master scene
    updateCubeInScene('master3D', cube, scene);
    updateViewpointInScene('master3D', state.viewpointPosition, scene);
    
    // Only clear projection lines if not using custom ray handling
    if (!options.customRayHandling) {
        clearGroup(groups.projectionLines);
    }
    
    // Get world vertices for ray drawing
    const worldVertices = getCachedWorldVertices(cube);
    
    // Draw projection rays only if not using custom ray handling
    if (!options.customRayHandling) {
        worldVertices.forEach(worldVertex => {
            const lineMat = createMaterial('ProjectionLineMaterial', options.rayMaterial || {});
            
            let endPoint;
            if (options.extendedRays) {
                // Extended rays (hemispherical style)
                const rayDirection = worldVertex.clone().sub(state.viewpointPosition).normalize();
                endPoint = state.viewpointPosition.clone().add(rayDirection.clone().multiplyScalar(30));
            } else {
                // Short rays (linear style)
                endPoint = worldVertex;
            }
            
            const ray = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([state.viewpointPosition, endPoint]), 
                lineMat
            );
            groups.projectionLines.add(ray);
        });
    }
    
    return worldVertices;
}

/**
 * Create a hemisphere mesh with wireframe
 * @param {number} radius - Hemisphere radius
 * @param {THREE.Vector3} position - Position for the hemisphere
 * @returns {THREE.Mesh} - Hemisphere mesh with wireframe child
 */
export function createHemisphere(radius = state.hemisphereRadius, position = null) {
    const hemisphereGeometry = new THREE.SphereGeometry(
        radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2
    );
    const hemisphereMaterial = new THREE.MeshBasicMaterial({ 
        color: config.COLORS.hemisphere, 
        transparent: true, 
        opacity: 0.15, 
        side: THREE.DoubleSide 
    });
    const hemisphere = new THREE.Mesh(hemisphereGeometry, hemisphereMaterial);
    
    // Set position if provided, otherwise use viewpoint position
    if (position) {
        hemisphere.position.copy(position);
    } else {
        hemisphere.position.copy(state.viewpointPosition);
    }
    hemisphere.rotation.x = -Math.PI / 2;
    
    // Add wireframe
    const hemisphereWireframe = new THREE.WireframeGeometry(hemisphereGeometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
        color: config.COLORS.hemisphere, 
        opacity: 0.3, 
        transparent: true 
    });
    const hemisphereWire = new THREE.LineSegments(hemisphereWireframe, wireframeMaterial);
    hemisphere.add(hemisphereWire);
    
    return hemisphere;
}

