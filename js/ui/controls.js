import { state, setRotationMode, isLocalRotationMode, isPreciseOrientationMode } from '../state.js';
import { config } from '../config.js';
import { safeDispose, createHemisphere, setPreciseOrientation, validateEulerAngles, synchronizeRotationState, resetCubeOrientation } from '../utils/three-utils.js';

/**
 * Controls Module
 * Handles slider controls and number input synchronization
 */

// Global drag state
let isDragging = false;
let hasDragged = false;
let dragOffset = { x: 0, y: 0 };
let controlsContainer = null;

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
            // Don't toggle if we just finished dragging
            if (hasDragged) {
                e.preventDefault();
                e.stopPropagation();
                hasDragged = false; // Reset for next interaction
                return;
            }
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
        this.setupSliderControl('viewpointX', (value) => {
            state.viewpointPosition.x = value;
        });
        
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

        // Setup mode toggle
        this.setupModeToggle();
        
        // Setup reset button
        this.setupResetButton();
        
        // Local rotation controls (existing)
        this.setupRotationControl('cubeRotX', 'x', state.cubeLocalRotation);
        this.setupRotationControl('cubeRotY', 'y', state.cubeLocalRotation);
        this.setupRotationControl('cubeRotZ', 'z', state.cubeLocalRotation);
        
        // Precise orientation controls (new)
        this.setupEulerControl('eulerAlpha', 'alpha');
        this.setupEulerControl('eulerBeta', 'beta');
        this.setupEulerControl('eulerGamma', 'gamma');

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

        // Red rays toggle
        this.setupCheckboxControl('show-red-rays', (checked) => {
            state.showRedRays = checked;
        });

        // Linear projection shape toggle
        this.setupCheckboxControl('linear-shape-toggle', (checked) => {
            // Update state - automatic hash detection will trigger update
            state.linearProjectionShape = checked ? 'circle' : 'square';
        });

        setupControlDragging();
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

    setupCheckboxControl(elementId, updateCallback) {
        const checkbox = document.getElementById(elementId);
        
        if (!checkbox) {
            console.error('Checkbox element not found with ID:', elementId);
            return;
        }
        
        checkbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            if (updateCallback) {
                updateCallback(checked, e);
            }
            this.scheduleUpdate();
        });
    }

    setupRotationControl(elementId, axis, rotationObj) {
        const slider = document.getElementById(elementId);
        const numberInput = document.getElementById(elementId + '-number');
        
        const handleRotationChange = (e) => {
            // Only apply local rotations when in local mode
            if (!isLocalRotationMode()) {
                return;
            }
            
            const newRotation = parseFloat(e.target.value);
            const delta = newRotation - rotationObj[axis];
            rotationObj[axis] = newRotation;
            
            // Phase 4: Use master scene cube instead of individual scene reference
            const cube = state.cube;
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

    setupModeToggle() {
        const localBtn = document.getElementById('local-mode-btn');
        const preciseBtn = document.getElementById('precise-mode-btn');
        const localSection = document.getElementById('local-rotation-section');
        const preciseSection = document.getElementById('precise-orientation-section');
        
        if (!localBtn || !preciseBtn || !localSection || !preciseSection) {
            console.error('Mode toggle elements not found');
            return;
        }
        
        const switchToMode = (mode) => {
            const previousMode = state.rotationMode;
            setRotationMode(mode);
            
            // Synchronize state between rotation systems
            if (previousMode !== mode) {
                synchronizeRotationState(mode);
            }
            
            // Update button states
            localBtn.classList.toggle('active', mode === 'local');
            preciseBtn.classList.toggle('active', mode === 'precise');
            
            // Update section visibility
            if (mode === 'local') {
                localSection.style.display = 'block';
                preciseSection.style.display = 'none';
            } else {
                localSection.style.display = 'none';
                preciseSection.style.display = 'block';
            }
            
            // Trigger update to reflect any state changes
            this.scheduleUpdate();
            
            console.log(`Switched to ${mode} rotation mode`);
        };
        
        localBtn.addEventListener('click', () => {
            switchToMode('local');
        });
        
        preciseBtn.addEventListener('click', () => {
            switchToMode('precise');
        });
        
        // Initialize with current mode
        switchToMode(state.rotationMode);
    }

    setupResetButton() {
        const resetBtn = document.getElementById('reset-rotation-btn');
        
        if (!resetBtn) {
            console.error('Reset button element not found');
            return;
        }
        
        resetBtn.addEventListener('click', () => {
            try {
                // Call the reset function
                resetCubeOrientation();
                
                // Add visual feedback
                resetBtn.textContent = '✅ Reset!';
                setTimeout(() => {
                    resetBtn.innerHTML = '🔄 Reset Rotation';
                }, 1000);
                
                // Trigger update to reflect changes
                this.scheduleUpdate();
                
                console.log('✅ Cube orientation reset via UI button');
            } catch (error) {
                console.error('Error resetting cube orientation:', error);
                
                // Show error feedback
                resetBtn.textContent = '❌ Error';
                setTimeout(() => {
                    resetBtn.innerHTML = '🔄 Reset Rotation';
                }, 1000);
            }
        });
        
        // Prevent event bubbling to avoid conflicts
        resetBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
    }
    
    setupEulerControl(elementId, angleProperty) {
        const slider = document.getElementById(elementId);
        const numberInput = document.getElementById(elementId + '-number');
        
        if (!slider || !numberInput) {
            console.error(`Euler control elements not found for ${elementId}`);
            return;
        }
        
        const updateOrientation = () => {
            if (!isPreciseOrientationMode()) {
                return; // Only apply when in precise mode
            }
            
            const cube = state.cube;
            if (!cube) {
                console.warn('No cube object available for orientation update');
                return;
            }
            
            // Get current Euler angles from state
            const { alpha, beta, gamma } = state.cubeEulerAngles;
            
            // Validate and apply the orientation
            const validated = validateEulerAngles(alpha, beta, gamma);
            setPreciseOrientation(cube, validated.alpha, validated.beta, validated.gamma);
            
            console.log(`Applied orientation: α=${validated.alpha}°, β=${validated.beta}°, γ=${validated.gamma}°`);
        };
        
        // Slider changes update number input and state
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            numberInput.value = value;
            state.cubeEulerAngles[angleProperty] = value;
            updateOrientation();
            this.scheduleUpdate();
        });
        
        // Number input changes update slider and state
        numberInput.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            
            // Validate and clamp value to slider's min/max
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            
            if (isNaN(value)) {
                value = state.cubeEulerAngles[angleProperty]; // Reset to current state value
                numberInput.value = value;
                return;
            }
            
            value = Math.max(min, Math.min(max, value));
            
            // Update inputs and state
            slider.value = value;
            numberInput.value = value;
            state.cubeEulerAngles[angleProperty] = value;
            
            updateOrientation();
            this.scheduleUpdate();
        });
        
        // Handle number input blur to ensure valid values
        numberInput.addEventListener('blur', (e) => {
            let value = parseFloat(e.target.value);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            
            if (isNaN(value)) {
                value = state.cubeEulerAngles[angleProperty];
            }
            
            value = Math.max(min, Math.min(max, value));
            numberInput.value = value;
            slider.value = value;
            state.cubeEulerAngles[angleProperty] = value;
        });
        
        // Initialize with current state value
        const currentValue = state.cubeEulerAngles[angleProperty];
        slider.value = currentValue;
        numberInput.value = currentValue;
    }

    recreateHemisphere() {
        // Phase 4: Use master3D architecture instead of individual scenes
        const hemisphere = state.hemisphere;
        
        if (hemisphere && state.master3D) {
            // Remove old hemisphere from master scene
            state.master3D.remove(hemisphere);
            safeDispose(hemisphere);
            
            // Create new hemisphere with updated radius using shared function
            const newHemisphere = createHemisphere(state.hemisphereRadius, state.viewpointPosition);
            state.master3D.add(newHemisphere);
            
            // Update state reference
            state.hemisphere = newHemisphere;
            
            // Update legacy references for compatibility
            if (this.sceneObjects) {
                this.sceneObjects.hemisphere = newHemisphere;
            }
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

function setupControlDragging() {
    try {
        controlsContainer = document.getElementById('controls-container');
        const controlsToggle = document.getElementById('controls-toggle');
        
        if (!controlsContainer || !controlsToggle) {
            console.error('Controls container or toggle not found');
            return;
        }
        
        // Make the toggle button draggable
        controlsContainer.classList.add('controls-draggable');
        
        // Mouse down event - start dragging
        controlsToggle.addEventListener('mousedown', (e) => {
            // Don't start drag if it's a right click or if already dragging
            if (e.button !== 0 || isDragging) return;
            
            isDragging = true;
            hasDragged = false; // Reset drag tracking
            
            // Calculate offset from mouse to top-left of container
            const rect = controlsContainer.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            // Add visual feedback for dragging
            controlsContainer.classList.add('controls-dragging');
            
            // Prevent text selection and other default behaviors
            e.preventDefault();
        });
        
        // Double-click to reset position
        controlsToggle.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Reset to original position
            controlsContainer.style.left = 'auto';
            controlsContainer.style.top = '20px';
            controlsContainer.style.right = '20px';
        });
        
        // Mouse move event - handle dragging
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            hasDragged = true; // Mark that we've actually dragged
            
            // Calculate new position
            let newLeft = e.clientX - dragOffset.x;
            let newTop = e.clientY - dragOffset.y;
            
            // Get window dimensions and container dimensions
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const containerRect = controlsContainer.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const containerHeight = containerRect.height;
            
            // Define minimum visible area (at least 50px should remain visible)
            const minVisible = 50;
            
            // Apply bounds checking
            newLeft = Math.max(-containerWidth + minVisible, Math.min(windowWidth - minVisible, newLeft));
            newTop = Math.max(-containerHeight + minVisible, Math.min(windowHeight - minVisible, newTop));
            
            // Apply new position
            controlsContainer.style.left = newLeft + 'px';
            controlsContainer.style.top = newTop + 'px';
            controlsContainer.style.right = 'auto'; // Override fixed right positioning
            
            e.preventDefault();
        });
        
        // Mouse up event - stop dragging
        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                
                // Remove visual feedback
                controlsContainer.classList.remove('controls-dragging');
            }
        });
        
        // Escape key to cancel dragging
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isDragging) {
                isDragging = false;
                hasDragged = false;
                
                // Remove visual feedback
                controlsContainer.classList.remove('controls-dragging');
            }
        });
        
    } catch (error) {
        console.error('Error setting up control dragging:', error);
    }
} 