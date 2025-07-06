import { state } from '../state.js';
import { config } from '../config.js';
import { createMaterial, clearGroup, updateCubeInScene, updateViewpointInScene, updateProjectedViewpointMarker, getCachedWorldVertices, updateMaster3DScene, RAY_MATERIALS } from '../utils/three-utils.js';

/**
 * Linear Perspective Projection Module
 * Handles all linear perspective calculations and visual updates
 */

export function getImagePlaneZ() {
    return state.viewpointPosition.z - state.hemisphereRadius;
}

export function createLinear2DBoundary(scene) {
    const halfSize = state.hemisphereRadius; // Half of 2R size
    // Fixed boundary centered at origin (reference frame)
    const planeBoundaryPoints = [
        new THREE.Vector3(-halfSize, -halfSize, 0), 
        new THREE.Vector3(halfSize, -halfSize, 0),
        new THREE.Vector3(halfSize, halfSize, 0), 
        new THREE.Vector3(-halfSize, halfSize, 0)
    ];
    const planeBoundaryGeom = new THREE.BufferGeometry().setFromPoints(planeBoundaryPoints);
    const planeBoundaryMat = new THREE.LineBasicMaterial({ color: config.COLORS.boundary });
    const linearBoundary = new THREE.LineLoop(planeBoundaryGeom, planeBoundaryMat);
    scene.add(linearBoundary);
    return linearBoundary;
}

