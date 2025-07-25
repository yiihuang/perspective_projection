import { updateLinearProjection } from './linear-projection.js';
import { updateHemisphericalProjection } from './hemispherical-projection.js';
import { state } from '../state.js';
import { clearGroup } from '../utils/three-utils.js';

/**
 * Projection Manager Module
 * Coordinates linear and hemispherical projections
 */

export class ProjectionManager {
    constructor() {
        this.cachedWorldVertices = null;
        this.lastCubeMatrixWorld = new THREE.Matrix4();
        this.lastUpdateHash = '';
        this.needsUpdate = {
            linear: true,
            hemi: true,
            render: true
        };
    }

    generateUpdateHash() {
        const rotationData = state.rotationMode === 'local' 
            ? `${state.cubeLocalRotation.x},${state.cubeLocalRotation.y},${state.cubeLocalRotation.z}`
            : `${state.cubeEulerAngles.alpha},${state.cubeEulerAngles.beta},${state.cubeEulerAngles.gamma}`;
        
        return `${state.viewpointPosition.x},${state.viewpointPosition.y},${state.viewpointPosition.z},${state.hemisphereRadius},${rotationData},${state.rotationMode},${state.showRedRays},${state.linearProjectionShape}`;
    }

    updateProjections(scenes, groups, cube, viewpointSphere, imagePlane, hemisphere) {
        // Simplified change detection - still use caching but be less aggressive
        const currentHash = this.generateUpdateHash();
        if (currentHash === this.lastUpdateHash) {
            return; // No changes, skip update
        }
        this.lastUpdateHash = currentHash;
        
        // Clear master3D projection lines once before both projections add their rays
        if (state.groups.master3D && state.groups.master3D.projectionLines) {
            clearGroup(state.groups.master3D.projectionLines);
        }
        
        // Always update both projections when needed to ensure all rays are added back
        updateLinearProjection(scenes, groups, imagePlane);
        updateHemisphericalProjection(scenes, groups, hemisphere);
        
        this.needsUpdate.linear = false;
        this.needsUpdate.hemi = false;
    }

    scheduleUpdate(updateType = 'all', immediate = false) {
        state.lastActivity = Date.now(); // Track user activity
        
        // Mark viewports as dirty based on update type
        if (updateType === 'all') {
            Object.keys(state.viewportDirty).forEach(key => state.viewportDirty[key] = true);
            this.needsUpdate.linear = true;
            this.needsUpdate.hemi = true;
        } else if (updateType === 'linear') {
            state.viewportDirty.linear3D = true;
            state.viewportDirty.linear2D = true;
            this.needsUpdate.linear = true;
        } else if (updateType === 'hemi') {
            state.viewportDirty.hemi3D = true;
            state.viewportDirty.hemi2D = true;
            this.needsUpdate.hemi = true;
        } else if (updateType === 'camera') {
            // Only 3D viewports need update for camera changes
            state.viewportDirty.linear3D = true;
            state.viewportDirty.hemi3D = true;
            // Camera changes also need projection updates if viewpoint changed
            this.needsUpdate.linear = true;
            this.needsUpdate.hemi = true;
        } else if (updateType === 'zoom2D') {
            // Only 2D viewports need update for zoom changes
            state.viewportDirty.linear2D = true;
            state.viewportDirty.hemi2D = true;
        }
        
        this.needsUpdate.render = true;
        
        // Boost frame rate during interaction
        state.targetFPS = 60;
        state.frameInterval = 1000 / state.targetFPS;
        
        if (immediate) {
            // For interactive updates, update immediately
            return true; // Indicate immediate update is needed
        }
        
        return false; // Indicate debounced update
    }

    shouldUpdate() {
        return this.needsUpdate.linear || this.needsUpdate.hemi;
    }

    markRenderNeeded() {
        this.needsUpdate.render = true;
    }

    isRenderNeeded() {
        return this.needsUpdate.render;
    }

    clearRenderFlag() {
        this.needsUpdate.render = false;
    }
} 