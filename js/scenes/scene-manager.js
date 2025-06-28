// Scene Management System
import { config } from '../config.js';
import { state, getImagePlaneZ } from '../state.js';

export function setupScenes() {
    const viewIds = ['linear3D', 'linear2D', 'hemi3D', 'hemi2D'];
    
    viewIds.forEach(id => {
        const viewElement = document.getElementById(id);
        const scene = new THREE.Scene();
        
        if (id.includes('3D')) {
            // Phase 4: Individual 3D scenes are deprecated - only used for cameras/renderers
            // All 3D objects are now in master3D scene. Keep minimal setup for compatibility.
            scene.background = new THREE.Color(0xffffff);
            const camera = new THREE.PerspectiveCamera(75, viewElement.clientWidth / viewElement.clientHeight, 0.1, 1000);
            camera.position.set(8, 8, 12);
            camera.lookAt(0, 0, 0);
            state.cameras[id] = camera;
            
            // Note: Lighting removed - master3D scene handles all lighting
        } else {
            scene.background = new THREE.Color(0xf9fafb);
            const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 1, 1000);
            camera.position.z = 5;
            state.cameras[id] = camera;
        }
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(viewElement.clientWidth, viewElement.clientHeight);
        viewElement.appendChild(renderer.domElement);
        
        state.scenes[id] = scene;
        state.renderers[id] = renderer;
        
        // Initialize groups
        if (id.includes('3D')) {
            // Phase 4: 3D scene groups are deprecated - master3D handles all 3D groups
            // Create minimal empty groups for compatibility only
            state.groups[id] = {
                projectionLines: new THREE.Group(),
                projectedCubeLines: new THREE.Group(),
                vanishingPoints: new THREE.Group(),
                extensionLines: new THREE.Group()
            };
            // Note: Groups not added to scene - master3D scene handles all 3D objects
        } else {
            // 2D scenes still need their groups
            state.groups[id] = {
                projectionLines: new THREE.Group(),
                projectedCubeLines: new THREE.Group(),
                vanishingPoints: new THREE.Group(),
                extensionLines: new THREE.Group()
            };
            Object.values(state.groups[id]).forEach(group => scene.add(group));
        }
    });
    
    // Setup master 3D scene (Step 1: parallel to existing scenes)
    setupMaster3DScene();
    
    update2DCameras();
}

/**
 * Setup Master 3D Scene - Step 1: Foundation
 * Creates a shared 3D scene that will eventually replace linear3D and hemi3D scenes
 */
export function setupMaster3DScene() {
    // Create master 3D scene
    state.master3D = new THREE.Scene();
    state.master3D.background = new THREE.Color(0xffffff);
    
    // Add lighting (same as individual 3D scenes)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    state.master3D.add(ambientLight, directionalLight);
    
    // Initialize groups for master scene
    state.groups.master3D = {
        projectionLines: new THREE.Group(),
        projectedCubeLines: new THREE.Group(),
        vanishingPoints: new THREE.Group(),
        extensionLines: new THREE.Group()
    };
    
    Object.values(state.groups.master3D).forEach(group => state.master3D.add(group));
    
    console.log('✅ Master 3D scene created (Step 1)');
}

export function update2DCameras() {
    ['linear2D', 'hemi2D'].forEach(id => {
        const viewElement = document.getElementById(id);
        const aspect = viewElement.clientWidth / viewElement.clientHeight;
        const camera = state.cameras[id];
        camera.left = -state.zoomLevel2D * aspect / 2;
        camera.right = state.zoomLevel2D * aspect / 2;
        camera.top = state.zoomLevel2D / 2;
        camera.bottom = -state.zoomLevel2D / 2;
        camera.updateProjectionMatrix();
    });
}

export function createLinear2DBoundary() {
    const halfSize = state.hemisphereRadius; // Half of 2R size
    // Fixed boundary centered at origin (reference frame)
    const planeBoundaryPoints = [
        new THREE.Vector3(-halfSize, -halfSize, 0), 
        new THREE.Vector3(halfSize, -halfSize, 0),
        new THREE.Vector3(halfSize, halfSize, 0), 
        new THREE.Vector3(-halfSize, halfSize, 0)
    ];
    const planeBoundaryGeom = new THREE.BufferGeometry().setFromPoints(planeBoundaryPoints);
    const planeBoundaryMat = new THREE.LineBasicMaterial({ color: config.COLORS.boundary });
    window.linearBoundary = new THREE.LineLoop(planeBoundaryGeom, planeBoundaryMat);
    state.scenes.linear2D.add(window.linearBoundary);
}

export function createHemi2DBoundary() {
    const boundaryRadius = (Math.PI / 2) * state.hemisphereRadius;
    const circleGeometry = new THREE.RingGeometry(boundaryRadius - 0.05, boundaryRadius, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({ color: config.COLORS.boundary, side: THREE.DoubleSide });
    window.hemiBoundary = new THREE.Mesh(circleGeometry, circleMaterial);
    state.scenes.hemi2D.add(window.hemiBoundary);
} 