/**
 * Hemispherical Projection - Edge Rendering Module
 * Phase 3 Modularization: Handles cube edge and guide line rendering
 * Includes complex special case handling for VPs at center/boundary
 */

import { state } from '../../state.js';
import { config } from '../../config.js';
import { MATERIALS } from '../../utils/three-utils.js';
import { createEdgeArc } from './geometry.js';

/**
 * Calculate distance from origin to a point
 * @param {Object} point - Point with x, y coordinates
 * @returns {number} Distance from origin
 */
function calculateDistance(point) {
    return Math.sqrt(point.x * point.x + point.y * point.y);
}

/**
 * Get vanishing point for a specific edge
 * @param {number} v1Index - First vertex index
 * @param {number} v2Index - Second vertex index
 * @param {Array} vanishingPoints - Array of VPs from getCachedVanishingPoints()
 * @param {number} boundaryRadius - Radius of boundary circle
 * @returns {Object} {vp, axisIndex} - VP and its axis index
 */
function getVanishingPointForEdge(v1Index, v2Index, vanishingPoints, boundaryRadius) {
    const edgeDirections = config.CUBE_MAPPINGS.edgeDirections;
    const key = `${v1Index},${v2Index}`;
    let axisIndex = edgeDirections[key];
    if (axisIndex === undefined) return { vp: null, axisIndex: null };

    const insideVP = vanishingPoints[axisIndex * 2];
    const outsideVP = vanishingPoints[axisIndex * 2 + 1];

    // Always check inside vanishing point for the center case
    const centerTolerance = boundaryRadius * 0.01; // 1% tolerance for center
    if (insideVP && isFinite(insideVP.x) && isFinite(insideVP.y)) {
        const insideDistance = calculateDistance(insideVP);
        if (insideDistance < centerTolerance) {
            return { vp: insideVP, axisIndex: axisIndex };
        }
    }

    // For edge curvature, always use the inside vanishing point
    return { vp: insideVP, axisIndex: axisIndex };
}

/**
 * Find circle center and radius from three points
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @param {Object} p3 - Third point {x, y}
 * @returns {Object|null} {x, y, radius} or null if collinear
 */
function findCircle(p1, p2, p3) {
    // This denominator is used to check for collinearity and in the calculations.
    const D = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));

    // If D is near zero, the points are on a straight line.
    if (Math.abs(D) < 1e-8) {
        return null;
    }

    const p1_sq = p1.x * p1.x + p1.y * p1.y;
    const p2_sq = p2.x * p2.x + p2.y * p2.y;
    const p3_sq = p3.x * p3.x + p3.y * p3.y;

    const centerX = (p1_sq * (p2.y - p3.y) + p2_sq * (p3.y - p1.y) + p3_sq * (p1.y - p2.y)) / D;
    const centerY = (p1_sq * (p3.x - p2.x) + p2_sq * (p1.x - p3.x) + p3_sq * (p2.x - p1.x)) / D;

    // Radius is the distance from the center to any of the points.
    const radius = Math.sqrt(Math.pow(p1.x - centerX, 2) + Math.pow(p1.y - centerY, 2));

    return { x: centerX, y: centerY, radius: radius };
}

/**
 * Get a point's angle on the circle (normalized from 0 to 2*PI)
 * @param {Object} center - Circle center {x, y}
 * @param {Object} point - Point on circle {x, y}
 * @returns {number} Angle in radians [0, 2π]
 */
function getAngle(center, point) {
    const angle = Math.atan2(point.y - center.y, point.x - center.x);
    return angle < 0 ? angle + 2 * Math.PI : angle;
}

/**
 * Determine arc drawing parameters
 * @param {Array<number>} angles - [startAngle, midAngle, endAngle] in radians
 * @returns {Object} {startAngle, endAngle, counterClockwise}
 */
