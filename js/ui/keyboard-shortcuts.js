/**
 * Keyboard Shortcuts Module
 * Phase 4.1: Desktop UI/UX Improvements
 * Provides keyboard navigation and control shortcuts
 */

import { state } from '../state.js';
import { config } from '../config.js';
import { resetCubeOrientation, createHemisphere, safeDispose } from '../utils/three-utils.js';

export class KeyboardShortcuts {
    constructor(projectionManager) {
        this.projectionManager = projectionManager;
        this.helpVisible = false;
        this.controlsVisible = true;
        this.init();
    }

    init() {
        // Bind keyboard event listener
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Create help overlay (initially hidden)
        this.createHelpOverlay();
    }

    handleKeyDown(e) {
        // Don't interfere with input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        const key = e.key.toLowerCase();

        // Handle keyboard shortcuts
        switch (key) {
            case 'h':
                this.toggleHelp();
                e.preventDefault();
                break;

            case 'r':
                this.resetView();
                e.preventDefault();
                break;

            case 'c':
                this.toggleControls();
                e.preventDefault();
                break;

            case ' ':
                // Spacebar: Toggle rays
                this.toggleRays();
                e.preventDefault();
                break;

            case '1':
                this.focusViewport('linear3D-window');
                e.preventDefault();
                break;

            case '2':
                this.focusViewport('linear2D-window');
                e.preventDefault();
                break;

            case '3':
                this.focusViewport('hemi3D-window');
                e.preventDefault();
                break;

            case '4':
                this.focusViewport('hemi2D-window');
                e.preventDefault();
                break;

            case 'arrowup':
                this.adjustViewpoint(0, 0.1, 0);
                e.preventDefault();
                break;

            case 'arrowdown':
                this.adjustViewpoint(0, -0.1, 0);
                e.preventDefault();
                break;

            case 'arrowleft':
                this.adjustViewpoint(-0.1, 0, 0);
                e.preventDefault();
                break;

            case 'arrowright':
                this.adjustViewpoint(0.1, 0, 0);
                e.preventDefault();
                break;

            case 'pageup':
                // Move viewpoint closer (decrease Z)
                this.adjustViewpoint(0, 0, -0.1);
                e.preventDefault();
                break;

            case 'pagedown':
                // Move viewpoint farther (increase Z)
                this.adjustViewpoint(0, 0, 0.1);
                e.preventDefault();
                break;
        }
    }

    toggleHelp() {
        this.helpVisible = !this.helpVisible;
        const helpOverlay = document.getElementById('keyboard-help-overlay');
        if (helpOverlay) {
            helpOverlay.style.display = this.helpVisible ? 'flex' : 'none';
        }
    }

    resetView() {
        // Reset to default values
        state.viewpointPosition.set(
            config.DEFAULTS.viewpointPosition.x,
            config.DEFAULTS.viewpointPosition.y,
            config.DEFAULTS.viewpointPosition.z
        );

        // Store old radius to check if we need to recreate hemisphere
        const oldRadius = state.hemisphereRadius;
        state.hemisphereRadius = config.DEFAULTS.hemisphereRadius;

        state.cubeLocalRotation = { ...config.DEFAULTS.cubeLocalRotation };
        state.cubeEulerAngles = { ...config.DEFAULTS.cubeEulerAngles };
        state.rotationMode = config.DEFAULTS.rotationMode;
        state.zoomLevel2D = config.DEFAULTS.zoomLevel2D;
        state.zoom3D = config.DEFAULTS.zoom3D;
        state.showRedRays = true;
        state.linearProjectionShape = 'circle';

        // Reset cube rotation in the 3D scene
        resetCubeOrientation();

        // Recreate hemisphere if radius changed
        if (Math.abs(oldRadius - state.hemisphereRadius) > 0.01 && state.hemisphere && state.master3D) {
            state.master3D.remove(state.hemisphere);
            safeDispose(state.hemisphere);

            const newHemisphere = createHemisphere(state.hemisphereRadius, state.viewpointPosition);
            state.master3D.add(newHemisphere);
            state.hemisphere = newHemisphere;

            // Update legacy references
            if (window.sceneObjects) {
                window.sceneObjects.hemisphere = newHemisphere;
            }
        }

        // Update UI controls
        this.updateControlInputs();

        // Trigger update
        this.projectionManager.scheduleUpdate('all', true);

        console.log('View reset to defaults');
    }

    toggleControls() {
        this.controlsVisible = !this.controlsVisible;
        const controlsPanel = document.getElementById('controls');
        if (controlsPanel) {
            controlsPanel.classList.toggle('show');
        }
    }

    toggleRays() {
        state.showRedRays = !state.showRedRays;

        // Update checkbox if it exists
        const rayCheckbox = document.getElementById('show-red-rays');
        if (rayCheckbox) {
            rayCheckbox.checked = state.showRedRays;
        }

        this.projectionManager.scheduleUpdate('all', true);
        console.log(`Rays ${state.showRedRays ? 'shown' : 'hidden'}`);
    }

    focusViewport(windowId) {
        const windowElement = document.getElementById(windowId);
        if (windowElement) {
            // Add visual focus effect
            document.querySelectorAll('.window').forEach(win => {
                win.classList.remove('focused');
            });
            windowElement.classList.add('focused');

            // Bring to front (z-index)
            const maxZ = Math.max(...Array.from(document.querySelectorAll('.window'))
                .map(w => parseInt(window.getComputedStyle(w).zIndex) || 0));
            windowElement.style.zIndex = maxZ + 1;

            console.log(`Focused viewport: ${windowId}`);
        }
    }

