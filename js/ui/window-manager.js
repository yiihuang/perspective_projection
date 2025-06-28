// Window Management System
import { state } from '../state.js';
import { config } from '../config.js';
import { update2DCameras } from '../scenes/scene-manager.js';

/**
 * Window Manager Class
 * Handles window visibility, dragging, and menu interactions
 */
export class WindowManager {
    constructor() {
        this.initializeWindowDragging();
        this.setupMenuControls();
        
        // Make toggleWindow method available globally for HTML onclick handlers
        window.windowManager = this;
    }

    toggleWindow(windowId) {
        const window = document.getElementById(windowId);
        const isVisible = state.windowStates[windowId];
        
        if (isVisible) {
            window.style.display = 'none';
            state.windowStates[windowId] = false;
        } else {
            window.style.display = 'flex';
            state.windowStates[windowId] = true;
            
            // Force renderer update when window becomes visible
            const viewId = windowId.replace('-window', '');
            
            // Use multiple timeouts to ensure proper rendering
            setTimeout(() => {
                if (state.renderers[viewId]) {
                    const viewElement = document.getElementById(viewId);
                    
                    // Force a reflow to ensure dimensions are available
                    viewElement.offsetHeight;
                    
                    // Update renderer size
                    state.renderers[viewId].setSize(viewElement.clientWidth, viewElement.clientHeight);
                    
                    // Update camera
                    if (state.cameras[viewId]) {
                        if (state.cameras[viewId].isPerspectiveCamera) {
                            state.cameras[viewId].aspect = viewElement.clientWidth / viewElement.clientHeight;
                            state.cameras[viewId].updateProjectionMatrix();
                        } else {
                            // Update 2D cameras for orthographic projection
                            update2DCameras();
                        }
                    }
                    
                    // Mark viewport as dirty and force immediate render
                    state.viewportDirty[viewId] = true;
                    state.needsUpdate.render = true;
                    
                    // Force immediate render
                    state.renderers[viewId].render(state.scenes[viewId], state.cameras[viewId]);
                    
                    // Schedule additional updates to ensure everything is correct
                    setTimeout(() => {
                        state.viewportDirty[viewId] = true;
                        state.needsUpdate.render = true;
                        state.renderers[viewId].render(state.scenes[viewId], state.cameras[viewId]);
                    }, 50);
                }
            }, 10);
            
            // Additional delayed update to catch any missed cases
            setTimeout(() => {
                if (state.renderers[viewId]) {
                    const viewElement = document.getElementById(viewId);
                    state.renderers[viewId].setSize(viewElement.clientWidth, viewElement.clientHeight);
                    state.viewportDirty[viewId] = true;
                    state.needsUpdate.render = true;
                    state.renderers[viewId].render(state.scenes[viewId], state.cameras[viewId]);
                }
            }, 200);
        }
        
        this.updateWindowMenuCheckmarks();
    }

    updateWindowMenuCheckmarks() {
        const menuItems = document.querySelectorAll('.window-menu-item');
        const windowIds = ['linear3D-window', 'linear2D-window', 'hemi3D-window', 'hemi2D-window'];
        
        menuItems.forEach((item, index) => {
            const checkmark = item.querySelector('.checkmark');
            if (state.windowStates[windowIds[index]]) {
                checkmark.style.visibility = 'visible';
            } else {
                checkmark.style.visibility = 'hidden';
            }
        });
    }

    setupMenuControls() {
        // Handle window menu dropdown toggle
        const windowMenuToggle = document.getElementById('window-menu-toggle');
        const windowMenu = document.getElementById('window-menu');
        
        if (windowMenuToggle && windowMenu) {
            windowMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                windowMenu.classList.toggle('show');
            });
            
            // Close window menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#window-menu-container')) {
                    windowMenu.classList.remove('show');
                }
            });
            
            // Prevent window menu from closing when clicking inside
            windowMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    initializeWindowDragging() {
        const windows = document.querySelectorAll('.window');
        
        windows.forEach(window => {
            const header = window.querySelector('.window-header');
            
            header.addEventListener('mousedown', (e) => {
                // Don't drag if clicking on window controls
                if (e.target.classList.contains('window-button')) return;
                
                state.dragState.isDragging = true;
                state.dragState.currentWindow = window;
                state.dragState.startX = e.clientX;
                state.dragState.startY = e.clientY;
                
                const rect = window.getBoundingClientRect();
                state.dragState.startLeft = rect.left;
                state.dragState.startTop = rect.top;
                
                // Bring window to front
                window.style.zIndex = '1000';
                
                e.preventDefault();
            });
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!state.dragState.isDragging || !state.dragState.currentWindow) return;
            
            const deltaX = e.clientX - state.dragState.startX;
            const deltaY = e.clientY - state.dragState.startY;
            
            const newLeft = state.dragState.startLeft + deltaX;
            const newTop = state.dragState.startTop + deltaY;
            
            // Keep window within viewport bounds
            const maxLeft = window.innerWidth - config.UI.minVisibleWidth;
            const maxTop = window.innerHeight - config.UI.minVisibleHeight;
            
            state.dragState.currentWindow.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';
            state.dragState.currentWindow.style.top = Math.max(0, Math.min(maxTop, newTop)) + 'px';
            state.dragState.currentWindow.style.right = 'auto';
            state.dragState.currentWindow.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            if (state.dragState.currentWindow) {
                state.dragState.currentWindow.style.zIndex = '10';
            }
            state.dragState.isDragging = false;
            state.dragState.currentWindow = null;
        });
    }
} 