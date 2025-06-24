// Main Application Entry Point
import { CONFIG } from './config.js';
import { state } from './state.js';
import { initializeWindowDragging } from './ui/window-manager.js';
import { setupScenes } from './scenes/scene-manager.js';
import { createSceneObjects } from './scenes/objects.js';

// Initialize the application
export function init() {
    console.log('Initializing Perspective Visualization...');
    
    // Initialize components in order
    setupScenes();
    createSceneObjects();
    setupEventListeners();
    initializeResizeObserver();
    animate();
    
    console.log('Application initialized successfully');
}

function setupEventListeners() {
    // Initialize window dragging
    initializeWindowDragging();
    
    // This will be moved to events/ modules
    console.log('Setting up event listeners...');
}

function initializeResizeObserver() {
    // This will be moved to rendering/renderer.js
    console.log('Initializing resize observer...');
}

function animate() {
    // This will be moved to rendering/renderer.js
    console.log('Starting animation loop...');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
} 