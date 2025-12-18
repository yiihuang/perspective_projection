/**
 * Touch Event Handlers Module
 * Phase 5.2: Mobile Support - Touch gesture handling
 * Handles touch interactions for mobile devices
 */

import { state } from '../state.js';

export class TouchHandlers {
    constructor(projectionManager, cameras) {
        this.projectionManager = projectionManager;
        this.cameras = cameras;

        // Touch gesture state
        this.touches = new Map(); // Track active touches by identifier
        this.gestureState = {
            isRotating: false,
            isPinching: false,
            initialPinchDistance: 0,
            initialZoomLevel: 0,
            lastTouchPosition: { x: 0, y: 0 },
            currentViewType: null // '3D' or '2D'
        };

        this.setupEventListeners();
    }



    setupEventListeners() {
        // Add touch event listeners to 3D view elements
        const view3DElements = [
            document.getElementById('linear3D'),
            document.getElementById('hemi3D')
        ];

        view3DElements.forEach(viewElement => {
            if (!viewElement) return;

            viewElement.addEventListener('touchstart', (e) => {
                console.log('Touch start on 3D view');
                this.handleTouchStart(e, '3D');
            }, { passive: false });
            viewElement.addEventListener('touchmove', (e) => this.handleTouchMove(e, '3D'), { passive: false });
            viewElement.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
            viewElement.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
        });

        // Add touch event listeners to 2D view elements
        const view2DElements = [
            document.getElementById('linear2D'),
            document.getElementById('hemi2D')
        ];

        view2DElements.forEach(viewElement => {
            if (!viewElement) return;

            viewElement.addEventListener('touchstart', (e) => {
                console.log('Touch start on 2D view', viewElement.id);
                this.handleTouchStart(e, '2D');
            }, { passive: false });
            viewElement.addEventListener('touchmove', (e) => {
                console.log('Touch move on 2D view');
                this.handleTouchMove(e, '2D');
            }, { passive: false });
            viewElement.addEventListener('touchend', (e) => {
                console.log('Touch end on 2D view');
                this.handleTouchEnd(e);
            }, { passive: false });
            viewElement.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
        });
    }

