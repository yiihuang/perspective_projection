// 3D Objects Creation and Management
import { config } from '../config.js';
import { state, getImagePlaneZ } from '../state.js';
import { createLinear2DBoundary, createHemi2DBoundary } from './scene-manager.js';
import { safeDispose, createHemisphere } from '../utils/three-utils.js';

export function createSceneObjects() {
    // Step 2: Create shared objects in master scene instead of duplicating
    createSharedObjectsInMasterScene();
    
    // Step 3: Move projection surfaces to master scene with visibility control
    createProjectionSurfacesInMasterScene();
    
    // Create 2D boundaries
    createLinear2DBoundary();
    createHemi2DBoundary();
    
    // Create viewpoint markers for 2D scenes
    const pvRingGeom = new THREE.RingGeometry(0.15, 0.2, 24);
    const pvRingMat1 = new THREE.MeshBasicMaterial({ 
        color: config.COLORS.viewpoint, 
        side: THREE.DoubleSide 
    });
    const pvRingMat2 = new THREE.MeshBasicMaterial({ 
        color: config.COLORS.viewpoint, 
        side: THREE.DoubleSide 
    });
    const projectedViewpointMarker1 = new THREE.Mesh(pvRingGeom, pvRingMat1);
    const projectedViewpointMarker2 = new THREE.Mesh(pvRingGeom, pvRingMat2);
    state.scenes.linear2D.add(projectedViewpointMarker1);
    state.scenes.hemi2D.add(projectedViewpointMarker2);
    
    // Initialize projections (this will be moved to projections module later)
    if (window.updateProjections) {
        window.updateProjections();
    }
    
    return {
        cube: state.cube,
        viewpointSphere: state.viewpointSphere,
        imagePlane: state.imagePlane,
        hemisphere: state.hemisphere
    };
}

/**
 * Step 2: Create Shared Objects in Master Scene
 * Creates cube, viewpoint sphere, and grid helper once in the master scene
 */
function createSharedObjectsInMasterScene() {
    if (!state.master3D) {
        console.warn('Master 3D scene not initialized yet');
        return;
    }
    
    // Create cube (single instance in master scene)
    const cubeGeometry = new THREE.BoxGeometry(config.CUBE_SIZE, config.CUBE_SIZE, config.CUBE_SIZE);
    const cubeMaterial = new THREE.MeshPhongMaterial({ 
        color: config.COLORS.cube, 
        opacity: 0.75, 
        transparent: true 
    });
    state.cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    state.cube.position.z = -5;
    
    const edges = new THREE.EdgesGeometry(cubeGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: config.COLORS.cubeEdges });
    const cubeEdges = new THREE.LineSegments(edges, lineMaterial);
    state.cube.add(cubeEdges);
    
    // Add cube to master scene only
    state.master3D.add(state.cube);
    
    // Create viewpoint sphere (single instance in master scene)
    const viewpointGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const viewpointMaterial = new THREE.MeshBasicMaterial({ color: config.COLORS.viewpoint });
    state.viewpointSphere = new THREE.Mesh(viewpointGeometry, viewpointMaterial);
    state.viewpointSphere.position.copy(state.viewpointPosition);
    
    // Add viewpoint sphere to master scene only
    state.master3D.add(state.viewpointSphere);
    
    // Add grid helper (single instance in master scene)
    const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xdddddd);
    gridHelper.position.y = -5;
    state.master3D.add(gridHelper);
    
    console.log('✅ Shared objects created in master scene (Step 2)');
}

/**
 * Step 3: Move Projection Surfaces to Master Scene with Visibility Control
 * Adds imagePlane and hemisphere to master scene with visibility control
 */
function createProjectionSurfacesInMasterScene() {
    if (!state.master3D) {
        console.warn('Master 3D scene not initialized yet');
        return;
    }
    
    // Create image plane for master scene (actual state object, not copy)
    const planeSize = 2 * state.hemisphereRadius;
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
        color: config.COLORS.imagePlane, 
        transparent: true, 
        opacity: 0.1, 
        side: THREE.DoubleSide 
    });
    state.imagePlane = new THREE.Mesh(planeGeometry, planeMaterial);
    state.imagePlane.position.set(
        state.viewpointPosition.x, 
        state.viewpointPosition.y, 
        getImagePlaneZ()
    );
    
    const planeEdges = new THREE.EdgesGeometry(planeGeometry);
    const planeEdgesMaterial = new THREE.LineBasicMaterial({ 
        color: config.COLORS.imagePlane, 
        opacity: 0.5 
    });
    const planeBorder = new THREE.LineSegments(planeEdges, planeEdgesMaterial);
    state.imagePlane.add(planeBorder);
    
    // Create hemisphere for master scene (actual state object, not copy)
    state.hemisphere = createHemisphere(state.hemisphereRadius, state.viewpointPosition);
    
    // Add both surfaces to master scene with initial visibility settings
    state.master3D.add(state.imagePlane);
    state.master3D.add(state.hemisphere);
    
    // Initially hide both - visibility will be controlled per viewport
    state.imagePlane.visible = false;
    state.hemisphere.visible = false;
    
    console.log('✅ Projection surfaces moved to master scene with visibility control (Step 3)');
} 