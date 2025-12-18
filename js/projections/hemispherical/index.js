/**
 * Hemispherical Projection - Main Coordinator
 * Phase 3 Modularization: Coordinates all hemispherical projection modules
 * Entry point for the hemispherical projection system
 */

import { state } from '../../state.js';
import { clearGroup, updateMaster3DScene, updateProjectedViewpointMarker, safeDispose } from '../../utils/three-utils.js';

// Import geometry functions
import {
    intersectRayWithHemisphere,
    postelProjection,
    createHemi2DBoundary
} from './geometry.js';

// Import vanishing point functions
import {
    getCachedVanishingPoints,
    renderVanishingPoints
} from './vanishing-points.js';

// Import vertex projection functions
import {
    projectVerticesToPostel
} from './vertex-projection.js';

// Import edge rendering functions
import {
    renderGuideLines,
    renderProjectedVertices,
    renderProjectedCubeEdges
} from './edge-rendering.js';

/**
 * Main update function for hemispherical projection
 * Coordinates all sub-modules to render the complete projection
 * @param {Object} scenes - Three.js scenes {master3D, hemi2D, ...}
 * @param {Object} groups - Scene groups for organizing objects
 * @param {THREE.Mesh} hemisphere - The hemisphere mesh in 3D scene
 */
export function updateHemisphericalProjection(scenes, groups, hemisphere) {
    // Step 1: Update shared 3D scene objects (cube, viewpoint)
    // Use custom ray handling - we'll add rays ourselves
    const worldVertices = updateMaster3DScene({
        customRayHandling: true  // We'll handle rays ourselves with complementary system
    });

    // Step 2: Update hemisphere position
    const hemisphereCenter = state.viewpointPosition.clone();
    hemisphere.position.copy(hemisphereCenter);
    // No scaling needed - geometry is already created with correct radius

    // Step 3: Update hemisphere boundary in 2D
    if (window.hemiBoundary) {
        scenes.hemi2D.remove(window.hemiBoundary);
        safeDispose(window.hemiBoundary);
    }
    window.hemiBoundary = createHemi2DBoundary(scenes.hemi2D, state.hemisphereRadius);

    // Step 4: Clear previous 2D projections only (3D was handled by shared function)
    Object.values(groups.hemi2D).forEach(group => clearGroup(group));

    // Step 5: Update projected viewpoint marker
    const hemisphereDir = hemisphereCenter.clone().sub(state.viewpointPosition).normalize();
    const viewpointOnHemisphere = intersectRayWithHemisphere(
        state.viewpointPosition,
        hemisphereDir,
        hemisphereCenter,
        state.hemisphereRadius
    );
    if (viewpointOnHemisphere) {
        const projected2D = postelProjection(viewpointOnHemisphere, hemisphereCenter, state.hemisphereRadius);
        updateProjectedViewpointMarker('hemi2D', projected2D.x, projected2D.y, scenes.hemi2D);
    }

    // Step 6: Calculate boundary radius for 2D projection
    const boundaryRadius = (Math.PI / 2) * state.hemisphereRadius;

    // Step 7: Project vertices to 2D using Postel projection
    const projectedVertices = projectVerticesToPostel(worldVertices, boundaryRadius);

    // Step 8: Auto-fix cube matrix if determinant is off
    // This prevents accumulation of floating point errors
    if (state.cube) {
        const matrix = state.cube.matrixWorld;
        const det = matrix.determinant();
        if (Math.abs(det - 1.0) > 0.01) {
            state.cube.matrix.makeRotationFromEuler(state.cube.rotation);
            state.cube.updateMatrixWorld(true);
        }
    }

    // Step 9: Calculate vanishing points (with caching optimization)
    const vanishingPoints = getCachedVanishingPoints(worldVertices, boundaryRadius);

    // Step 10: Render vanishing point markers in 2D
    renderVanishingPoints(vanishingPoints, groups);

    // Step 11: Render guide lines from edges to vanishing points
    renderGuideLines(vanishingPoints, projectedVertices, boundaryRadius, groups);

    // Step 12: Render projected vertices as points
    renderProjectedVertices(projectedVertices, groups);

    // Step 13: Render projected cube edges as arcs
    renderProjectedCubeEdges(projectedVertices, vanishingPoints, boundaryRadius, groups);
}

// Re-export createHemi2DBoundary for backwards compatibility
export { createHemi2DBoundary };