export function updateLinearProjection(scenes, groups, imagePlane) {
    // Update shared 3D scene objects (cube, viewpoint) - using custom ray handling
    const worldVertices = updateMaster3DScene({
        customRayHandling: true  // We'll handle rays ourselves with complementary system
    });
    
    // Update image plane size, position and center at viewpoint height
    const currentImagePlaneZ = getImagePlaneZ();
    const newPlaneSize = 2 * state.hemisphereRadius;
    
    // Update image plane geometry if size changed
    if (imagePlane.geometry.parameters.width !== newPlaneSize) {
        // Dispose old geometries
        imagePlane.geometry.dispose();
        const planeBorder = imagePlane.children[0];
        if (planeBorder && planeBorder.geometry) {
            planeBorder.geometry.dispose();
        }
        
        // Create new geometries
        imagePlane.geometry = new THREE.PlaneGeometry(newPlaneSize, newPlaneSize);
        if (planeBorder) {
            planeBorder.geometry = new THREE.EdgesGeometry(imagePlane.geometry);
        }
    }
    
    // Position image plane at viewpoint height and correct Z distance
    imagePlane.position.set(state.viewpointPosition.x, state.viewpointPosition.y, currentImagePlaneZ);
    
    // Update 2D boundary - fixed at origin in reference frame
    if (window.linearBoundary) {
        scenes.linear2D.remove(window.linearBoundary);
        window.linearBoundary.geometry?.dispose();
        window.linearBoundary.material?.dispose();
    }
    window.linearBoundary = createLinear2DBoundary(scenes.linear2D);
    
    // Clear previous 2D projections only (3D was handled by shared function)
    Object.values(groups.linear2D).forEach(group => clearGroup(group));
    
    // Update projected viewpoint marker (always at origin in reference frame)
    updateProjectedViewpointMarker('linear2D', 0, 0, scenes.linear2D);
    
    // Calculate 2D projections (cube vertices already available from shared function)
    const projectedVertices = [];

    worldVertices.forEach(worldVertex => {
        const x = worldVertex.x - state.viewpointPosition.x;
        const y = worldVertex.y - state.viewpointPosition.y;
        const z = worldVertex.z - state.viewpointPosition.z;

        if (z !== 0) {
             const x_proj = x * (currentImagePlaneZ - state.viewpointPosition.z) / z + state.viewpointPosition.x;
             const y_proj = y * (currentImagePlaneZ - state.viewpointPosition.z) / z + state.viewpointPosition.y;
             // Transform to reference frame where viewpoint projection is at origin
             const x_ref = x_proj - state.viewpointPosition.x;
             const y_ref = y_proj - state.viewpointPosition.y;
             projectedVertices.push(new THREE.Vector2(x_ref, y_ref));
        } else {
             projectedVertices.push(new THREE.Vector2(Infinity, Infinity));
        }
    });

    // Add ray visualization (full red rays only)
    worldVertices.forEach(worldVertex => {
        if (state.showRedRays) {
            // Full red rays (viewpoint → cube vertices)
            const redRay = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([state.viewpointPosition, worldVertex]), 
                RAY_MATERIALS.RED_FULL
            );
            state.groups.master3D.projectionLines.add(redRay);
        }
        // If showRedRays is false, no rays are drawn at all
    });

    // Draw projected cube edges
    const edges = config.CUBE_MAPPINGS.edges;
    const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: config.COLORS.cubeEdge, // Use same color as hemispherical projection
        linewidth: 3 // Make edges thicker to ensure they're visible on top
    });
    for (let i = 0; i < edges.length; i += 2) {
        const p1 = projectedVertices[edges[i]];
        const p2 = projectedVertices[edges[i+1]];
        if (isFinite(p1.x) && isFinite(p1.y) && isFinite(p2.x) && isFinite(p2.y)) {
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(p1.x, p1.y, 0.2), // Higher z-index to render on top
                new THREE.Vector3(p2.x, p2.y, 0.2)
            ]), edgeMaterial);
            groups.linear2D.projectedCubeLines.add(line);
        }
    }

    // Calculate and draw vanishing points
    const dirX = new THREE.Vector3().subVectors(worldVertices[1], worldVertices[0]);
    const dirY = new THREE.Vector3().subVectors(worldVertices[3], worldVertices[0]);
    const dirZ = new THREE.Vector3().subVectors(worldVertices[4], worldVertices[0]);

    const vanishingPoints = [
        { dir: dirX, color: config.COLORS.vanishingPoint.red, lightColor: config.COLORS.guide.red }, 
        { dir: dirY, color: config.COLORS.vanishingPoint.green, lightColor: config.COLORS.guide.green }, 
        { dir: dirZ, color: config.COLORS.vanishingPoint.blue, lightColor: config.COLORS.guide.blue }  
    ].map(item => {
        let vp = new THREE.Vector2(Infinity, Infinity);
        const dz = item.dir.z;
        if (Math.abs(dz) > 0.0001) {
            const t = (currentImagePlaneZ - state.viewpointPosition.z) / dz;
            const vp_x = state.viewpointPosition.x + t * item.dir.x;
            const vp_y = state.viewpointPosition.y + t * item.dir.y;
            // Transform to reference frame where viewpoint projection is at origin
            vp.x = vp_x - state.viewpointPosition.x;
            vp.y = vp_y - state.viewpointPosition.y;
        }
        return { point: vp, color: item.color, lightColor: item.lightColor };
    });

    vanishingPoints.forEach(vpData => {
        if (isFinite(vpData.point.x) && isFinite(vpData.point.y)) {
            const vpGeom = new THREE.CircleGeometry(0.15, 16);
            const vpMat = createMaterial('VanishingPointMaterial', { color: vpData.color });
            const vpMesh = new THREE.Mesh(vpGeom, vpMat);
            vpMesh.position.set(vpData.point.x, vpData.point.y, 0);
            groups.linear2D.vanishingPoints.add(vpMesh);
        }
    });

    // Draw guide lines from cube edges to vanishing points
    const edgeAxisMapping = config.CUBE_MAPPINGS.edgeAxisMapping;

    vanishingPoints.forEach((vpData, axisIndex) => {
        if (!isFinite(vpData.point.x) || !isFinite(vpData.point.y)) return;

        const guideMaterial = createMaterial('GuideMaterial', { color: vpData.lightColor });

        const axisVertices = edgeAxisMapping[axisIndex];
        for (const vertexIndex of axisVertices) {
            const p1 = projectedVertices[vertexIndex];
            if (isFinite(p1.x) && isFinite(p1.y)) {
                const lineGeom = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(p1.x, p1.y, 0),
                    new THREE.Vector3(vpData.point.x, vpData.point.y, 0)
                ]);
                const line = new THREE.Line(lineGeom, guideMaterial);
                groups.linear2D.extensionLines.add(line);
            }
        }
    });
} 