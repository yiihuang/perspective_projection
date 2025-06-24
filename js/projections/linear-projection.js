import { state } from '../state.js';
import { config } from '../config.js';
import { createMaterial, clearGroup, updateCubeInScene, updateViewpointInScene, updateProjectedViewpointMarker, getCachedWorldVertices } from '../utils/three-utils.js';

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

export function updateLinearProjection(scenes, groups, cube, viewpointSphere, imagePlane) {
    // Update cube and viewpoint positions using helper functions
    updateCubeInScene('linear3D', cube, scenes.linear3D);
    updateViewpointInScene('linear3D', state.viewpointPosition, scenes.linear3D);
    
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
    
    // Clear previous projections
    Object.values(groups.linear2D).forEach(group => clearGroup(group));
    Object.values(groups.linear3D).forEach(group => clearGroup(group));
    
    // Update projected viewpoint marker (always at origin in reference frame)
    updateProjectedViewpointMarker('linear2D', 0, 0, scenes.linear2D);
    
    // Project cube vertices (use cached vertices for better performance)
    const worldVertices = getCachedWorldVertices(cube);
    const projectedVertices = [];

    // Draw projection lines and calculate 2D projections
    worldVertices.forEach(worldVertex => {
        const lineMat = createMaterial('ProjectionLineMaterial');
        groups.linear3D.projectionLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([state.viewpointPosition, worldVertex]), lineMat));
        
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

    // Draw projected cube edges
    const edges = [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ];
    const projectedLineMaterial = createMaterial('LineBasicMaterial');
    for (let i = 0; i < edges.length; i += 2) {
        const p1 = projectedVertices[edges[i]];
        const p2 = projectedVertices[edges[i+1]];
        if (isFinite(p1.x) && isFinite(p1.y) && isFinite(p2.x) && isFinite(p2.y)) {
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(p1.x, p1.y, 0),
                new THREE.Vector3(p2.x, p2.y, 0)
            ]), projectedLineMaterial);
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
    const edgeAxisMapping = {
        0: [0, 1,  2, 3,  4, 5,  6, 7], // X-axis edges (indices of vertices)
        1: [0, 3,  1, 2,  4, 7,  5, 6], // Y-axis edges
        2: [0, 4,  1, 5,  2, 6,  3, 7]  // Z-axis edges
    };

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