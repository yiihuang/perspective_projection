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
/**
 * zx'z'' Intrinsic Euler Rotation Implementation
 * Applies three sequential rotations to achieve precise orientation:
 * 1. Rotation by α around initial local Z-axis
 * 2. Rotation by β around new local X-axis  
 * 3. Rotation by γ around final local Z-axis
 */

/**
 * Applies zx'z'' intrinsic Euler rotation to a Three.js object
 * @param {THREE.Object3D} object - The object to rotate
 * @param {number} alpha - First rotation around Z-axis (degrees)
 * @param {number} beta - Second rotation around X-axis (degrees) 
 * @param {number} gamma - Third rotation around Z-axis (degrees)
 * @param {boolean} resetFirst - Whether to reset object rotation before applying
 */
export function applyIntrinsicEulerRotation(object, alpha, beta, gamma, resetFirst = true) {
    if (!object) {
        console.warn('applyIntrinsicEulerRotation: No object provided');
        return;
    }
    
    // Reset object rotation to identity if requested
    if (resetFirst) {
        object.rotation.set(0, 0, 0);
    }
    
    // Convert degrees to radians
    const alphaRad = (alpha * Math.PI) / 180;
    const betaRad = (beta * Math.PI) / 180;
    const gammaRad = (gamma * Math.PI) / 180;
    
    // Apply intrinsic rotations in sequence
    // Each rotation is around the object's own local axes
    
    // 1. First rotation: α around initial local Z-axis
    if (Math.abs(alphaRad) > 1e-10) {
        object.rotateOnAxis(new THREE.Vector3(0, 0, 1), alphaRad);
    }
    
    // 2. Second rotation: β around new local X-axis (after first rotation)
    if (Math.abs(betaRad) > 1e-10) {
        object.rotateOnAxis(new THREE.Vector3(1, 0, 0), betaRad);
    }
    
    // 3. Third rotation: γ around final local Z-axis (after previous rotations)
    if (Math.abs(gammaRad) > 1e-10) {
        object.rotateOnAxis(new THREE.Vector3(0, 0, 1), gammaRad);
    }
    
    console.log(`Applied zx'z'' rotation: α=${alpha}°, β=${beta}°, γ=${gamma}°`);
}

/**
 * Sets precise orientation using zx'z'' Euler angles
 * This is the main function to call for setting a specific orientation
 * @param {THREE.Object3D} object - The object to orient
 * @param {number} alpha - Alpha angle in degrees
 * @param {number} beta - Beta angle in degrees
 * @param {number} gamma - Gamma angle in degrees
 */
export function setPreciseOrientation(object, alpha, beta, gamma) {
    if (!object) {
        console.warn('setPreciseOrientation: No object provided');
        return;
    }
    
    // Always reset to identity before applying precise orientation
    applyIntrinsicEulerRotation(object, alpha, beta, gamma, true);
    
    // Update the cached world vertices since cube transform changed
    if (state.cachedWorldVertices) {
        state.cachedWorldVertices = null;
    }
}

/**
 * Validates Euler angle inputs
 * @param {number} alpha - Alpha angle in degrees
 * @param {number} beta - Beta angle in degrees  
 * @param {number} gamma - Gamma angle in degrees
 * @returns {Object} Validated and normalized angles
 */
export function validateEulerAngles(alpha, beta, gamma) {
    // Convert to numbers and handle invalid inputs
    alpha = isNaN(alpha) ? 0 : Number(alpha);
    beta = isNaN(beta) ? 0 : Number(beta);
    gamma = isNaN(gamma) ? 0 : Number(gamma);
    
    // Normalize angles to [-180, 180] range for consistency
    alpha = ((alpha + 180) % 360) - 180;
    beta = ((beta + 180) % 360) - 180;
    gamma = ((gamma + 180) % 360) - 180;
    
    return { alpha, beta, gamma };
}

/**
 * Converts current object rotation back to approximate zx'z'' Euler angles
 * Note: This is approximate due to gimbal lock and multiple representations
 * @param {THREE.Object3D} object - The object to analyze
 * @returns {Object} Approximate Euler angles in degrees
 */
export function extractEulerAngles(object) {
    if (!object) {
        return { alpha: 0, beta: 0, gamma: 0 };
    }
    
    // Get rotation matrix from object
    const matrix = object.matrixWorld.clone();
    matrix.decompose(new THREE.Vector3(), object.quaternion, new THREE.Vector3());
    
    // Convert to Euler angles (zx'z'' order)
    const euler = new THREE.Euler();
    euler.setFromQuaternion(object.quaternion, 'ZXZ');
    
    // Convert radians to degrees
    const alpha = (euler.z * 180) / Math.PI;
    const beta = (euler.x * 180) / Math.PI;
    const gamma = (euler.y * 180) / Math.PI;
    
    return validateEulerAngles(alpha, beta, gamma);
}

/**
 * Synchronizes state between local and precise rotation modes
 * This function attempts to convert the current cube orientation to the target mode
 * @param {string} targetMode - 'local' or 'precise'
 */
