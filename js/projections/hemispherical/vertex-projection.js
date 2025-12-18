/**
 * Hemispherical Projection - Vertex Projection Module
 * Phase 3 Modularization: Projects cube vertices to 2D plane
 * Uses intersection-based method with theta/phi calculations
 */

import { state } from '../../state.js';
import { RAY_MATERIALS } from '../../utils/three-utils.js';
import {
    computeCircleFromThreePoints,
    intersectArcsOrLines,
    selectCorrectIntersection,
    intersectRayWithHemisphere,
    postelProjection
} from './geometry.js';

/**
 * Project cube vertices to 2D using hemispherical projection
 * @param {Array<THREE.Vector3>} worldVertices - Cube vertices in world space
 * @param {number} boundaryRadius - Radius of the boundary circle
 * @returns {Array<THREE.Vector2>} Projected 2D vertices
 */
export function projectVerticesToPostel(worldVertices, boundaryRadius) {
    const projectedVertices = [];

    worldVertices.forEach(worldVertex => {
        const direction = worldVertex.clone().sub(state.viewpointPosition).normalize();

        // Project to YZ plane (set x=0) for theta calculation
        const v_yz = new THREE.Vector3(0, direction.y, direction.z);
        v_yz.normalize();
        const theta = Math.atan2(v_yz.y, Math.abs(v_yz.z));

        // Project to XZ plane (set y=0) for phi calculation
        const v_xz = new THREE.Vector3(direction.x, 0, direction.z);
        v_xz.normalize();
        const phi = Math.atan2(v_xz.x, Math.abs(v_xz.z));

        // Compute points in 2D projection (use radians directly)
        const p_theta = { x: 0, y: state.hemisphereRadius * theta };
        const p_phi = { x: state.hemisphereRadius * phi, y: 0 };

        // Define boundary circle and axis points
        const X1 = { x: boundaryRadius, y: 0 };
        const X2 = { x: -boundaryRadius, y: 0 };
        const Y1 = { x: 0, y: boundaryRadius };
        const Y2 = { x: 0, y: -boundaryRadius };

        // Check for collinear cases (when theta or phi is zero)
        const isThetaZero = Math.abs(theta) < 0.001;
        const isPhiZero = Math.abs(phi) < 0.001;

        let projectedPoint;

        if (isThetaZero && isPhiZero) {
            // Both theta and phi are zero - vertex is at origin
            projectedPoint = { x: 0, y: 0 };
        } else if (isThetaZero) {
            // Only theta is zero - vertex position is p_phi
            projectedPoint = p_phi;
        } else if (isPhiZero) {
            // Only phi is zero - vertex position is p_theta
            projectedPoint = p_theta;
        } else {
            // Normal case: use intersection of circles
            const arc1 = computeCircleFromThreePoints(p_theta, X1, X2);
            const arc2 = computeCircleFromThreePoints(p_phi, Y1, Y2);

            let arc1Data, arc2Data;

            if (arc1) {
                arc1Data = { type: 'circle', center: arc1.center, radius: arc1.radius, p1: p_theta, p2: X2 };
            } else {
                arc1Data = { type: 'line', p1: p_theta, p2: X2 };
            }

            if (arc2) {
                arc2Data = { type: 'circle', center: arc2.center, radius: arc2.radius, p1: p_phi, p2: Y2 };
            } else {
                arc2Data = { type: 'line', p1: p_phi, p2: Y2 };
            }

            // Find intersections
            const intersections = intersectArcsOrLines(arc1Data, arc2Data);
            projectedPoint = selectCorrectIntersection(intersections, boundaryRadius);
        }

        if (projectedPoint) {
            projectedVertices.push(new THREE.Vector2(projectedPoint.x, projectedPoint.y));
        } else {
            projectedVertices.push(new THREE.Vector2(Infinity, Infinity));
        }

        // Add ray visualization (full red rays only)
        if (state.showRedRays) {
            // Full red rays (viewpoint → extended points)
            const extendedPoint = state.viewpointPosition.clone().add(direction.clone().multiplyScalar(30));
            const redRay = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([state.viewpointPosition, extendedPoint]),
                RAY_MATERIALS.RED_EXTENDED
            );
            state.groups.master3D.projectionLines.add(redRay);
        }
    });

    return projectedVertices;
}

/**
 * Update projected viewpoint marker in 2D scene
 * @param {THREE.Scene} scene - The 2D scene to render to
 */
export function updateProjectedViewpoint(scene) {
    const hemisphereCenter = state.viewpointPosition.clone();
    const hemisphereDir = hemisphereCenter.clone().sub(state.viewpointPosition).normalize();
    const viewpointOnHemisphere = intersectRayWithHemisphere(
        state.viewpointPosition,
        hemisphereDir,
        hemisphereCenter,
        state.hemisphereRadius
    );

    if (viewpointOnHemisphere) {
        const projected2D = postelProjection(viewpointOnHemisphere, hemisphereCenter, state.hemisphereRadius);
        // Note: Assumes updateProjectedViewpointMarker is imported in index.js
        return { x: projected2D.x, y: projected2D.y };
    }

    return null;
}
