// 3D Objects Creation and Management
import { config } from '../config.js';
import { state, getImagePlaneZ } from '../state.js';
import { createLinear2DBoundary, createHemi2DBoundary } from './scene-manager.js';
import { safeDispose } from '../utils/three-utils.js';

export function createSceneObjects() {
    // Create cube (shared across 3D scenes)
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
    
    // Add cube to 3D scenes
    state.scenes.linear3D.add(state.cube.clone());
    state.scenes.hemi3D.add(state.cube.clone());
    
    // Create viewpoint sphere (shared)
    const viewpointGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const viewpointMaterial = new THREE.MeshBasicMaterial({ color: config.COLORS.viewpoint });
    state.viewpointSphere = new THREE.Mesh(viewpointGeometry, viewpointMaterial);
    state.viewpointSphere.position.copy(state.viewpointPosition);
    
    const viewpointSphere1 = state.viewpointSphere.clone();
    const viewpointSphere2 = state.viewpointSphere.clone();
    viewpointSphere1.position.copy(state.viewpointPosition);
    viewpointSphere2.position.copy(state.viewpointPosition);
    
    state.scenes.linear3D.add(viewpointSphere1);
    state.scenes.hemi3D.add(viewpointSphere2);
    
    // Create image plane for linear perspective (size will be updated dynamically)
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
    state.scenes.linear3D.add(state.imagePlane);
    
    // Create hemisphere for hemispherical perspective
    const hemisphereGeometry = new THREE.SphereGeometry(
        state.hemisphereRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2
    );
    const hemisphereMaterial = new THREE.MeshBasicMaterial({ 
        color: config.COLORS.hemisphere, 
        transparent: true, 
        opacity: 0.15, 
        side: THREE.DoubleSide 
    });
    state.hemisphere = new THREE.Mesh(hemisphereGeometry, hemisphereMaterial);
    state.hemisphere.position.copy(state.viewpointPosition);
    state.hemisphere.rotation.x = -Math.PI / 2;
    
    const hemisphereWireframe = new THREE.WireframeGeometry(hemisphereGeometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
        color: config.COLORS.hemisphere, 
        opacity: 0.3, 
        transparent: true 
    });
    const hemisphereWire = new THREE.LineSegments(hemisphereWireframe, wireframeMaterial);
    state.hemisphere.add(hemisphereWire);
    state.scenes.hemi3D.add(state.hemisphere);
    
    // Add grid helpers
    const gridHelper1 = new THREE.GridHelper(20, 20, 0xcccccc, 0xdddddd);
    const gridHelper2 = new THREE.GridHelper(20, 20, 0xcccccc, 0xdddddd);
    gridHelper1.position.y = -5;
    gridHelper2.position.y = -5;
    state.scenes.linear3D.add(gridHelper1);
    state.scenes.hemi3D.add(gridHelper2);
    
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