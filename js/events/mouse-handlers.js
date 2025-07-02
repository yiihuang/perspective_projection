import { state } from '../state.js';
import { config } from '../config.js';

/**
 * Mouse Event Handlers Module
 * Handles mouse interactions for 3D cube/scene rotation and 2D zooming
 */

export class MouseHandlers {
    constructor(projectionManager, cameras) {
        this.projectionManager = projectionManager;
        this.cameras = cameras;
        this.dragState = {
            isDraggingCube: false,
            isDraggingScene: false,
            isZooming2D: false,
            previousMousePosition: { x: 0, y: 0 }
        };
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add mouse event listeners to 3D view elements (for cube and scene rotation)
        const view3DElements = [document.getElementById('linear3D'), document.getElementById('hemi3D')];
        
        // Prevent window dragging when interacting with 3D views
        view3DElements.forEach(element => {
            element.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent window dragging
            });
        });
        
        view3DElements.forEach(viewElement => {
            viewElement.addEventListener('mousedown', (e) => {
                // Prevent dragging if clicking on controls
                if (e.target.closest('#controls')) return;
                
                if (e.button === 0) { // Left click - rotate cube
                    this.dragState.isDraggingCube = true;
                } else if (e.button === 2) { // Right click - rotate scene
                    this.dragState.isDraggingScene = true;
                }
                
                this.dragState.previousMousePosition.x = e.clientX;
                this.dragState.previousMousePosition.y = e.clientY;
                e.preventDefault(); // Prevent text selection
            });

            viewElement.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent right-click context menu
            });
        });

        // Add mouse event listeners to 2D view elements (for zooming)
        const view2DElements = [document.getElementById('linear2D'), document.getElementById('hemi2D')];
        
        // Prevent window dragging when interacting with 2D views
        view2DElements.forEach(element => {
            element.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent window dragging
            });
        });
        
        view2DElements.forEach(viewElement => {
            viewElement.addEventListener('mousedown', (e) => {
                // Prevent zooming if clicking on controls
                if (e.target.closest('#controls')) return;
                
                this.dragState.isZooming2D = true;
                this.dragState.previousMousePosition.y = e.clientY;
                e.preventDefault(); // Prevent text selection
            });

            // Add wheel event for zooming
            viewElement.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomSpeed = 0.5;
                const delta = e.deltaY > 0 ? zoomSpeed : -zoomSpeed;
                
                state.zoomLevel2D += delta;
                state.zoomLevel2D = Math.max(5, Math.min(100, state.zoomLevel2D)); // Clamp zoom level
                this.update2DCameras();
                state.lastActivity = Date.now(); // Track wheel zoom activity
                this.projectionManager.scheduleUpdate('zoom2D'); // Only 2D viewports need zoom updates
            });
        });

        // Global mouse move event (handles cube rotation, scene rotation, and 2D zoom)
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
    }

    handleMouseMove(e) {
        if (this.dragState.isDraggingCube) {
            // Only allow mouse cube rotation in local mode
            if (state.rotationMode !== 'local') {
                return; // Skip mouse rotation in precise mode
            }
            
            // Handle cube rotation (left click)
            const deltaX = e.clientX - this.dragState.previousMousePosition.x;
            const deltaY = e.clientY - this.dragState.previousMousePosition.y;

            // Update cube rotation in state first
            state.cubeLocalRotation.y += deltaX * 0.005 * 180 / Math.PI;
            state.cubeLocalRotation.x += deltaY * 0.005 * 180 / Math.PI;
            
            // Apply rotation to cube instances in both 3D scenes directly
            ['linear3D', 'hemi3D'].forEach(sceneId => {
                const sceneObject = state.scenes[sceneId].children.find(child => 
                    child.geometry && child.geometry.type === 'BoxGeometry'
                );
                if (sceneObject) {
                    sceneObject.rotateOnAxis(new THREE.Vector3(0, 1, 0), deltaX * 0.005);
                    sceneObject.rotateOnAxis(new THREE.Vector3(1, 0, 0), deltaY * 0.005);
                }
            });
            
            // Also update the master cube object if it exists
            const cube = window.sceneObjects?.cube;
            if (cube) {
                cube.rotateOnAxis(new THREE.Vector3(0, 1, 0), deltaX * 0.005);
                cube.rotateOnAxis(new THREE.Vector3(1, 0, 0), deltaY * 0.005);
            }
            
            // Update both slider and number input
            this.updateRotationControls('cubeRotX', Math.round(state.cubeLocalRotation.x));
            this.updateRotationControls('cubeRotY', Math.round(state.cubeLocalRotation.y));
            
            this.projectionManager.scheduleUpdate('all', true); // Immediate update for mouse interaction
            
            this.dragState.previousMousePosition.x = e.clientX;
            this.dragState.previousMousePosition.y = e.clientY;
        } else if (this.dragState.isDraggingScene) {
            // Handle scene rotation (right click) - rotate cameras around origin
            const deltaX = e.clientX - this.dragState.previousMousePosition.x;
            const deltaY = e.clientY - this.dragState.previousMousePosition.y;
            
            // Rotate both 3D cameras
            ['linear3D', 'hemi3D'].forEach(id => {
                const camera = this.cameras[id];
                
                // Horizontal rotation (around Y axis)
                const yAxis = new THREE.Vector3(0, 1, 0);
                const rotationY = new THREE.Matrix4().makeRotationAxis(yAxis, -deltaX * 0.005);
                camera.position.applyMatrix4(rotationY);
                
                // Vertical rotation (around camera's local X axis)
                const xAxis = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
                const rotationX = new THREE.Matrix4().makeRotationAxis(xAxis, -deltaY * 0.005);
                camera.position.applyMatrix4(rotationX);
                
                // Keep camera looking at origin
                camera.lookAt(0, 0, 0);
            });
            
            state.lastActivity = Date.now(); // Track camera movement activity
            this.projectionManager.scheduleUpdate('camera'); // Only 3D viewports need camera updates
            this.dragState.previousMousePosition.x = e.clientX;
            this.dragState.previousMousePosition.y = e.clientY;
        } else if (this.dragState.isZooming2D) {
            // Handle 2D zoom
            const deltaY = e.clientY - this.dragState.previousMousePosition.y;
            const zoomSpeed = 0.1;
            
            state.zoomLevel2D += deltaY * zoomSpeed;
            state.zoomLevel2D = Math.max(5, Math.min(100, state.zoomLevel2D)); // Clamp zoom level
            this.update2DCameras();
            state.lastActivity = Date.now(); // Track zoom activity
            this.projectionManager.scheduleUpdate('zoom2D'); // Only 2D viewports need zoom updates
            
            this.dragState.previousMousePosition.y = e.clientY;
        }
    }

    handleMouseUp() {
        this.dragState.isDraggingCube = false;
        this.dragState.isDraggingScene = false;
        this.dragState.isZooming2D = false;
    }

    updateRotationControls(elementId, value) {
        const slider = document.getElementById(elementId);
        const numberInput = document.getElementById(elementId + '-number');
        if (slider && numberInput) {
            slider.value = value;
            numberInput.value = value;
        }
    }

    update2DCameras() {
        ['linear2D', 'hemi2D'].forEach(id => {
            const viewElement = document.getElementById(id);
            const aspect = viewElement.clientWidth / viewElement.clientHeight;
            const camera = this.cameras[id];
            camera.left = -state.zoomLevel2D * aspect / 2;
            camera.right = state.zoomLevel2D * aspect / 2;
            camera.top = state.zoomLevel2D / 2;
            camera.bottom = -state.zoomLevel2D / 2;
            camera.updateProjectionMatrix();
        });
    }
} 