    adjustViewpoint(dx, dy, dz) {
        state.viewpointPosition.x += dx;
        state.viewpointPosition.y += dy;
        state.viewpointPosition.z += dz;

        // Update UI inputs (both slider and number)
        const vpXInput = document.getElementById('viewpointX-number');
        const vpYInput = document.getElementById('viewpointY-number');
        const vpZInput = document.getElementById('viewpointZ-number');
        const vpXSlider = document.getElementById('viewpointX');
        const vpYSlider = document.getElementById('viewpointY');
        const vpZSlider = document.getElementById('viewpointZ');

        if (vpXInput) vpXInput.value = state.viewpointPosition.x.toFixed(2);
        if (vpYInput) vpYInput.value = state.viewpointPosition.y.toFixed(2);
        if (vpZInput) vpZInput.value = state.viewpointPosition.z.toFixed(2);
        if (vpXSlider) vpXSlider.value = state.viewpointPosition.x;
        if (vpYSlider) vpYSlider.value = state.viewpointPosition.y;
        if (vpZSlider) vpZSlider.value = state.viewpointPosition.z;

        this.projectionManager.scheduleUpdate('all', true);
    }

    updateControlInputs() {
        // Update all control inputs to match current state
        const vpXInput = document.getElementById('viewpointX-number');
        const vpYInput = document.getElementById('viewpointY-number');
        const vpZInput = document.getElementById('viewpointZ-number');
        const vpXSlider = document.getElementById('viewpointX');
        const vpYSlider = document.getElementById('viewpointY');
        const vpZSlider = document.getElementById('viewpointZ');
        const radiusInput = document.getElementById('hemisphereRadius-number');
        const radiusSlider = document.getElementById('hemisphereRadius');
        const rayCheckbox = document.getElementById('show-red-rays');
        const shapeToggle = document.getElementById('linear-shape-toggle');
        const presetSelect = document.getElementById('preset-select');

        if (vpXInput) vpXInput.value = state.viewpointPosition.x.toFixed(2);
        if (vpYInput) vpYInput.value = state.viewpointPosition.y.toFixed(2);
        if (vpZInput) vpZInput.value = state.viewpointPosition.z.toFixed(2);
        if (vpXSlider) vpXSlider.value = state.viewpointPosition.x;
        if (vpYSlider) vpYSlider.value = state.viewpointPosition.y;
        if (vpZSlider) vpZSlider.value = state.viewpointPosition.z;
        if (radiusInput) radiusInput.value = state.hemisphereRadius;
        if (radiusSlider) radiusSlider.value = state.hemisphereRadius;
        if (rayCheckbox) rayCheckbox.checked = state.showRedRays;
        if (shapeToggle) shapeToggle.checked = (state.linearProjectionShape === 'circle');
        if (presetSelect) presetSelect.value = 'custom'; // Reset to custom after manual reset

        // Rotation inputs (if using local rotation mode)
        if (state.rotationMode === 'local') {
            const rotXInput = document.getElementById('cubeRotX-number');
            const rotYInput = document.getElementById('cubeRotY-number');
            const rotZInput = document.getElementById('cubeRotZ-number');
            const rotXSlider = document.getElementById('cubeRotX');
            const rotYSlider = document.getElementById('cubeRotY');
            const rotZSlider = document.getElementById('cubeRotZ');

            if (rotXInput) rotXInput.value = state.cubeLocalRotation.x;
            if (rotYInput) rotYInput.value = state.cubeLocalRotation.y;
            if (rotZInput) rotZInput.value = state.cubeLocalRotation.z;
            if (rotXSlider) rotXSlider.value = state.cubeLocalRotation.x;
            if (rotYSlider) rotYSlider.value = state.cubeLocalRotation.y;
            if (rotZSlider) rotZSlider.value = state.cubeLocalRotation.z;
        }
    }

    createHelpOverlay() {
        // Create help overlay element
        const helpOverlay = document.createElement('div');
        helpOverlay.id = 'keyboard-help-overlay';
        helpOverlay.className = 'keyboard-help-overlay';
        helpOverlay.style.display = 'none';

        helpOverlay.innerHTML = `
            <div class="keyboard-help-content">
                <h2>Keyboard Shortcuts</h2>
                <div class="shortcuts-grid">
                    <div class="shortcut-group">
                        <h3>General</h3>
                        <div class="shortcut-item">
                            <kbd>H</kbd>
                            <span>Toggle this help</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>R</kbd>
                            <span>Reset view to defaults</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>C</kbd>
                            <span>Toggle controls panel</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Space</kbd>
                            <span>Toggle projection rays</span>
                        </div>
                    </div>

                    <div class="shortcut-group">
                        <h3>Viewports</h3>
                        <div class="shortcut-item">
                            <kbd>1</kbd>
                            <span>Focus Linear 3D</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>2</kbd>
                            <span>Focus Linear 2D</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>3</kbd>
                            <span>Focus Hemispherical 3D</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>4</kbd>
                            <span>Focus Hemispherical 2D</span>
                        </div>
                    </div>

                    <div class="shortcut-group">
                        <h3>Viewpoint Adjustment</h3>
                        <div class="shortcut-item">
                            <kbd>←</kbd><kbd>→</kbd>
                            <span>Move X-axis (±0.1)</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>↑</kbd><kbd>↓</kbd>
                            <span>Move Y-axis (±0.1)</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>PgUp</kbd><kbd>PgDn</kbd>
                            <span>Move Z-axis (±0.1)</span>
                        </div>
                    </div>
                </div>
                <button class="close-help-btn" onclick="document.getElementById('keyboard-help-overlay').style.display='none'">
                    Close (or press H)
                </button>
            </div>
        `;

        // Add click handler to close when clicking outside content
        helpOverlay.addEventListener('click', (e) => {
            if (e.target === helpOverlay) {
                this.toggleHelp();
            }
        });

        document.body.appendChild(helpOverlay);
    }
}
