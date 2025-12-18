import * as THREE from 'three';

// Constants
export const R_EARTH = 6371;

export interface ProjectionPoint {
    x: number;
    y: number;
}

/**
 * Projects a 3D point onto a 2D plane using Linear Projection.
 * Mirrors logic from linear-projection.js
 */
export function projectLinear(
    vertex: THREE.Vector3,
    viewpoint: THREE.Vector3,
    hemisphereRadius: number = 5
): THREE.Vector2 {
    const imagePlaneZ = viewpoint.z - hemisphereRadius;

    // Relative coordinates
    const x = vertex.x - viewpoint.x;
    const y = vertex.y - viewpoint.y;
    const z = vertex.z - viewpoint.z;

    if (Math.abs(z) < 0.0001) return new THREE.Vector2(0, 0); // Avoid division by zero

    // Projection calculation
    const t = (imagePlaneZ - viewpoint.z) / z;
    const x_proj = viewpoint.x + x * t;
    const y_proj = viewpoint.y + y * t;

    // Transform to reference frame where viewpoint projection is at origin (0,0)
    // The original code does: x_ref = x_proj - viewpoint.x
    return new THREE.Vector2(x_proj - viewpoint.x, y_proj - viewpoint.y);
}

/**
 * Helper: Compute circle from three points
 */
function computeCircleFromThreePoints(p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }) {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

    const area = Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2;
    if (area < 0.001 || Math.abs(d) < 0.001) {
        return null; // Collinear
    }

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

    const center = { x: ux, y: uy };
    const radius = Math.sqrt((ax - ux) * (ax - ux) + (ay - uy) * (ay - uy));

    return { center, radius };
}

/**
 * Helper: Intersect two circles
 */
function intersectCircles(c1: { x: number, y: number }, r1: number, c2: { x: number, y: number }, r2: number) {
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > r1 + r2 || distance < Math.abs(r1 - r2) || distance === 0) {
        return [];
    }

    const a = (r1 * r1 - r2 * r2 + distance * distance) / (2 * distance);
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));

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
 * Helper: Intersect two lines
 */
function intersectLines(p: { x: number, y: number }, q: { x: number, y: number }, r: { x: number, y: number }, s: { x: number, y: number }) {
    const denominator = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
    if (Math.abs(denominator) < 0.001) return null;

    const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / denominator;
    const u = ((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)) / denominator;

    // Line segments intersection (0-1), but for full lines we might not check bounds, 
    // however original code checked bounds. Let's stick to bounds if they are segments in original.
    // Original code: intersectLines(arc1.p1, arc1.p2, arc2.p1, arc2.p2) where p1, p2 are points on circle.
    // Actually the "lines" being intersected are chords or axis lines.

    // In original code vertex-projection.js:
    // arc1Data = { type: 'line', p1: p_theta, p2: X2 }
    // These define the line passing through p_theta and X2.
    // We strictly want the intersection of the infinite lines or the specific segments?
    // Original code checks t, u in [0,1], implying segments.
    // But X2 is the boundary. p_theta is on Y axis.
    // So the segment is valid.

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: p.x + t * (q.x - p.x),
            y: p.y + t * (q.y - p.y)
        };
    }
    return null;
}

/**
 * Helper: Intersect circle and line segment
 */
function intersectCircleLine(circle: { center: { x: number, y: number }, radius: number }, line: { p: { x: number, y: number }, q: { x: number, y: number } }) {
    const { center, radius } = circle;
    const { p, q } = line;

    // Translate to center
    const localP = { x: p.x - center.x, y: p.y - center.y };
    const localQ = { x: q.x - center.x, y: q.y - center.y };

    const dx = localQ.x - localP.x;
    const dy = localQ.y - localP.y;
    const dr = Math.sqrt(dx * dx + dy * dy);
    const D = localP.x * localQ.y - localQ.x * localP.y;

    const discriminant = radius * radius * dr * dr - D * D;
    if (discriminant < 0) return [];

    // const signDy = dy < 0 ? -1 : 1; 
    // Actually standard Math.sign happens to match typical formula needs.

    const sqrtDisc = Math.sqrt(discriminant);
    const x1 = (D * dy + (dy >= 0 ? 1 : -1) * dx * sqrtDisc) / (dr * dr);
    const y1 = (-D * dx + Math.abs(dy) * sqrtDisc) / (dr * dr);
    const x2 = (D * dy - (dy >= 0 ? 1 : -1) * dx * sqrtDisc) / (dr * dr);
    const y2 = (-D * dx - Math.abs(dy) * sqrtDisc) / (dr * dr);

    // Filter points to be within segment?
    // Original code does NOT filter for circle-line intersection, it returns all mathematical intersections.

    return [
        { x: x1 + center.x, y: y1 + center.y },
        { x: x2 + center.x, y: y2 + center.y }
    ];
}

