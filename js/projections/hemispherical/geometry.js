/**
 * Hemispherical Projection - Geometry Module
 * Phase 3 Modularization: Geometric calculations and helper functions
 * Handles ray-sphere intersection, Postel projection, and circle/line intersections
 */

import { config } from '../../config.js';
import { createArcLine } from '../../utils/geometry-utils.js';

/**
 * Intersect a ray with a hemisphere
 * @param {THREE.Vector3} rayOrigin - Origin of the ray
 * @param {THREE.Vector3} rayDirection - Direction of the ray (normalized)
 * @param {THREE.Vector3} hemisphereCenter - Center of the hemisphere
 * @param {number} hemisphereRadius - Radius of the hemisphere
 * @returns {THREE.Vector3|null} Intersection point or null
 */
export function intersectRayWithHemisphere(rayOrigin, rayDirection, hemisphereCenter, hemisphereRadius) {
    const oc = rayOrigin.clone().sub(hemisphereCenter);
    const a = rayDirection.dot(rayDirection);
    const b = 2.0 * oc.dot(rayDirection);
    const c = oc.dot(oc) - hemisphereRadius * hemisphereRadius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

    // Choose the closest positive intersection (in the direction of the ray)
    const validIntersections = [];
    for (let t of [t1, t2]) {
        if (t > 0.001) { // Ray parameter must be positive and not too close to origin
            const point = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
            validIntersections.push({ t: t, point: point });
        }
    }

    if (validIntersections.length === 0) {
        return null;
    }

    // Return the closest intersection point
    validIntersections.sort((a, b) => a.t - b.t);
    return validIntersections[0].point;
}

/**
 * Postel projection (azimuthal equidistant projection)
 * Maps a 3D point on hemisphere to 2D disk
 * @param {THREE.Vector3} point3D - Point on hemisphere surface
 * @param {THREE.Vector3} hemisphereCenter - Center of hemisphere
 * @param {number} hemisphereRadius - Radius of hemisphere
 * @returns {THREE.Vector2} 2D projected point
 */
export function postelProjection(point3D, hemisphereCenter, hemisphereRadius) {
    const relativePoint = point3D.clone().sub(hemisphereCenter);
    const x = relativePoint.x;
    const y = relativePoint.y;
    const z = relativePoint.z;

    const cosAlpha = -z / hemisphereRadius;
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
    const arcLength = alpha * hemisphereRadius;
    const theta = Math.atan2(y, x);

    const x2D = arcLength * Math.cos(theta);
    const y2D = arcLength * Math.sin(theta);

    return new THREE.Vector2(x2D, y2D);
}

/**
 * Create arc between two points through a third point
 * Wrapper using shared arc creation utility
 */
export function createArc(p1, p2, p3, material) {
    return createArcLine(p1, p2, p3, material, {
        zIndex: 0,
        baseSegments: 64,
        maxSegments: 256,
        maxArcLength: 0.5,
        arcType: 'partial'
    });
}

/**
 * Create arc connecting only two vertices (edge arc)
 * Uses vanishing point to determine curvature
 */
export function createEdgeArc(vertex1, vertex2, vanishingPoint, material) {
    return createArcLine(vertex1, vertex2, vanishingPoint, material, {
        zIndex: 0.2, // Higher z-index to render on top
        baseSegments: 32,
        maxSegments: 128,
        maxArcLength: 0.5,
        arcType: 'edge'
    });
}

/**
 * Create full circle through three points
 */
export function createFullCircle(p1, p2, p3, material) {
    return createArcLine(p1, p2, p3, material, {
        zIndex: 0,
        baseSegments: 256,
        maxSegments: 1024,
        maxArcLength: 0.5,
        arcType: 'full'
    });
}

/**
 * Compute circle from three points in 2D
 * @returns {Object|null} {center: {x, y}, radius} or null if collinear
 */
export function computeCircleFromThreePoints(p1, p2, p3) {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

    const area = Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2;
    if (area < 0.001) {
        return null; // Collinear points
    }

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

    const center = { x: ux, y: uy };
    const radius = Math.sqrt((ax - ux) * (ax - ux) + (ay - uy) * (ay - uy));

    return { center, radius };
}

/**
 * Intersect two circles
 * @returns {Array} Array of intersection points (0, 1, or 2 points)
 */