export function synchronizeRotationState(targetMode) {
    const cube = state.cube;
    if (!cube) {
        console.warn('No cube object available for state synchronization');
        return;
    }
    
    if (targetMode === 'precise') {
        // Switching TO precise mode: try to extract current Euler angles
        const extracted = extractEulerAngles(cube);
        state.cubeEulerAngles.alpha = extracted.alpha;
        state.cubeEulerAngles.beta = extracted.beta;
        state.cubeEulerAngles.gamma = extracted.gamma;
        
        console.log(`Synchronized to precise mode: α=${extracted.alpha}°, β=${extracted.beta}°, γ=${extracted.gamma}°`);
        
        // Update UI controls to reflect new values
        updateEulerControlValues();
        
    } else if (targetMode === 'local') {
        // Switching TO local mode: reset local rotation tracking
        // Note: We don't try to reverse-engineer local rotations since they're cumulative
        // Instead, we reset the tracking and let the user continue from current position
        state.cubeLocalRotation.x = 0;
        state.cubeLocalRotation.y = 0;
        state.cubeLocalRotation.z = 0;
        
        console.log('Synchronized to local mode: Reset local rotation tracking');
        
        // Update UI controls to reflect reset values
        updateLocalControlValues();
    }
}

/**
 * Updates the Euler angle control UI elements to match current state
 */
function updateEulerControlValues() {
    const angles = [
        { id: 'eulerAlpha', value: state.cubeEulerAngles.alpha },
        { id: 'eulerBeta', value: state.cubeEulerAngles.beta },
        { id: 'eulerGamma', value: state.cubeEulerAngles.gamma }
    ];
    
    angles.forEach(({ id, value }) => {
        const slider = document.getElementById(id);
        const numberInput = document.getElementById(id + '-number');
        
        if (slider && numberInput) {
            slider.value = value;
            numberInput.value = value;
        }
    });
}

/**
 * Updates the local rotation control UI elements to match current state
 */
function updateLocalControlValues() {
    const rotations = [
        { id: 'cubeRotX', value: state.cubeLocalRotation.x },
        { id: 'cubeRotY', value: state.cubeLocalRotation.y },
        { id: 'cubeRotZ', value: state.cubeLocalRotation.z }
    ];
    
    rotations.forEach(({ id, value }) => {
        const slider = document.getElementById(id);
        const numberInput = document.getElementById(id + '-number');
        
        if (slider && numberInput) {
            slider.value = value;
            numberInput.value = value;
        }
    });
}

/**
 * Resets cube orientation to identity for both rotation systems
 * Useful for starting fresh or testing
 */
export function resetCubeOrientation() {
    const cube = state.cube;
    if (!cube) {
        console.warn('No cube object available for reset');
        return;
    }
    
    // Reset cube rotation to identity
    cube.rotation.set(0, 0, 0);
    
    // Reset both state systems
    state.cubeLocalRotation.x = 0;
    state.cubeLocalRotation.y = 0;
    state.cubeLocalRotation.z = 0;
    
    state.cubeEulerAngles.alpha = 0;
    state.cubeEulerAngles.beta = 0;
    state.cubeEulerAngles.gamma = 0;
    
    // Update UI controls
    updateLocalControlValues();
    updateEulerControlValues();
    
    // Clear cached vertices
    if (state.cachedWorldVertices) {
        state.cachedWorldVertices = null;
    }
    
    console.log('✅ Cube orientation reset to identity');
}

/**
 * Test function for zx'z'' rotation system
 * Call this from browser console to verify rotation mathematics
 * @param {THREE.Object3D} testObject - Object to test (defaults to state.cube)
 */
export function testEulerRotations(testObject = null) {
    const cube = testObject || state.cube;
    if (!cube) {
        console.error('No cube object available for testing');
        return;
    }
    
    console.log('🧪 Testing zx\'z\'\' Intrinsic Euler Rotations...');
    
    // Store original rotation
    const originalRotation = cube.rotation.clone();
    
    // Test 1: Individual axis rotations
    console.log('Test 1: Individual axis rotations');
    
    setPreciseOrientation(cube, 45, 0, 0);
    console.log('✓ α=45°, β=0°, γ=0° (Z-axis rotation only)');
    
    setPreciseOrientation(cube, 0, 45, 0);
    console.log('✓ α=0°, β=45°, γ=0° (X-axis rotation only)');
    
    setPreciseOrientation(cube, 0, 0, 45);
    console.log('✓ α=0°, β=0°, γ=45° (Z-axis rotation only)');
    
    // Test 2: Combined rotations
    console.log('Test 2: Combined rotations');
    
    setPreciseOrientation(cube, 30, 45, 60);
    console.log('✓ α=30°, β=45°, γ=60° (Combined rotation)');
    
    // Test 3: Full rotations
    console.log('Test 3: Full rotations');
    
    setPreciseOrientation(cube, 90, 90, 90);
    console.log('✓ α=90°, β=90°, γ=90° (Quarter turns)');
    
    setPreciseOrientation(cube, 180, 0, 180);
    console.log('✓ α=180°, β=0°, γ=180° (Half turns)');
    
    // Test 4: Reset to identity
    console.log('Test 4: Reset test');
    
    setPreciseOrientation(cube, 0, 0, 0);
    console.log('✓ α=0°, β=0°, γ=0° (Identity rotation)');
    
    // Test 5: Validation test
    console.log('Test 5: Input validation');
    
    const validated = validateEulerAngles(370, -200, 540);
    console.log(`✓ Validation: 370° → ${validated.alpha}°, -200° → ${validated.beta}°, 540° → ${validated.gamma}°`);
    
    // Restore original rotation
    cube.rotation.copy(originalRotation);
    
    console.log('🎉 All rotation tests completed successfully!');
    console.log('💡 Tip: Use setPreciseOrientation(state.cube, α, β, γ) to set specific orientations');
    
    return true;
}

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