function determineArcParameters(angles) {
    const [startAngle, midAngle, endAngle] = angles;

    // Check if the middle point's angle lies in the standard counter-clockwise arc
    let isMidInCCWArc;
    if (startAngle < endAngle) {
        // Normal case, no 0/2PI wrap-around
        isMidInCCWArc = midAngle > startAngle && midAngle < endAngle;
    } else {
        // Case where the arc crosses the 0/2PI boundary (e.g., from 350deg to 20deg)
        isMidInCCWArc = midAngle > startAngle || midAngle < endAngle;
    }

    // Based on trial and error, we found we must choose the *opposite*
    // of what the check tells us for the canvas API to draw correctly.
    return {
        startAngle: startAngle,
        endAngle: endAngle,
        counterClockwise: !isMidInCCWArc
    };
}

/**
 * Create arc from startPoint to endPoint passing through middlePoint
 * @param {Object} startPoint - Start point {x, y}
 * @param {Object} endPoint - End point {x, y}
 * @param {Object} middlePoint - Middle point {x, y}
 * @param {THREE.Material} material - Line material
 * @param {number} zIndex - Z-coordinate for rendering order
 * @returns {THREE.Line} Arc line or straight line if collinear
 */
export function createArcWithEndpoints(startPoint, endPoint, middlePoint, material, zIndex = 0) {
    // Create an arc from startPoint to endPoint that passes through middlePoint
    const ax = startPoint.x, ay = startPoint.y;
    const bx = middlePoint.x, by = middlePoint.y;
    const cx = endPoint.x, cy = endPoint.y;

    // Check for collinearity using the findCircle function
    const circle = findCircle(startPoint, middlePoint, endPoint);

    if (!circle) {
        // Points are collinear - draw straight line from startPoint to endPoint
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(startPoint.x, startPoint.y, zIndex),
            new THREE.Vector3(endPoint.x, endPoint.y, zIndex)
        ]), material);
    }

    // Get angles for all three points
    const startAngle = getAngle(circle, startPoint);
    const middleAngle = getAngle(circle, middlePoint);
    const endAngle = getAngle(circle, endPoint);

    // Determine which arc to draw
    const arcData = determineArcParameters([startAngle, middleAngle, endAngle]);

    // Create the arc using the determined parameters
    const segments = 64;
    const points = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        let angle;

        if (arcData.counterClockwise) {
            // Counter-clockwise arc
            if (arcData.startAngle < arcData.endAngle) {
                angle = arcData.startAngle + t * (arcData.endAngle - arcData.startAngle);
            } else {
                // Handle wrap-around case
                angle = arcData.startAngle + t * (arcData.endAngle + 2 * Math.PI - arcData.startAngle);
            }
        } else {
            // Clockwise arc
            if (arcData.startAngle > arcData.endAngle) {
                angle = arcData.startAngle - t * (arcData.startAngle - arcData.endAngle);
            } else {
                // Handle wrap-around case
                angle = arcData.startAngle - t * (arcData.startAngle + 2 * Math.PI - arcData.endAngle);
            }
        }

        // Normalize angle to [0, 2π]
        while (angle < 0) angle += 2 * Math.PI;
        while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;

        const x = circle.x + circle.radius * Math.cos(angle);
        const y = circle.y + circle.radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, zIndex));
    }

    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

/**
 * Render boundary case guide lines (when both VPs are on boundary circle)
 * @param {Array} vanishingPoints - Array of VPs from getCachedVanishingPoints()
 * @param {Array<THREE.Vector2>} projectedVertices - Projected 2D vertices
 * @param {number} boundaryRadius - Radius of boundary circle
 * @param {Object} groups - Scene groups for rendering
 */
