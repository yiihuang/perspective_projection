import { state } from '../state.js';
import { config } from '../config.js';
import { safeDispose } from '../utils/three-utils.js';

/**
 * Controls Module
 * Handles slider controls and number input synchronization
 */

export class Controls {
    constructor(projectionManager, cameras, sceneObjects) {
        this.projectionManager = projectionManager;
        this.cameras = cameras;
        this.sceneObjects = sceneObjects;
        this.updateTimeout = null;
        this.setupControls();
        this.setupControlsUI();
    }

    setupControlsUI() {
        // Handle controls dropdown toggle
        const controlsToggle = document.getElementById('controls-toggle');
        const controlsPanel = document.getElementById('controls');
        
        controlsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            controlsPanel.classList.toggle('show');
        });
        
        // Close controls when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#controls-container')) {
                controlsPanel.classList.remove('show');
            }
        });
        
        // Prevent controls from closing when clicking inside the panel
        controlsPanel.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Prevent drag interaction when using controls
        document.getElementById('controls').addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up
        });
    }

    setupControls() {
        // Slider controls (fixed setup)
        this.setupSliderControl('viewpointY', (value) => {
            state.viewpointPosition.y = value;
        });
        
        this.setupSliderControl('viewpointZ', (value) => {
            state.viewpointPosition.z = value;
        });
        
        this.setupSliderControl('hemisphereRadius', (value) => {
            state.hemisphereRadius = value;
            this.recreateHemisphere();
        });

        this.setupRotationControl('cubeRotX', 'x', state.cubeLocalRotation);
        this.setupRotationControl('cubeRotY', 'y', state.cubeLocalRotation);
        this.setupRotationControl('cubeRotZ', 'z', state.cubeLocalRotation);

        this.setupSliderControl('zoom3D', (value) => {
            const newDistance = value;
            ['linear3D', 'hemi3D'].forEach(id => {
                const camera = this.cameras[id];
                const currentDistance = camera.position.length();
                if (currentDistance > 0) {
                    const scale = newDistance / currentDistance;
                    camera.position.multiplyScalar(scale);
                }
            });
        });
    }

    setupSliderControl(elementId, updateCallback) {
        const slider = document.getElementById(elementId);
        const numberInput = document.getElementById(elementId + '-number');
        
        // Slider changes update number input
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            numberInput.value = value;
            if (updateCallback) {
                updateCallback(value, e);
            }
            this.scheduleUpdate();
        });
        
        // Number input changes update slider
        numberInput.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            
            // Validate and clamp value to slider's min/max
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            
            if (isNaN(value)) {
                value = parseFloat(slider.value); // Reset to current slider value
                numberInput.value = value;
                return;
            }
            
            value = Math.max(min, Math.min(max, value));
            
            // Update both inputs to the clamped value
            slider.value = value;
            numberInput.value = value;
            
            if (updateCallback) {
                updateCallback(value, e);
            }
            this.scheduleUpdate();
        });
        
        // Handle number input blur to ensure valid values
        numberInput.addEventListener('blur', (e) => {
            let value = parseFloat(e.target.value);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            
            if (isNaN(value)) {
                value = parseFloat(slider.value);
            }
            
            value = Math.max(min, Math.min(max, value));
            numberInput.value = value;
            slider.value = value;
        });
    }

    setupRotationControl(elementId, axis, rotationObj) {
        const slider = document.getElementById(elementId);
        const numberInput = document.getElementById(elementId + '-number');
        
        const handleRotationChange = (e) => {
            const newRotation = parseFloat(e.target.value);
            const delta = newRotation - rotationObj[axis];
            rotationObj[axis] = newRotation;
            
            const cube = this.sceneObjects?.cube;
            if (cube) {
                const axisVector = new THREE.Vector3();
                axisVector[axis] = 1;
                cube.rotateOnAxis(axisVector, delta * Math.PI / 180);
                this.scheduleUpdate();
            }
        };
        
        // Slider changes update number input and rotation
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            numberInput.value = value;
            handleRotationChange(e);
        });
        
        // Number input changes update slider and rotation
        numberInput.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            
            // Validate and clamp value
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            
            if (isNaN(value)) {
                value = parseFloat(slider.value);
                numberInput.value = value;
                return;
            }
            
            value = Math.max(min, Math.min(max, value));
            slider.value = value;
            numberInput.value = value;
            
            handleRotationChange(e);
        });
        
        // Handle number input blur
        numberInput.addEventListener('blur', (e) => {
            let value = parseFloat(e.target.value);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            
            if (isNaN(value)) {
                value = parseFloat(slider.value);
            }
            
            value = Math.max(min, Math.min(max, value));
            numberInput.value = value;
            slider.value = value;
        });
    }

    recreateHemisphere() {
        const hemisphere = this.sceneObjects?.hemisphere;
        const scenes = window.scenes;
        
        if (hemisphere && scenes) {
            // Remove old hemisphere
            scenes.hemi3D.remove(hemisphere);
            safeDispose(hemisphere);
            
            // Create new hemisphere with updated radius
            const hemisphereGeometry = new THREE.SphereGeometry(state.hemisphereRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const hemisphereMaterial = new THREE.MeshBasicMaterial({ 
                color: config.COLORS.hemisphere, 
                transparent: true, 
                opacity: 0.15, 
                side: THREE.DoubleSide 
            });
            const newHemisphere = new THREE.Mesh(hemisphereGeometry, hemisphereMaterial);
            newHemisphere.position.copy(state.viewpointPosition);
            newHemisphere.rotation.x = -Math.PI / 2;
            
            const hemisphereWireframe = new THREE.WireframeGeometry(hemisphereGeometry);
            const wireframeMaterial = new THREE.LineBasicMaterial({ 
                color: config.COLORS.hemisphere, 
                opacity: 0.3, 
                transparent: true 
            });
            const hemisphereWire = new THREE.LineSegments(hemisphereWireframe, wireframeMaterial);
            newHemisphere.add(hemisphereWire);
            
            scenes.hemi3D.add(newHemisphere);
            
            // Update reference
            this.sceneObjects.hemisphere = newHemisphere;
            if (window.sceneObjects) {
                window.sceneObjects.hemisphere = newHemisphere;
            }
        }
    }

    scheduleUpdate() {
        // Only debounce slider updates, not mouse interactions
        if (this.updateTimeout) clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            // Always schedule an update when controls change
            this.projectionManager.scheduleUpdate('all');
            this.updateTimeout = null;
        }, 8); // Reduced debouncing for better responsiveness
    }
} 