/**
 * Helper: Intersection dispatcher
 */
function intersectArcsOrLines(arc1: any, arc2: any) {
    let intersections: any[] = [];
    if (arc1.type === 'line' && arc2.type === 'line') {
        const intersection = intersectLines(arc1.p1, arc1.p2, arc2.p1, arc2.p2);
        if (intersection) intersections.push(intersection);
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
 */
function selectCorrectIntersection(intersections: any[], boundaryRadius: number) {
    if (intersections.length === 0) return null;
    if (intersections.length === 1) return intersections[0];

    // Select the intersection closest to the center and within the boundary
    let bestIntersection = null;
    let minDistance = Infinity;

    for (const intersection of intersections) {
        const distance = Math.sqrt(intersection.x * intersection.x + intersection.y * intersection.y);
        if (distance <= boundaryRadius + 0.1 && distance < minDistance) {
            minDistance = distance;
            bestIntersection = intersection;
        }
    }

    return bestIntersection;
}

/**
 * Projects a 3D point onto a 2D plane using Hemispherical (Postel) Projection.
 * Mirrors logic from vertex-projection.js
 */
export function projectHemispherical(
    vertex: THREE.Vector3,
    viewpoint: THREE.Vector3,
    hemisphereRadius: number = 5
): THREE.Vector2 {
    const boundaryRadius = (Math.PI / 2) * hemisphereRadius;

    // Direction from viewpoint to vertex
    const direction = vertex.clone().sub(viewpoint).normalize();

    // 1. Theta (YZ plane angle)
    const v_yz = new THREE.Vector3(0, direction.y, direction.z).normalize();
    const theta = Math.atan2(v_yz.y, Math.abs(v_yz.z));

    // 2. Phi (XZ plane angle)
    const v_xz = new THREE.Vector3(direction.x, 0, direction.z).normalize();
    const phi = Math.atan2(v_xz.x, Math.abs(v_xz.z));

    // 3. Define points on axes
    const p_theta = { x: 0, y: hemisphereRadius * theta };
    const p_phi = { x: hemisphereRadius * phi, y: 0 };

    // 4. Define boundary points
    const X2 = { x: -boundaryRadius, y: 0 }; // Left
    const Y2 = { x: 0, y: -boundaryRadius }; // Bottom

    // 5. Handle special cases
    const isThetaZero = Math.abs(theta) < 0.001;
    const isPhiZero = Math.abs(phi) < 0.001;

    if (isThetaZero && isPhiZero) return new THREE.Vector2(0, 0);
    if (isThetaZero) return new THREE.Vector2(p_phi.x, p_phi.y);
    if (isPhiZero) return new THREE.Vector2(p_theta.x, p_theta.y);

    // 6. Compute Arcs/Lines and Intersect
    // Arc 1: Horizontal-ish (related to theta/Y)
    const arc1LineData = computeCircleFromThreePoints(p_theta, { x: boundaryRadius, y: 0 }, { x: -boundaryRadius, y: 0 });
    const arc1 = arc1LineData
        ? { type: 'circle', center: arc1LineData.center, radius: arc1LineData.radius }
        : { type: 'line', p1: p_theta, p2: X2 }; // Fallback to line if collinear

    // Arc 2: Vertical-ish (related to phi/X)
    const arc2LineData = computeCircleFromThreePoints(p_phi, { x: 0, y: boundaryRadius }, { x: 0, y: -boundaryRadius });
    const arc2 = arc2LineData
        ? { type: 'circle', center: arc2LineData.center, radius: arc2LineData.radius }
        : { type: 'line', p1: p_phi, p2: Y2 };

    // 7. Find Intersection
    const intersections = intersectArcsOrLines(arc1, arc2);

    // 8. Select correct intersection
    if (intersections.length === 0) return new THREE.Vector2(0, 0); // Should not happen for valid geometry

    // Closest to center and within boundary
    const bestPoint = selectCorrectIntersection(intersections, boundaryRadius);

    let result = bestPoint ? new THREE.Vector2(bestPoint.x, bestPoint.y) : new THREE.Vector2(intersections[0].x, intersections[0].y);

    // 9. Handle "Outside" Projection (Vertex behind viewpoint)
    // If direction.z > 0 (assuming standard -Z look direction), the point is on the back hemisphere.
    // We apply inversion logic similar to vanishing points.
    if (direction.z > 0) {
        const d = result.length();
        if (d > 0.001) {
            const d_out = (boundaryRadius * boundaryRadius) / d;
            // Invert distance but keep direction (User requested no flip)
            result.normalize().multiplyScalar(d_out);
        } else {
            // Point is directly behind -> Project to infinity? 
            // Or very far away.
            result.set(10000, 10000);
        }
    }

    return result;
}

/**
 * Calculates circle parameters from three points.
 * Returns { center, radius } or null if collinear.
 */
export function getCircleFromThreePoints(p1: THREE.Vector2, p2: THREE.Vector2, p3: THREE.Vector2) {
    return computeCircleFromThreePoints(p1, p2, p3);
}

/**
 * Generates points for an arc between p1 and p2, passing through curvature defined by p3.
 * Used for Hemispherical curved edges.
 */
/**
 * Generates points for an arc between p1 and p2, passing through curvature defined by p3.
 * Simplistic version: assumes shortest path on circle defined by 3 points.
 */
export function getArcPoints(
    p1: THREE.Vector2 | { x: number, y: number },
    p2: THREE.Vector2 | { x: number, y: number },
    p3: THREE.Vector2 | { x: number, y: number },
    boundaryRadius: number = 0,
    segments?: number
): THREE.Vector3[] {
    const circle = computeCircleFromThreePoints(p1, p2, p3);

    if (!circle) {
        return [
            new THREE.Vector3(p1.x, p1.y, 0),
            new THREE.Vector3(p2.x, p2.y, 0)
        ];
    }

    const { center, radius } = circle;
    const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
    const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);

    let diff = endAngle - startAngle;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;

    // Dynamic segmentation
    let segCount = segments;
    if (!segCount) {
        const totalAngle = Math.abs(diff);
        const arcLength = radius * totalAngle;

        // Base quality logic
        segCount = Math.max(32, Math.ceil(arcLength / 0.5));

        // User constraint: if arc radius is huge (>100 * image plane radius), cap it
        if (boundaryRadius > 0 && radius > boundaryRadius * 100) {
            segCount = Math.min(segCount, 128); // Cap for extremely large radii
        } else {
            segCount = Math.min(segCount, 512); // Higher cap for normal large arcs
        }
    }

    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segCount; i++) {
        const t = i / segCount;
        const angle = startAngle + diff * t;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, 0));
    }
    return points;
}