function renderBoundaryCaseGuideLines(vanishingPoints, projectedVertices, boundaryRadius, groups) {
    const edgeAxisMapping = config.CUBE_MAPPINGS.edgeAxisMapping;

    for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
        const insideVP = vanishingPoints[axisIndex * 2];
        const outsideVP = vanishingPoints[axisIndex * 2 + 1];

        if (insideVP && outsideVP && isFinite(insideVP.x) && isFinite(insideVP.y) && isFinite(outsideVP.x) && isFinite(outsideVP.y)) {
            const insideDistance = calculateDistance(insideVP);
            const outsideDistance = calculateDistance(outsideVP);

            // Check if both VPs are on the boundary circle (within tolerance)
            const boundaryTolerance = boundaryRadius * 0.01; // 1% tolerance
            const isInsideOnBoundary = Math.abs(insideDistance - boundaryRadius) < boundaryTolerance;
            const isOutsideOnBoundary = Math.abs(outsideDistance - boundaryRadius) < boundaryTolerance;

            if (isInsideOnBoundary && isOutsideOnBoundary) {
                const materialKeys = ['RED', 'GREEN', 'BLUE'];
                const guideMaterial = MATERIALS.GUIDES[materialKeys[axisIndex]];

                const axisVertices = edgeAxisMapping[axisIndex];

                if (axisVertices && axisVertices.length >= 2) {
                    for (let i = 0; i < axisVertices.length; i += 2) {
                        const vertex1 = projectedVertices[axisVertices[i]];
                        const vertex2 = projectedVertices[axisVertices[i + 1]];
                        if (vertex1 && vertex2 && isFinite(vertex1.x) && isFinite(vertex1.y) && isFinite(vertex2.x) && isFinite(vertex2.y)) {
                            // --- Arc for inside VP ---
                            // Determine nearer/farther vertex to insideVP
                            const dist1 = Math.sqrt((vertex1.x - insideVP.x) ** 2 + (vertex1.y - insideVP.y) ** 2);
                            const dist2 = Math.sqrt((vertex2.x - insideVP.x) ** 2 + (vertex2.y - insideVP.y) ** 2);
                            let nearerVertex, fartherVertex;
                            if (dist1 <= dist2) {
                                nearerVertex = vertex1;
                                fartherVertex = vertex2;
                            } else {
                                nearerVertex = vertex2;
                                fartherVertex = vertex1;
                            }
                            // Arc: p1 = nearer vertex, p2 = insideVP, p3 = farther vertex
                            const arcInside = createArcWithEndpoints(nearerVertex, insideVP, fartherVertex, guideMaterial, -0.1);
                            if (arcInside) {
                                groups.hemi2D.extensionLines.add(arcInside);
                            }
                            // --- Arc for outside VP ---
                            // For outside VP, use farther/nearer order from insideVP
                            // Arc: p1 = farther vertex, p2 = outsideVP, p3 = nearer vertex
                            const arcOutside = createArcWithEndpoints(fartherVertex, outsideVP, nearerVertex, guideMaterial, -0.1);
                            if (arcOutside) {
                                groups.hemi2D.extensionLines.add(arcOutside);
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Render guide lines from cube edges to vanishing points
 * @param {Array} vanishingPoints - Array of VPs from getCachedVanishingPoints()
 * @param {Array<THREE.Vector2>} projectedVertices - Projected 2D vertices
 * @param {number} boundaryRadius - Radius of boundary circle
 * @param {Object} groups - Scene groups for rendering
 */
export function renderGuideLines(vanishingPoints, projectedVertices, boundaryRadius, groups) {
    const edgeAxisMapping = config.CUBE_MAPPINGS.edgeAxisMapping;

    // Store special case lines to draw on top later
    const specialCaseLines = [];

    // First, render boundary case guide lines (both VPs on boundary)
    renderBoundaryCaseGuideLines(vanishingPoints, projectedVertices, boundaryRadius, groups);

    // For each axis (X, Y, Z), draw guide lines to the corresponding vanishing points
    for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
        const insideVP = vanishingPoints[axisIndex * 2];
        const outsideVP = vanishingPoints[axisIndex * 2 + 1];

        // Check inside vanishing point for center case first
        const centerTolerance = boundaryRadius * 0.01; // 1% tolerance for center
        let vp = null;
        let isVpAtCenter = false;

        // Check inside vanishing point for center case
        if (insideVP && isFinite(insideVP.x) && isFinite(insideVP.y)) {
            const insideDistance = calculateDistance(insideVP);
            if (insideDistance < centerTolerance) {
                vp = insideVP;
                isVpAtCenter = true;
            }
        }

        // If inside VP is not at center, use it for primary guide lines
        if (!vp) {
            vp = insideVP;
        }

        if (!vp || !isFinite(vp.x) || !isFinite(vp.y)) continue;

        if (isVpAtCenter) {
            // Special case: vanishing point at center - store lines to draw on top later
            const materialKeys = ['RED', 'GREEN', 'BLUE'];
            const guideMaterial = MATERIALS.GUIDES[materialKeys[axisIndex]];

            const axisVertices = edgeAxisMapping[axisIndex];
            for (let i = 0; i < axisVertices.length; i += 2) {
                const vertex1 = projectedVertices[axisVertices[i]];
                const vertex2 = projectedVertices[axisVertices[i + 1]];

                if (isFinite(vertex1.x) && isFinite(vertex1.y) && isFinite(vertex2.x) && isFinite(vertex2.y)) {
                    // Calculate distances from center to each vertex
                    const dist1 = calculateDistance(vertex1);
                    const dist2 = calculateDistance(vertex2);

                    // Order vertices: nearest first, then farthest
                    let nearVertex, farVertex;
                    if (dist1 <= dist2) {
                        nearVertex = vertex1;
                        farVertex = vertex2;
                    } else {
                        nearVertex = vertex2;
                        farVertex = vertex1;
                    }

                    // Calculate direction vector from center through both vertices
                    const dx = farVertex.x - vp.x;
                    const dy = farVertex.y - vp.y;
                    const length = Math.sqrt(dx * dx + dy * dy);

                    if (length > 0.001) { // Avoid division by zero
                        // Normalize the direction vector
                        const dirX = dx / length;
                        const dirY = dy / length;

                        // Extend line to boundary circle (radius = 2 * boundaryRadius)
                        const extensionRadius = boundaryRadius * 2;
                        const extensionX = vp.x + dirX * extensionRadius;
                        const extensionY = vp.y + dirY * extensionRadius;

                        // Create line from center through both vertices to extension point
                        const lineGeom = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(vp.x, vp.y, -0.1),
                            new THREE.Vector3(nearVertex.x, nearVertex.y, -0.1),
                            new THREE.Vector3(farVertex.x, farVertex.y, -0.1),
                            new THREE.Vector3(extensionX, extensionY, -0.1)
                        ]);
                        const line = new THREE.Line(lineGeom, guideMaterial);
                        specialCaseLines.push(line);
                    }
                }
            }

            continue; // Skip the normal guide line drawing for this axis
        }

        // Check if both VPs are on the boundary circle - if so, skip general case drawing
        const insideDistance = calculateDistance(insideVP);
        const outsideDistance = calculateDistance(outsideVP);
        const boundaryTolerance = boundaryRadius * 0.01; // 1% tolerance
        const isInsideOnBoundary = Math.abs(insideDistance - boundaryRadius) < boundaryTolerance;
        const isOutsideOnBoundary = Math.abs(outsideDistance - boundaryRadius) < boundaryTolerance;

        if (isInsideOnBoundary && isOutsideOnBoundary) {
            // Both VPs are on boundary - skip general case drawing (boundary case handles this)
            continue;
        }

        // Normal case: draw guide lines to the vanishing point
        const materialKeys = ['RED', 'GREEN', 'BLUE'];
        const guideMaterial = MATERIALS.GUIDES[materialKeys[axisIndex]];

        const axisVertices = edgeAxisMapping[axisIndex];
        for (let i = 0; i < axisVertices.length; i += 2) {
            const vertex1 = projectedVertices[axisVertices[i]];
            const vertex2 = projectedVertices[axisVertices[i + 1]];

            if (isFinite(vertex1.x) && isFinite(vertex1.y) && isFinite(vertex2.x) && isFinite(vertex2.y)) {
                // Check if the three points are collinear
                const dx1 = vertex1.x - vp.x;
                const dy1 = vertex1.y - vp.y;
                const dx2 = vertex2.x - vp.x;
                const dy2 = vertex2.y - vp.y;
                const crossProduct = dx1 * dy2 - dx2 * dy1;
                const isCollinear = Math.abs(crossProduct) < 0.001; // Small tolerance for floating point

                if (isCollinear) {
                    // Collinear case: draw straight lines from vertex1 to vanishing point to vertex2
                    const line1Geom = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(vertex1.x, vertex1.y, -0.1),
                        new THREE.Vector3(vp.x, vp.y, -0.1)
                    ]);
                    const line1 = new THREE.Line(line1Geom, guideMaterial);
                    groups.hemi2D.extensionLines.add(line1);

                    const line2Geom = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(vp.x, vp.y, -0.1),
                        new THREE.Vector3(vertex2.x, vertex2.y, -0.1)
                    ]);
                    const line2 = new THREE.Line(line2Geom, guideMaterial);
                    groups.hemi2D.extensionLines.add(line2);
                } else {
                    // Non-collinear case: create arc through vanishing point and the two vertices
                    // Check if vanishing point is inside or outside boundary circle
                    const vpDistance = Math.sqrt(vp.x * vp.x + vp.y * vp.y);
                    const isVpInside = vpDistance < boundaryRadius;

                    if (isVpInside) {
                        // Inside vanishing point: p1 = nearer vertex, p2 = farther vertex, p3 = vp_inside
                        // Calculate distances from vanishing point to each vertex
                        const dist1 = Math.sqrt((vertex1.x - vp.x) * (vertex1.x - vp.x) + (vertex1.y - vp.y) * (vertex1.y - vp.y));
                        const dist2 = Math.sqrt((vertex2.x - vp.x) * (vertex2.x - vp.x) + (vertex2.y - vp.y) * (vertex2.y - vp.y));

                        // Determine which vertex is nearer
                        let nearerVertex, fartherVertex;
                        if (dist1 <= dist2) {
                            nearerVertex = vertex1;
                            fartherVertex = vertex2;
                        } else {
                            nearerVertex = vertex2;
                            fartherVertex = vertex1;
                        }

                        // Arc: p1 = nearer vertex, p2 = farther vertex, p3 = vp_inside
                        const arc = createArcWithEndpoints(nearerVertex, vp, fartherVertex, guideMaterial, -0.1);
                        if (arc) {
                            groups.hemi2D.extensionLines.add(arc);
                        } else {
                            // Fallback to straight lines if arc creation fails
                            const line1Geom = new THREE.BufferGeometry().setFromPoints([
                                new THREE.Vector3(fartherVertex.x, fartherVertex.y, -0.1),
                                new THREE.Vector3(vp.x, vp.y, -0.1)
                            ]);
                            const line1 = new THREE.Line(line1Geom, guideMaterial);
                            groups.hemi2D.extensionLines.add(line1);
                        }
                    } else {
                        // Outside vanishing point: p1 = farther vertex from vp_inside, p2 = nearer vertex to vp_inside, p3 = vp_outside
                        // For outside VP, we need to find the corresponding inside VP to determine ordering
                        const oppositeVp = insideVP; // Get the inside VP

                        // Calculate distances from the inside VP to each vertex
                        const dist1ToInside = Math.sqrt((vertex1.x - oppositeVp.x) * (vertex1.x - oppositeVp.x) + (vertex1.y - oppositeVp.y) * (vertex1.y - oppositeVp.y));
                        const dist2ToInside = Math.sqrt((vertex2.x - oppositeVp.x) * (vertex2.x - oppositeVp.x) + (vertex2.y - oppositeVp.y) * (vertex2.y - oppositeVp.y));

                        // Determine which vertex is farther from the inside VP
                        let fartherFromInside, nearerToInside;
                        if (dist1ToInside >= dist2ToInside) {
                            fartherFromInside = vertex1;
                            nearerToInside = vertex2;
                        } else {
                            fartherFromInside = vertex2;
                            nearerToInside = vertex1;
                        }

                        // Arc: p1 = farther vertex from vp_inside, p2 = nearer vertex to vp_inside, p3 = vp_outside
                        const arc = createArcWithEndpoints(fartherFromInside, vp, nearerToInside, guideMaterial, -0.1);
                        if (arc) {
                            groups.hemi2D.extensionLines.add(arc);
                        } else {
                            // Fallback to straight lines if arc creation fails
                            const line1Geom = new THREE.BufferGeometry().setFromPoints([
                                new THREE.Vector3(nearerToInside.x, nearerToInside.y, -0.1),
                                new THREE.Vector3(vp.x, vp.y, -0.1)
                            ]);
                            const line1 = new THREE.Line(line1Geom, guideMaterial);
                            groups.hemi2D.extensionLines.add(line1);
                        }
                    }
                }
            }
        }

        // Now draw guide lines to the opposite vanishing point (outside VP)
        const oppositeVp = outsideVP; // Use outside vanishing point
        if (oppositeVp && isFinite(oppositeVp.x) && isFinite(oppositeVp.y)) {
            // Check if opposite vanishing point is at center - if so, handle special case
            const oppositeVpDistance = calculateDistance(oppositeVp);
            const isOppositeVpAtCenter = oppositeVpDistance < boundaryRadius * 0.01; // 1% of boundary radius tolerance for center

            if (isOppositeVpAtCenter) {
                // Special case: opposite vanishing point at center - draw simple straight lines through collinear vertices
                const oppositeGuideMaterial = MATERIALS.GUIDES[materialKeys[axisIndex]];

                const axisVertices = edgeAxisMapping[axisIndex];
                for (let i = 0; i < axisVertices.length; i += 2) {
                    const vertex1 = projectedVertices[axisVertices[i]];
                    const vertex2 = projectedVertices[axisVertices[i + 1]];

                    if (isFinite(vertex1.x) && isFinite(vertex1.y) && isFinite(vertex2.x) && isFinite(vertex2.y)) {
                        // Calculate distances from center to each vertex
                        const dist1 = calculateDistance(vertex1);
                        const dist2 = calculateDistance(vertex2);

                        // Order vertices: nearest first, then farthest
                        let nearVertex, farVertex;
                        if (dist1 <= dist2) {
                            nearVertex = vertex1;
                            farVertex = vertex2;
                        } else {
                            nearVertex = vertex2;
                            farVertex = vertex1;
                        }

                        // Calculate direction vector from center through both vertices
                        const dx = farVertex.x - oppositeVp.x;
                        const dy = farVertex.y - oppositeVp.y;
                        const length = Math.sqrt(dx * dx + dy * dy);

                        if (length > 0.001) { // Avoid division by zero
                            // Normalize the direction vector
                            const dirX = dx / length;
                            const dirY = dy / length;

                            // Extend line to boundary circle (radius = 2 * boundaryRadius)
                            const extensionRadius = boundaryRadius * 2;
                            const extensionX = oppositeVp.x + dirX * extensionRadius;
                            const extensionY = oppositeVp.y + dirY * extensionRadius;

                            // Create line from center through both vertices to extension point
                            const lineGeom = new THREE.BufferGeometry().setFromPoints([
                                new THREE.Vector3(oppositeVp.x, oppositeVp.y, 0),
                                new THREE.Vector3(nearVertex.x, nearVertex.y, 0),
                                new THREE.Vector3(farVertex.x, farVertex.y, 0),
                                new THREE.Vector3(extensionX, extensionY, 0)
                            ]);
                            const line = new THREE.Line(lineGeom, oppositeGuideMaterial);
                            specialCaseLines.push(line);
                        }
                    }
                }
                continue; // Skip normal opposite vanishing point guide lines for this axis
            }

            const oppositeGuideMaterial = MATERIALS.GUIDES[materialKeys[axisIndex]];

            const axisVertices = edgeAxisMapping[axisIndex];
            for (let i = 0; i < axisVertices.length; i += 2) {
                const vertex1 = projectedVertices[axisVertices[i]];
                const vertex2 = projectedVertices[axisVertices[i + 1]];

                if (isFinite(vertex1.x) && isFinite(vertex1.y) && isFinite(vertex2.x) && isFinite(vertex2.y)) {
                    // Check if the three points are collinear
                    const dx1 = vertex1.x - oppositeVp.x;
                    const dy1 = vertex1.y - oppositeVp.y;
                    const dx2 = vertex2.x - oppositeVp.x;
                    const dy2 = vertex2.y - oppositeVp.y;
                    const crossProduct = dx1 * dy2 - dx2 * dy1;
                    const isCollinear = Math.abs(crossProduct) < 0.001; // Small tolerance for floating point

                    if (isCollinear) {
                        // Collinear case: draw straight lines from vertices to opposite vanishing point
                        const line1Geom = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(vertex1.x, vertex1.y, -0.1),
                            new THREE.Vector3(oppositeVp.x, oppositeVp.y, -0.1)
                        ]);
                        const line1 = new THREE.Line(line1Geom, oppositeGuideMaterial);
                        groups.hemi2D.extensionLines.add(line1);

                        const line2Geom = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(vertex2.x, vertex2.y, -0.1),
                            new THREE.Vector3(oppositeVp.x, oppositeVp.y, -0.1)
                        ]);
                        const line2 = new THREE.Line(line2Geom, oppositeGuideMaterial);
                        groups.hemi2D.extensionLines.add(line2);
                    } else {
                        // Non-collinear case: create arc through opposite vanishing point and the two vertices
                        // Check if opposite vanishing point is inside or outside boundary circle
                        const oppositeVpDistance = calculateDistance(oppositeVp);
                        const isOppositeVpInside = oppositeVpDistance < boundaryRadius;

                        if (isOppositeVpInside) {
                            // Opposite vanishing point inside boundary: p1 = nearer vertex, p2 = farther vertex, p3 = vp_inside
                            // Calculate distances from vanishing point to each vertex
                            const dist1 = Math.sqrt((vertex1.x - oppositeVp.x) ** 2 + (vertex1.y - oppositeVp.y) ** 2);
                            const dist2 = Math.sqrt((vertex2.x - oppositeVp.x) ** 2 + (vertex2.y - oppositeVp.y) ** 2);

                            // Determine which vertex is nearer
                            let nearerVertex, fartherVertex;
                            if (dist1 <= dist2) {
                                nearerVertex = vertex1;
                                fartherVertex = vertex2;
                            } else {
                                nearerVertex = vertex2;
                                fartherVertex = vertex1;
                            }

                            // Arc: p1 = nearer vertex, p2 = farther vertex, p3 = vp_inside
                            const arc = createArcWithEndpoints(nearerVertex, oppositeVp, fartherVertex, oppositeGuideMaterial, -0.1);
                            if (arc) {
                                groups.hemi2D.extensionLines.add(arc);
                            } else {
                                // Fallback to straight lines if arc creation fails
                                const line1Geom = new THREE.BufferGeometry().setFromPoints([
                                    new THREE.Vector3(nearerVertex.x, nearerVertex.y, -0.1),
                                    new THREE.Vector3(oppositeVp.x, oppositeVp.y, -0.1)
                                ]);
                                const line1 = new THREE.Line(line1Geom, oppositeGuideMaterial);
                                groups.hemi2D.extensionLines.add(line1);
                            }
                        } else {
                            // Opposite vanishing point outside boundary: p1 = farther vertex from vp_inside, p2 = nearer vertex to vp_inside, p3 = vp_outside
                            // For outside VP, we need to find the corresponding inside VP to determine ordering
                            const originalVp = insideVP; // Get the inside VP

                            // Calculate distances from the inside VP to each vertex
                            const dist1ToInside = Math.sqrt((vertex1.x - originalVp.x) ** 2 + (vertex1.y - originalVp.y) ** 2);
                            const dist2ToInside = Math.sqrt((vertex2.x - originalVp.x) ** 2 + (vertex2.y - originalVp.y) ** 2);

                            // Determine which vertex is farther from the inside VP
                            let fartherFromInside, nearerToInside;
                            if (dist1ToInside >= dist2ToInside) {
                                fartherFromInside = vertex1;
                                nearerToInside = vertex2;
                            } else {
                                fartherFromInside = vertex2;
                                nearerToInside = vertex1;
                            }

                            // Arc: p1 = farther vertex from vp_inside, p2 = nearer vertex to vp_inside, p3 = vp_outside
                            const arc = createArcWithEndpoints(fartherFromInside, oppositeVp, nearerToInside, oppositeGuideMaterial, -0.1);
                            if (arc) {
                                groups.hemi2D.extensionLines.add(arc);
                            } else {
                                // Fallback to straight lines if arc creation fails
                                const line1Geom = new THREE.BufferGeometry().setFromPoints([
                                    new THREE.Vector3(nearerToInside.x, nearerToInside.y, -0.1),
                                    new THREE.Vector3(oppositeVp.x, oppositeVp.y, -0.1)
                                ]);
                                const line1 = new THREE.Line(line1Geom, oppositeGuideMaterial);
                                groups.hemi2D.extensionLines.add(line1);
                            }
                        }
                    }
                }
            }
        }
    }

    // Draw special case lines on top of all guide lines
    specialCaseLines.forEach(line => {
        groups.hemi2D.extensionLines.add(line);
    });
}