    handleTouchStart(e, viewType) {
        // Don't interfere with controls or buttons
        if (e.target.closest('#controls-container')) return;
        if (e.target.closest('.window-button')) return;
        if (e.target.closest('.mobile-window-switcher')) return;

        // Prevent default to avoid browser gestures interfering
        e.preventDefault();

        this.gestureState.currentViewType = viewType;

        // Update touch tracking
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            this.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY
            });
        }

        const touchCount = this.touches.size;

        if (touchCount === 1) {
            // Single finger - prepare for rotation
            const touch = e.touches[0];
            this.gestureState.isRotating = true;
            this.gestureState.isPinching = false;
            this.gestureState.lastTouchPosition = {
                x: touch.clientX,
                y: touch.clientY
            };
        } else if (touchCount === 2) {
            // Two fingers - prepare for pinch zoom
            this.gestureState.isRotating = false;
            this.gestureState.isPinching = true;

            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            this.gestureState.initialPinchDistance = this.calculateDistance(
                touch1.clientX, touch1.clientY,
                touch2.clientX, touch2.clientY
            );

            // Safety guard: ensure initial distance is not zero (min 1px)
            // This prevents division by zero in later calculations
            if (this.gestureState.initialPinchDistance < 1) {
                this.gestureState.initialPinchDistance = 1;
            }

            this.gestureState.initialZoomLevel = state.zoomLevel2D;
        }
    }

    handleTouchMove(e, viewType) {
        // Don't interfere with controls or buttons
        if (e.target.closest('#controls-container')) return;
        if (e.target.closest('.window-button')) return;
        if (e.target.closest('.mobile-window-switcher')) return;

        e.preventDefault();

        const touchCount = e.touches.length;

        if (touchCount === 1 && this.gestureState.isRotating) {
            // Single finger rotation
            this.handleSingleTouchRotation(e, viewType);
        } else if (touchCount === 2 && this.gestureState.isPinching) {
            // Two finger pinch zoom
            this.handlePinchZoom(e, viewType);
        }
    }

    handleSingleTouchRotation(e, viewType) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.gestureState.lastTouchPosition.x;
        const deltaY = touch.clientY - this.gestureState.lastTouchPosition.y;

        if (viewType === '3D') {
            // Rotate cube (similar to left-click mouse drag)
            // Only allow touch cube rotation in local mode
            if (state.rotationMode !== 'local') {
                return; // Skip touch rotation in precise mode
            }

            const rotationSpeed = 0.5;
            const deltaRotationX = deltaY * rotationSpeed;
            const deltaRotationY = deltaX * rotationSpeed;

            const cube = state.cube;
            if (cube) {
                const axisX = new THREE.Vector3(1, 0, 0);
                const axisY = new THREE.Vector3(0, 1, 0);

                cube.rotateOnAxis(axisX, deltaRotationX * Math.PI / 180);
                cube.rotateOnAxis(axisY, deltaRotationY * Math.PI / 180);

                // Update local rotation state (approximate)
                state.cubeLocalRotation.x += deltaRotationX;
                state.cubeLocalRotation.y += deltaRotationY;

                this.projectionManager.scheduleUpdate('all', true);
            }
        } else if (viewType === '2D') {
            // 2D zoom with vertical drag removed as requested
            // Single finger now does nothing on 2D views to prevent accidental zooms
        }

        // Update last touch position
        this.gestureState.lastTouchPosition = {
            x: touch.clientX,
            y: touch.clientY
        };
    }

    handlePinchZoom(e, viewType) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const currentDistance = this.calculateDistance(
            touch1.clientX, touch1.clientY,
            touch2.clientX, touch2.clientY
        );

        if (viewType === '3D') {
            // Pinch zoom for 3D camera distance
            // Apply damping to make it less sensitive
            const sensitivity = 0.5;
            const rawZoomFactor = currentDistance / this.gestureState.initialPinchDistance;
            // Damped factor: closer to 1.0
            const zoomFactor = 1 + (rawZoomFactor - 1) * sensitivity;

            const newDistance = state.zoom3D / zoomFactor;

            // Clamp zoom distance
            const clampedDistance = Math.max(5, Math.min(50, newDistance));

            ['linear3D', 'hemi3D'].forEach(id => {
                const camera = this.cameras[id];
                if (camera) {
                    const currentDistance = camera.position.length();
                    if (currentDistance > 0) {
                        const scale = clampedDistance / currentDistance;
                        camera.position.multiplyScalar(scale);
                    }
                }
            });

            state.zoom3D = clampedDistance;
            this.projectionManager.scheduleUpdate('camera', true);

        } else if (viewType === '2D') {
            // Pinch zoom for 2D views
            const currentDistance = this.calculateDistance(
                touch1.clientX, touch1.clientY,
                touch2.clientX, touch2.clientY
            );

            // Safety guard for division by zero
            if (this.gestureState.initialPinchDistance < 1) return;

            const rawZoomFactor = currentDistance / this.gestureState.initialPinchDistance;

            // Apply damping to make it less sensitive (0.4 = 40% of raw speed)
            const sensitivity = 0.4;
            const dampedFactor = 1 + (rawZoomFactor - 1) * sensitivity;

            // Inverted logic: Spread fingers (factor > 1) = Zoom IN (smaller view size)
            // Ensure we don't divide by zero or negative if something goes wrong
            const safeFactor = Math.max(0.1, dampedFactor);

            let newZoom = this.gestureState.initialZoomLevel / safeFactor;

            // CRITICAL FIX: Ensure newZoom is valid
            if (!isFinite(newZoom) || isNaN(newZoom)) {
                return; // Ignore invalid calculations
            }

            state.zoomLevel2D = Math.max(5, Math.min(100, newZoom));



            this.update2DCameras();
            this.projectionManager.scheduleUpdate('zoom2D', true);

            // Force immediate render to prevent blank screen
            if (window.renderer) {
                window.renderer.render();
            }
        }
    }

    handleTouchEnd(e) {
        // Remove ended touches from tracking
        const activeTouchIds = new Set();
        for (let i = 0; i < e.touches.length; i++) {
            activeTouchIds.add(e.touches[i].identifier);
        }

        // Remove touches that are no longer active
        for (const [id, touch] of this.touches.entries()) {
            if (!activeTouchIds.has(id)) {
                this.touches.delete(id);
            }
        }

        // Reset gesture state if no touches remain
        if (this.touches.size === 0) {
            this.gestureState.isRotating = false;
            this.gestureState.isPinching = false;
            this.gestureState.currentViewType = null;
        } else if (this.touches.size === 1 && this.gestureState.isPinching) {
            // Transitioned from pinch to single touch
            const remainingTouch = e.touches[0];
            this.gestureState.isPinching = false;
            this.gestureState.isRotating = true;
            this.gestureState.lastTouchPosition = {
                x: remainingTouch.clientX,
                y: remainingTouch.clientY
            };
        }
    }

    calculateDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    update2DCameras() {
        // Update both 2D cameras with new zoom level
        ['linear2D', 'hemi2D'].forEach(id => {
            const camera = this.cameras[id];
            const viewElement = document.getElementById(id);

            if (camera && viewElement) {
                // Fix: Calculate aspect from element dimensions (camera.aspect isn't auto-maintained for Ortho)
                const aspect = viewElement.clientWidth / viewElement.clientHeight;
                const zoom = state.zoomLevel2D;

                // Fix: Match Renderer logic (zoom represents total height)
                camera.left = -zoom * aspect / 2;
                camera.right = zoom * aspect / 2;
                camera.top = zoom / 2;
                camera.bottom = -zoom / 2;

                camera.updateProjectionMatrix();
            }
        });
    }
}