/**
 * Generates points for an arc from start to end, strictly AVOIDING the middle point.
 * Matches logic from edge-rendering.js determineArcParameters (!isMidInCCWArc).
 */
export function getArcPointsAvoidingMiddle(
    start: THREE.Vector2 | { x: number, y: number },
    end: THREE.Vector2 | { x: number, y: number },
    middle: THREE.Vector2 | { x: number, y: number },
    boundaryRadius: number = 0,
    segments?: number
): THREE.Vector3[] {
    const circle = computeCircleFromThreePoints(start, middle, end);
    if (!circle) {
        return [
            new THREE.Vector3(start.x, start.y, 0),
            new THREE.Vector3(end.x, end.y, 0)
        ];
    }

    const { center, radius } = circle;

    const getAngle = (p: { x: number, y: number }) => {
        const a = Math.atan2(p.y - center.y, p.x - center.x);
        return a < 0 ? a + 2 * Math.PI : a;
    };

    const startAngle = getAngle(start);
    const midAngle = getAngle(middle);
    const endAngle = getAngle(end);

    // Determine direction: we want to AVOID the middle point segment
    let isMidInCCWArc;
    if (startAngle < endAngle) {
        isMidInCCWArc = midAngle > startAngle && midAngle < endAngle;
    } else {
        isMidInCCWArc = midAngle > startAngle || midAngle < endAngle;
    }

    // Original code: counterClockwise = !isMidInCCWArc
    const counterClockwise = !isMidInCCWArc;

    // Dynamic segmentation
    let segCount = segments;
    if (!segCount) {
        let totalAngle;
        if (counterClockwise) {
            totalAngle = (endAngle >= startAngle) ? (endAngle - startAngle) : (endAngle + 2 * Math.PI - startAngle);
        } else {
            totalAngle = (startAngle >= endAngle) ? (startAngle - endAngle) : (startAngle + 2 * Math.PI - endAngle);
        }

        const arcLength = radius * totalAngle;
        segCount = Math.max(32, Math.ceil(arcLength / 0.5));

        if (boundaryRadius > 0 && radius > boundaryRadius * 100) {
            segCount = Math.min(segCount, 128); // Cap for extremely large radii
        } else {
            segCount = Math.min(segCount, 512); // Higher cap for normal large arcs
        }
    }

    // Generate points
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segCount; i++) {
        const t = i / segCount;
        let angle;

        if (counterClockwise) {
            // CCW from start to end
            let delta;
            if (startAngle < endAngle) {
                delta = endAngle - startAngle;
            } else {
                delta = endAngle + 2 * Math.PI - startAngle;
            }
            angle = startAngle + t * delta;
        } else {
            // CW from start to end
            let delta;
            if (startAngle > endAngle) {
                delta = startAngle - endAngle;
            } else {
                delta = startAngle + 2 * Math.PI - endAngle;
            }
            angle = startAngle - t * delta;
        }

        // Normalize
        while (angle < 0) angle += 2 * Math.PI;
        while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;

        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, -0.05));
    }
    return points;
}