export function intersectCircles(c1, r1, c2, r2) {
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > r1 + r2 || distance < Math.abs(r1 - r2) || distance === 0) {
        return [];
    }

    const a = (r1 * r1 - r2 * r2 + distance * distance) / (2 * distance);
    const h = Math.sqrt(r1 * r1 - a * a);

    const x2 = c1.x + a * dx / distance;
    const y2 = c1.y + a * dy / distance;

    const rx = -dy * h / distance;
    const ry = dx * h / distance;

    return [
        { x: x2 + rx, y: y2 + ry },
        { x: x2 - rx, y: y2 - ry }
    ];
}

/**
 * Intersect two line segments
 * @returns {Object|null} Intersection point or null
 */
export function intersectLines(p, q, r, s) {
    const denominator = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
    if (Math.abs(denominator) < 0.001) {
        return null; // Parallel lines
    }

    const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / denominator;
    const u = ((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)) / denominator;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: p.x + t * (q.x - p.x),
            y: p.y + t * (q.y - p.y)
        };
    }

    return null;
}

/**
 * Intersect circle with line
 * @returns {Array} Array of intersection points
 */
export function intersectCircleLine(circle, linePoints) {
    const { center, radius } = circle;
    const { p, q } = linePoints;

    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const dr = Math.sqrt(dx * dx + dy * dy);
    const D = p.x * q.y - q.x * p.y;

    const discriminant = radius * radius * dr * dr - D * D;
    if (discriminant < 0) {
        return [];
    }

    const x1 = (D * dy + Math.sign(dy) * dx * Math.sqrt(discriminant)) / (dr * dr);
    const y1 = (-D * dx + Math.abs(dy) * Math.sqrt(discriminant)) / (dr * dr);
    const x2 = (D * dy - Math.sign(dy) * dx * Math.sqrt(discriminant)) / (dr * dr);
    const y2 = (-D * dx - Math.abs(dy) * Math.sqrt(discriminant)) / (dr * dr);

    return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
}

/**
 * Intersect two arcs or lines (polymorphic)
 * @param {Object} arc1 - {type: 'circle'|'line', ...}
 * @param {Object} arc2 - {type: 'circle'|'line', ...}
 * @returns {Array} Array of intersection points
 */
export function intersectArcsOrLines(arc1, arc2) {
    let intersections = [];

    if (arc1.type === 'line' && arc2.type === 'line') {
        const intersection = intersectLines(arc1.p1, arc1.p2, arc2.p1, arc2.p2);
        intersections = intersection ? [intersection] : [];
    } else if (arc1.type === 'circle' && arc2.type === 'circle') {
        intersections = intersectCircles(arc1.center, arc1.radius, arc2.center, arc2.radius);
    } else if (arc1.type === 'circle' && arc2.type === 'line') {
        intersections = intersectCircleLine(arc1, { p: arc2.p1, q: arc2.p2 });
    } else if (arc1.type === 'line' && arc2.type === 'circle') {
        intersections = intersectCircleLine(arc2, { p: arc1.p1, q: arc1.p2 });
    }

    return intersections;
}

/**
 * Select the correct intersection from multiple candidates
 * Chooses the one closest to center and within boundary
 */
export function selectCorrectIntersection(intersections, boundaryRadius) {
    if (intersections.length === 0) return null;
    if (intersections.length === 1) return intersections[0];

    // Select the intersection closest to the center and within the boundary
    let bestIntersection = null;
    let minDistance = Infinity;

    for (const intersection of intersections) {
        const distance = Math.sqrt(intersection.x * intersection.x + intersection.y * intersection.y);
        if (distance <= boundaryRadius && distance < minDistance) {
            minDistance = distance;
            bestIntersection = intersection;
        }
    }

    return bestIntersection;
}

/**
 * Create 2D boundary circle for hemispherical projection
 */
export function createHemi2DBoundary(scene, hemisphereRadius) {
    const boundaryRadius = (Math.PI / 2) * hemisphereRadius;
    const circleGeometry = new THREE.RingGeometry(boundaryRadius - 0.05, boundaryRadius, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({ color: config.COLORS.boundary, side: THREE.DoubleSide });
    const hemiBoundary = new THREE.Mesh(circleGeometry, circleMaterial);
    scene.add(hemiBoundary);
    return hemiBoundary;
}
