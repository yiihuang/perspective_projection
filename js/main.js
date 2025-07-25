// Main Application Entry Point
import { config } from './config.js';
import { state } from './state.js';
import { WindowManager } from './ui/window-manager.js';
import { setupScenes } from './scenes/scene-manager.js';
import { createSceneObjects } from './scenes/objects.js';
import { ProjectionManager } from './projections/projection-manager.js';
import { MouseHandlers } from './events/mouse-handlers.js';
import { Controls } from './ui/controls.js';
import { Renderer } from './rendering/renderer.js';
import { setPreciseOrientation, testEulerRotations, validateEulerAngles, synchronizeRotationState, resetCubeOrientation } from './utils/three-utils.js';

// Global instances
let projectionManager;
let windowManager;
let mouseHandlers;
let controls;
let renderer;



// Initialize the application
export function init() {
    console.log('Initializing Perspective Visualization...');
    
    try {
        // Initialize components in order
        setupScenes();
        const sceneObjects = createSceneObjects();
        
        // Store scene objects globally for access by other modules
        window.scenes = state.scenes;
        window.sceneObjects = sceneObjects;
        
        // Expose rotation functions globally for testing and debugging
        window.setPreciseOrientation = setPreciseOrientation;
        window.testEulerRotations = testEulerRotations;
        window.validateEulerAngles = validateEulerAngles;
        window.synchronizeRotationState = synchronizeRotationState;
        window.resetCubeOrientation = resetCubeOrientation;
        

        
        // Initialize managers and handlers
        projectionManager = new ProjectionManager();
        windowManager = new WindowManager();
        mouseHandlers = new MouseHandlers(projectionManager, state.cameras);
        controls = new Controls(projectionManager, state.cameras, sceneObjects);
        renderer = new Renderer(projectionManager, state.scenes, state.cameras, state.renderers);
        
        // Expose renderer globally for immediate updates
        window.renderer = renderer;
        
        // Start the renderer
        renderer.start();
        
        // Initial projection update - force it to happen
        projectionManager.scheduleUpdate('all', true); // Force immediate update
        
        // Also call directly to ensure it happens
        projectionManager.updateProjections(
            state.scenes, 
            state.groups, 
            sceneObjects.cube, 
            sceneObjects.viewpointSphere, 
            sceneObjects.imagePlane, 
            sceneObjects.hemisphere
        );
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
} 