/**
 * Generates points for an arc from start to end, strictly PASSING THROUGH the middle point.
 * Used for edges where we can project the 3D midpoint.
 */
export function getArcPointsThroughMiddle(
    start: THREE.Vector2 | { x: number, y: number },
    end: THREE.Vector2 | { x: number, y: number },
    middle: THREE.Vector2 | { x: number, y: number },
    boundaryRadius: number = 0,
    segments?: number
): THREE.Vector3[] {
    const circle = computeCircleFromThreePoints(start, middle, end);
    if (!circle) {
        return [
            new THREE.Vector3(start.x, start.y, 0),
            new THREE.Vector3(end.x, end.y, 0)
        ];
    }

    const { center, radius } = circle;

    const getAngle = (p: { x: number, y: number }) => {
        const a = Math.atan2(p.y - center.y, p.x - center.x);
        return a < 0 ? a + 2 * Math.PI : a;
    };

    const startAngle = getAngle(start);
    const midAngle = getAngle(middle);
    const endAngle = getAngle(end);

    let isMidInCCWArc;
    if (startAngle < endAngle) {
        isMidInCCWArc = midAngle > startAngle && midAngle < endAngle;
    } else {
        isMidInCCWArc = midAngle > startAngle || midAngle < endAngle;
    }

    // Pass THROUGH middle
    const counterClockwise = isMidInCCWArc;

    // Dynamic segmentation
    let segCount = segments;
    if (!segCount) {
        let totalAngle;
        if (counterClockwise) {
            totalAngle = (endAngle >= startAngle) ? (endAngle - startAngle) : (endAngle + 2 * Math.PI - startAngle);
        } else {
            totalAngle = (startAngle >= endAngle) ? (startAngle - endAngle) : (startAngle + 2 * Math.PI - endAngle);
        }

        const arcLength = radius * totalAngle;
        segCount = Math.max(32, Math.ceil(arcLength / 0.5));

        if (boundaryRadius > 0 && radius > boundaryRadius * 100) {
            segCount = Math.min(segCount, 128);
        } else {
            segCount = Math.min(segCount, 512);
        }
    }

    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segCount; i++) {
        const t = i / segCount;
        let angle;

        if (counterClockwise) {
            let delta = (endAngle >= startAngle) ? (endAngle - startAngle) : (endAngle + 2 * Math.PI - startAngle);
            angle = startAngle + t * delta;
        } else {
            let delta = (startAngle >= endAngle) ? (startAngle - endAngle) : (startAngle + 2 * Math.PI - endAngle);
            angle = startAngle - t * delta;
        }

        while (angle < 0) angle += 2 * Math.PI;
        while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;

        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, 0.05)); // Offset edges slightly
    }
    return points;
}

/**
 * Calculate Hemispherical Vanishing Points
 * Based on original vanishing-points.js logic.
 * Returns array of objects: { pos: Vector2, type: 'inside' | 'outside', axisLabel: string, color: string }
 */
