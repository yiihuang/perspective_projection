/**
 * Hemispherical Projection - Vanishing Points Module
 * Phase 3 Modularization: Vanishing point calculation, caching, and rendering
 * Includes Phase 2 optimization (LRU cache)
 */

import { state } from '../../state.js';
import { config } from '../../config.js';
import { MATERIALS } from '../../utils/three-utils.js';
import {
    computeCircleFromThreePoints,
    intersectArcsOrLines,
    selectCorrectIntersection
} from './geometry.js';

/**
 * Phase 2 Optimization: Vanishing Point Cache
 * LRU cache to avoid recalculating vanishing points when cube rotation hasn't changed
 */
const vpCache = new Map();
const MAX_VP_CACHE_SIZE = 10;

// Cache statistics for performance monitoring
const vpCacheStats = {
    hits: 0,
    misses: 0,
    totalCalls: 0
};

// Expose cache stats to console for debugging
if (typeof window !== 'undefined') {
    window.getVPCacheStats = () => ({
        ...vpCacheStats,
        cacheSize: vpCache.size,
        hitRate: vpCacheStats.totalCalls > 0
            ? ((vpCacheStats.hits / vpCacheStats.totalCalls) * 100).toFixed(1) + '%'
            : '0%'
    });
}

/**
 * Generate hash key from cube rotation matrix
 * Only uses rotation portion (first 9 elements) to detect rotation changes
 * @param {THREE.Matrix4} cubeMatrixWorld - Cube's world transformation matrix
 * @param {number} hemisphereRadius - Current hemisphere radius
 * @returns {string} Hash key for cache lookup
 */
function generateVPCacheKey(cubeMatrixWorld, hemisphereRadius) {
    // Extract rotation portion of matrix (ignore position in elements 12, 13, 14)
    const rotationHash = cubeMatrixWorld.elements.slice(0, 9)
        .map(v => v.toFixed(6))
        .join(',');

    // Include hemisphere radius as it affects VP calculations
    return `${rotationHash}|${hemisphereRadius.toFixed(3)}`;
}

/**
 * Get cached vanishing points or calculate new ones
 * Implements LRU eviction when cache exceeds max size
 * @param {Array<THREE.Vector3>} worldVertices - Cube vertices in world space
 * @param {number} boundaryRadius - Radius of the boundary circle
 * @returns {Array} Array of vanishing points [insideVP1, outsideVP1, insideVP2, outsideVP2, ...]
 */
export function getCachedVanishingPoints(worldVertices, boundaryRadius) {
    vpCacheStats.totalCalls++;

    if (!state.cube) {
        // No cube, can't cache
        return calculateVanishingPoints(worldVertices, boundaryRadius);
    }

    const cacheKey = generateVPCacheKey(state.cube.matrixWorld, state.hemisphereRadius);

    // Check cache
    if (vpCache.has(cacheKey)) {
        vpCacheStats.hits++;
        // Move to end (LRU)
        const cached = vpCache.get(cacheKey);
        vpCache.delete(cacheKey);
        vpCache.set(cacheKey, cached);
        return cached;
    }

    // Cache miss - calculate fresh VPs
    vpCacheStats.misses++;
    const vps = calculateVanishingPoints(worldVertices, boundaryRadius);

    // Store in cache
    vpCache.set(cacheKey, vps);

    // LRU eviction if cache too large
    if (vpCache.size > MAX_VP_CACHE_SIZE) {
        const firstKey = vpCache.keys().next().value;
        vpCache.delete(firstKey);
    }

    return vps;
}

/**
 * Calculate vanishing points for the three axes
 * Extracted for caching (Phase 2 Optimization)
 * @param {Array<THREE.Vector3>} worldVertices - Cube vertices in world space
 * @param {number} boundaryRadius - Radius of the boundary circle
 * @returns {Array} Array of vanishing points [insideVP1, outsideVP1, insideVP2, outsideVP2, insideVP3, outsideVP3]
 */