/**
 * Render projected cube vertices as points
 * @param {Array<THREE.Vector2>} projectedVertices - Projected 2D vertices
 * @param {Object} groups - Scene groups for rendering
 */
export function renderProjectedVertices(projectedVertices, groups) {
    const vertexMaterial = new THREE.MeshBasicMaterial({ color: config.COLORS.cubeEdge });

    projectedVertices.forEach((vertex, index) => {
        if (vertex && isFinite(vertex.x) && isFinite(vertex.y)) {
            const vertexGeom = new THREE.CircleGeometry(0.1, 16);
            const vertexMesh = new THREE.Mesh(vertexGeom, vertexMaterial);
            vertexMesh.position.set(vertex.x, vertex.y, 0.1);
            groups.hemi2D.projectedCubeLines.add(vertexMesh);
        }
    });
}

/**
 * Render projected cube edges as arcs
 * @param {Array<THREE.Vector2>} projectedVertices - Projected 2D vertices
 * @param {Array} vanishingPoints - Array of VPs from getCachedVanishingPoints()
 * @param {number} boundaryRadius - Radius of boundary circle
 * @param {Object} groups - Scene groups for rendering
 */
export function renderProjectedCubeEdges(projectedVertices, vanishingPoints, boundaryRadius, groups) {
    const edges = config.CUBE_MAPPINGS.edges;
    const edgeMaterial = MATERIALS.EDGES.PROJECTED;

    for (let i = 0; i < edges.length; i += 2) {
        const v1Index = edges[i];
        const v2Index = edges[i + 1];
        const vertex1 = projectedVertices[v1Index];
        const vertex2 = projectedVertices[v2Index];

        if (isFinite(vertex1.x) && isFinite(vertex1.y) && isFinite(vertex2.x) && isFinite(vertex2.y)) {
            // Get the vanishing point for this edge
            const { vp, axisIndex } = getVanishingPointForEdge(v1Index, v2Index, vanishingPoints, boundaryRadius);

            if (vp && isFinite(vp.x) && isFinite(vp.y)) {
                // Check if vanishing point is at center - if so, draw straight line
                const vpDistance = Math.sqrt(vp.x * vp.x + vp.y * vp.y);
                const isVpAtCenter = vpDistance < boundaryRadius * 0.01; // 1% of boundary radius tolerance for center

                if (isVpAtCenter) {
                    // Special case: vanishing point at center, draw straight line between vertices
                    const lineGeom = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(vertex1.x, vertex1.y, 0.2), // Higher z-index to render on top
                        new THREE.Vector3(vertex2.x, vertex2.y, 0.2)
                    ]);
                    const line = new THREE.Line(lineGeom, edgeMaterial);
                    groups.hemi2D.projectedCubeLines.add(line);
                } else {
                    // Normal case: Create arc connecting only the two vertices, using vanishing point for curvature
                    const arc = createEdgeArc(vertex1, vertex2, vp, edgeMaterial);
                    if (arc) {
                        // Set higher z-index for arc vertices to render on top
                        arc.geometry.attributes.position.array.forEach((coord, index) => {
                            if ((index + 1) % 3 === 0) { // z-coordinate
                                arc.geometry.attributes.position.array[index] = 0.2;
                            }
                        });
                        arc.geometry.attributes.position.needsUpdate = true;
                        groups.hemi2D.projectedCubeLines.add(arc);
                    } else {
                        // Fallback to straight line if arc creation fails
                        const lineGeom = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(vertex1.x, vertex1.y, 0.2), // Higher z-index to render on top
                            new THREE.Vector3(vertex2.x, vertex2.y, 0.2)
                        ]);
                        const line = new THREE.Line(lineGeom, edgeMaterial);
                        groups.hemi2D.projectedCubeLines.add(line);
                    }
                }
            } else {
                // No vanishing point available, draw straight line
                const lineGeom = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(vertex1.x, vertex1.y, 0.2), // Higher z-index to render on top
                    new THREE.Vector3(vertex2.x, vertex2.y, 0.2)
                ]);
                const line = new THREE.Line(lineGeom, edgeMaterial);
                groups.hemi2D.projectedCubeLines.add(line);
            }
        }
    }
}