export function calculateHemisphericalVPs(
    transformedVertices: THREE.Vector3[],
    radius: number
): { pos: THREE.Vector2, type: 'inside' | 'outside', axisIndex: number, color: string }[] {

    if (transformedVertices.length < 5) return [];

    const boundaryRadius = (Math.PI / 2) * radius;
    const v0 = transformedVertices[0];
    const v1 = transformedVertices[1]; // X
    const v3 = transformedVertices[3]; // Y
    const v4 = transformedVertices[4]; // Z

    const axes = [
        { dir: v1.clone().sub(v0).normalize(), color: '#ef4444', label: 'X' },
        { dir: v3.clone().sub(v0).normalize(), color: '#22c55e', label: 'Y' },
        { dir: v4.clone().sub(v0).normalize(), color: '#3b82f6', label: 'Z' }
    ];

    const vps: { pos: THREE.Vector2, type: 'inside' | 'outside', axisIndex: number, color: string }[] = [];

    axes.forEach((axis, axisIndex) => {
        // Choose direction logic from original: dot with -Z
        let direction = axis.dir.clone();
        const negZ = new THREE.Vector3(0, 0, -1);
        if (direction.dot(negZ) < axis.dir.clone().negate().dot(negZ)) {
            direction.negate();
        }

        // Project direction to angles
        // Similar to projectHemispherical logic but for direction vector

        // Psi (XY plane angle)
        const psi = Math.atan2(direction.y, direction.x);

        // Theta (YZ plane angle)
        const v_yz = new THREE.Vector3(0, direction.y, direction.z).normalize();
        const theta = Math.atan2(v_yz.y, Math.abs(v_yz.z));

        // Phi (XZ plane angle)
        const v_xz = new THREE.Vector3(direction.x, 0, direction.z).normalize();
        const phi = Math.atan2(v_xz.x, Math.abs(v_xz.z));

        // Define points on axes
        const p_theta = { x: 0, y: radius * theta };
        const p_phi = { x: radius * phi, y: 0 };

        const X2 = { x: -boundaryRadius, y: 0 };
        const Y2 = { x: 0, y: -boundaryRadius };

        let insideVP: { x: number, y: number } | null = null;

        // Check boundary cases
        const isThetaBoundary = Math.abs(Math.abs(theta) - Math.PI / 2) < 0.001;
        const isPhiBoundary = Math.abs(Math.abs(phi) - Math.PI / 2) < 0.001;

        if (isThetaBoundary || isPhiBoundary) {
            insideVP = {
                x: boundaryRadius * Math.cos(psi),
                y: boundaryRadius * Math.sin(psi)
            };
        } else {
            // Normal intersection logic
            const isThetaZero = Math.abs(theta) < 0.001;
            const isPhiZero = Math.abs(phi) < 0.001;

            if (isThetaZero && isPhiZero) {
                insideVP = { x: 0, y: 0 };
            } else if (isThetaZero) {
                insideVP = p_phi;
            } else if (isPhiZero) {
                insideVP = p_theta;
            } else {
                // Intersect arcs
                // We reuse computeCircleFromThreePoints logic manually or assume helper availability
                // Since helpers are local, we access them if they were defined in same scope.
                // We need to ensure computeCircleFromThreePoints etc are available. 
                // They are defined above in this file.

                const arc1LineData = computeCircleFromThreePoints(p_theta, { x: boundaryRadius, y: 0 }, { x: -boundaryRadius, y: 0 });
                const arc1 = arc1LineData
                    ? { type: 'circle', center: arc1LineData.center, radius: arc1LineData.radius, p1: p_theta, p2: X2 }
                    : { type: 'line', p1: p_theta, p2: X2 };

                const arc2LineData = computeCircleFromThreePoints(p_phi, { x: 0, y: boundaryRadius }, { x: 0, y: -boundaryRadius });
                const arc2 = arc2LineData
                    ? { type: 'circle', center: arc2LineData.center, radius: arc2LineData.radius, p1: p_phi, p2: Y2 }
                    : { type: 'line', p1: p_phi, p2: Y2 };

                const intersections = intersectArcsOrLines(arc1, arc2);
                insideVP = selectCorrectIntersection(intersections, boundaryRadius);
            }
        }

        if (insideVP) {
            vps.push({
                pos: new THREE.Vector2(insideVP.x, insideVP.y),
                type: 'inside',
                axisIndex,
                color: axis.color
            });

            // Outside VP Calculation (Inversion)
            // Restore original logic (+ Math.PI flip) to maintain eye-line continuity
            const d = Math.sqrt(insideVP.x * insideVP.x + insideVP.y * insideVP.y);
            if (d > 0.001) {
                const outsideDistance = (boundaryRadius * boundaryRadius) / d;
                const insideAngle = Math.atan2(insideVP.y, insideVP.x);
                const outsideAngle = insideAngle + Math.PI; // FLIP
                const outsideVP = {
                    x: outsideDistance * Math.cos(outsideAngle),
                    y: outsideDistance * Math.sin(outsideAngle)
                };
                vps.push({
                    pos: new THREE.Vector2(outsideVP.x, outsideVP.y),
                    type: 'outside',
                    axisIndex,
                    color: axis.color
                });
            }
        }
    });

    return vps;
}