function calculateVanishingPoints(worldVertices, boundaryRadius) {
    // Calculate direction vectors from cube edges
    const dirX = new THREE.Vector3().subVectors(worldVertices[1], worldVertices[0]);
    const dirY = new THREE.Vector3().subVectors(worldVertices[3], worldVertices[0]);
    const dirZ = new THREE.Vector3().subVectors(worldVertices[4], worldVertices[0]);

    const vanishingPointData = [
        { dir: dirX.normalize(), color: config.COLORS.vanishingPoint.red },
        { dir: dirY.normalize(), color: config.COLORS.vanishingPoint.green },
        { dir: dirZ.normalize(), color: config.COLORS.vanishingPoint.blue }
    ];

    const vanishingPoints = [];

    vanishingPointData.forEach((vpData, axisIndex) => {
        // Calculate both positive and negative directions for each axis
        const posDirection = vpData.dir;
        const negDirection = vpData.dir.clone().negate();

        // Choose direction based on dot product with -Z direction
        const negZDirection = new THREE.Vector3(0, 0, -1);
        const posDotProduct = posDirection.dot(negZDirection);
        const negDotProduct = negDirection.dot(negZDirection);

        // Use the direction with positive dot product (pointing more toward -Z)
        const chosenDirection = posDotProduct > negDotProduct ? posDirection : negDirection;

        // Use the same projection method as vertices, with boundary circle handling
        const direction = chosenDirection;

        // Calculate psi: angle of direction vector projected to XY plane relative to X axis
        const psi = Math.atan2(direction.y, direction.x);

        // Project to YZ plane (set x=0) for theta calculation
        const v_yz = new THREE.Vector3(0, direction.y, direction.z);
        v_yz.normalize();
        const theta = Math.atan2(v_yz.y, Math.abs(v_yz.z));

        // Project to XZ plane (set y=0) for phi calculation
        const v_xz = new THREE.Vector3(direction.x, 0, direction.z);
        v_xz.normalize();
        const phi = Math.atan2(v_xz.x, Math.abs(v_xz.z));

        // Check if we're on the boundary circle (theta or phi near ±π/2)
        const isThetaBoundary = Math.abs(Math.abs(theta) - Math.PI/2) < 0.001;
        const isPhiBoundary = Math.abs(Math.abs(phi) - Math.PI/2) < 0.001;
        const isOnBoundary = isThetaBoundary || isPhiBoundary;

        let insideVP = null;

        if (isOnBoundary) {
            // Vanishing point is on the boundary circle at angle psi
            insideVP = {
                x: boundaryRadius * Math.cos(psi),
                y: boundaryRadius * Math.sin(psi)
            };
        } else {
            // Normal case: use the same method as vertices
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

            if (isThetaZero && isPhiZero) {
                // Both theta and phi are zero - vanishing point is at origin
                insideVP = { x: 0, y: 0 };
            } else if (isThetaZero) {
                // Only theta is zero - vanishing point position is p_phi
                insideVP = p_phi;
            } else if (isPhiZero) {
                // Only phi is zero - vanishing point position is p_theta
                insideVP = p_theta;
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
                insideVP = selectCorrectIntersection(intersections, boundaryRadius);
            }
        }

        // Calculate outside vanishing point using inversion formula
        let outsideVP = null;
        if (insideVP) {
            const insideDistance = Math.sqrt(insideVP.x * insideVP.x + insideVP.y * insideVP.y);

            // Only calculate outside VP if inside VP is not at center (to avoid division by zero)
            if (insideDistance > 0.001) {
                const outsideDistance = (boundaryRadius * boundaryRadius) / insideDistance;
                const insideAngle = Math.atan2(insideVP.y, insideVP.x);
                const outsideAngle = insideAngle + Math.PI; // Add π radians (180°)
                outsideVP = {
                    x: outsideDistance * Math.cos(outsideAngle),
                    y: outsideDistance * Math.sin(outsideAngle)
                };
            }
        }

        // Store inside VP at index 0, outside VP at index 1 for this axis
        vanishingPoints.push(insideVP);
        vanishingPoints.push(outsideVP);
    });

    return vanishingPoints;
}

/**
 * Render vanishing point markers in 2D scene
 * @param {Array} vanishingPoints - Array of VPs from getCachedVanishingPoints()
 * @param {Object} groups - Scene groups for rendering
 */
export function renderVanishingPoints(vanishingPoints, groups) {
    const vpMaterialKeys = ['RED', 'GREEN', 'BLUE'];

    for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
        const insideVP = vanishingPoints[axisIndex * 2];
        const outsideVP = vanishingPoints[axisIndex * 2 + 1];
        const vpMaterial = MATERIALS.VANISHING_POINTS[vpMaterialKeys[axisIndex]];

        if (insideVP) {
            const insideVpGeom = new THREE.CircleGeometry(0.15, 16);
            const insideVpMesh = new THREE.Mesh(insideVpGeom, vpMaterial);
            insideVpMesh.position.set(insideVP.x, insideVP.y, 0.1);
            groups.hemi2D.vanishingPoints.add(insideVpMesh);
        }

        if (outsideVP) {
            const outsideVpGeom = new THREE.CircleGeometry(0.15, 16);
            // Outside VP uses same material but with reduced opacity (clone with modified opacity)
            const outsideVpMat = vpMaterial.clone();
            outsideVpMat.opacity = 0.7;
            outsideVpMat.transparent = true;
            const outsideVpMesh = new THREE.Mesh(outsideVpGeom, outsideVpMat);
            outsideVpMesh.position.set(outsideVP.x, outsideVP.y, 0.1);
            groups.hemi2D.vanishingPoints.add(outsideVpMesh);
        }
    }
}
