import { state } from '../state.js';
import { config } from '../config.js';

/**
 * Renderer Module
 * Handles animation loop, performance optimization, and resize handling
 */

export class Renderer {
    constructor(projectionManager, scenes, cameras, renderers) {
        this.projectionManager = projectionManager;
        this.scenes = scenes;
        this.cameras = cameras;
        this.renderers = renderers;
        
        // Performance monitoring
        this.renderStats = {
            totalFrames: 0,
            skippedFrames: 0,
            lastFPS: 60,
            renderTime: 0,
            lastFPSTime: Date.now()
        };
        
        this.frameCount = 0;
        this.lastFrameTime = Date.now();
        
        this.setupEventListeners();
        this.initializeResizeObserver();
        
        // Expose performance stats to console
        window.getRenderStats = () => this.getRenderStats();
    }

    setupEventListeners() {
        // Handle page visibility changes to fix rendering issues
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Page became visible, force re-render all visible windows
                setTimeout(() => {
                    Object.keys(this.renderers).forEach(id => {
                        const windowId = id + '-window';
                        if (state.windowStates[windowId]) {
                            const viewElement = document.getElementById(id);
                            if (viewElement && this.renderers[id] && this.cameras[id]) {
                                this.renderers[id].setSize(viewElement.clientWidth, viewElement.clientHeight);
                                state.viewportDirty[id] = true;
                                this.projectionManager.markRenderNeeded();
                                this.renderers[id].render(this.scenes[id], this.cameras[id]);
                            }
                        }
                    });
                }, 100);
            }
        });

        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    onWindowResize() {
        Object.keys(this.renderers).forEach(id => {
            const viewElement = document.getElementById(id);
            const camera = this.cameras[id];
            const renderer = this.renderers[id];
            
            if (camera.isPerspectiveCamera) {
                camera.aspect = viewElement.clientWidth / viewElement.clientHeight;
                camera.updateProjectionMatrix();
            } else {
                this.update2DCameras();
            }
            
            renderer.setSize(viewElement.clientWidth, viewElement.clientHeight);
        });
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

    initializeResizeObserver() {
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(entries => {
                entries.forEach(entry => {
                    const element = entry.target;
                    const id = element.id;
                    
                    // Skip if element has no dimensions (likely hidden)
                    if (element.clientWidth === 0 || element.clientHeight === 0) {
                        return;
                    }
                    
                    if (this.renderers[id]) {
                        const camera = this.cameras[id];
                        const renderer = this.renderers[id];
                        
                        if (camera.isPerspectiveCamera) {
                            camera.aspect = element.clientWidth / element.clientHeight;
                            camera.updateProjectionMatrix();
                        } else {
                            this.update2DCameras();
                        }
                        
                        renderer.setSize(element.clientWidth, element.clientHeight);
                        
                        // Force immediate render after resize
                        state.viewportDirty[id] = true;
                        this.projectionManager.markRenderNeeded();
                        renderer.render(this.scenes[id], camera);
                    }
                });
            });
            
            // Observe all view elements
            ['linear3D', 'linear2D', 'hemi3D', 'hemi2D'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    resizeObserver.observe(element);
                }
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const now = Date.now();
        const deltaTime = now - this.lastFrameTime;
        const timeSinceLastActivity = now - state.lastActivity;
        
        // Smart frame rate scaling
        state.isIdle = timeSinceLastActivity > 1000; // Consider idle after 1 second
        if (state.isIdle) {
            state.targetFPS = 30; // Reduce to 30fps when idle
            state.frameInterval = 1000 / state.targetFPS;
        }
        
        // Frame rate limiting
        if (deltaTime < state.frameInterval) {
            return; // Skip this frame
        }
        
        this.lastFrameTime = now;
        this.frameCount++;
        this.renderStats.totalFrames++;
        
        // Selective rendering: only render viewports that are dirty
        let rendered = false;
        const renderStartTime = performance.now();
        
        if (!state.isIdle || this.projectionManager.isRenderNeeded()) {
            Object.keys(this.renderers).forEach(id => {
                if (state.viewportDirty[id] || !state.isIdle) {
                    this.renderers[id].render(this.scenes[id], this.cameras[id]);
                    state.viewportDirty[id] = false;
                    rendered = true;
                }
            });
            
            if (rendered) {
                this.projectionManager.clearRenderFlag();
            }
        }
        
        // Update render stats
        if (rendered) {
            this.renderStats.renderTime = performance.now() - renderStartTime;
        } else {
            this.renderStats.skippedFrames++;
        }
        
        // Calculate FPS every second
        if (this.frameCount % 60 === 0) {
            const timeDiff = now - (this.renderStats.lastFPSTime || now);
            if (timeDiff > 0) {
                this.renderStats.lastFPS = Math.round(60000 / timeDiff);
            }
            this.renderStats.lastFPSTime = now;
        }
    }

    getRenderStats() {
        const efficiency = this.renderStats.totalFrames > 0 ? 
            (1 - this.renderStats.skippedFrames / this.renderStats.totalFrames) * 100 : 100;
        return {
            ...this.renderStats,
            efficiency: `${efficiency.toFixed(1)}%`,
            currentFPS: state.targetFPS,
            isIdle: state.isIdle
        };
    }

    // Optional: Create performance overlay (can be called from console)
    createPerformanceOverlay() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 10px; right: 10px; 
            background: rgba(0,0,0,0.8); color: white; 
            padding: 10px; font-family: monospace; font-size: 12px;
            border-radius: 5px; z-index: 1000;
        `;
        document.body.appendChild(overlay);
        
        const interval = setInterval(() => {
            const stats = this.getRenderStats();
            overlay.innerHTML = `
                FPS: ${stats.lastFPS}<br>
                Target: ${stats.currentFPS}<br>
                Efficiency: ${stats.efficiency}<br>
                Render Time: ${stats.renderTime.toFixed(2)}ms<br>
                Status: ${stats.isIdle ? 'Idle' : 'Active'}
            `;
        }, 500);

        // Return function to remove overlay
        return () => {
            clearInterval(interval);
            overlay.remove();
        };
    }

    start() {
        this.animate();
    }
} 