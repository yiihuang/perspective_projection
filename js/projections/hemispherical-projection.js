import { state } from '../state.js';
import { config } from '../config.js';
import { createMaterial, clearGroup, updateCubeInScene, updateViewpointInScene, updateProjectedViewpointMarker, getCachedWorldVertices, safeDispose, updateMaster3DScene, RAY_MATERIALS } from '../utils/three-utils.js';

/**
 * Hemispherical Perspective Projection Module
 * Handles all hemispherical perspective calculations and visual updates
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

export function createArc(p1, p2, p3, material) {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y; 
    const cx = p3.x, cy = p3.y;
    
    // Improved collinear detection using multiple methods
    function arePointsCollinear(p1, p2, p3) {
        // Method 1: Area of triangle (should be zero for collinear points)
        const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;
        
        // Method 2: Cross product of vectors
        const v1x = p2.x - p1.x;
        const v1y = p2.y - p1.y;
        const v2x = p3.x - p1.x;
        const v2y = p3.y - p1.y;
        const crossProduct = Math.abs(v1x * v2y - v1y * v2x);
        
        // Method 3: Original determinant method
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        
        // Calculate scale-dependent tolerance
        const maxCoord = Math.max(Math.abs(ax), Math.abs(ay), Math.abs(bx), Math.abs(by), Math.abs(cx), Math.abs(cy));
        const scaleTolerance = Math.max(1e-6, maxCoord * 1e-8); // Adaptive tolerance
        
        // Check if any method indicates collinearity
        const isCollinear = area < scaleTolerance || 
                           crossProduct < scaleTolerance || 
                           Math.abs(d) < scaleTolerance;
        
        return isCollinear;
    }
    
    if (arePointsCollinear(p1, p2, p3)) {
        // Points are collinear - draw straight lines connecting all three points
        // Sort points to ensure proper line order
        const points = [p1, p2, p3];
        points.sort((a, b) => {
            // Sort by x-coordinate first, then by y-coordinate
            if (Math.abs(a.x - b.x) > 1e-6) {
                return a.x - b.x;
            }
            return a.y - b.y;
        });
        
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(points[0].x, points[0].y, 0),
            new THREE.Vector3(points[1].x, points[1].y, 0),
            new THREE.Vector3(points[2].x, points[2].y, 0)
        ]), material);
    }
    
    // Calculate circle center and radius using the original method
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    
    const centerX = ux;
    const centerY = uy;
    const radius = Math.sqrt((ax - centerX) * (ax - centerX) + (ay - centerY) * (ay - centerY));
    
    // Create arc between p1 and p2 through p3
    const angle1 = Math.atan2(p1.y - centerY, p1.x - centerX);
    const angle2 = Math.atan2(p2.y - centerY, p2.x - centerX);
    
    // Calculate adaptive segments based on radius
    const baseSegments = 64;
    const maxArcLength = 0.5; // Maximum arc length between segments in world units
    const arcLength = Math.abs(angle2 - angle1) * radius;
    const adaptiveSegments = Math.max(baseSegments, Math.ceil(arcLength / maxArcLength));
    const segments = Math.min(adaptiveSegments, 256); // Cap at 256 for performance
    const points = [];
    
    // Determine the shorter arc direction
    let startAngle = angle1;
    let endAngle = angle2;
    let angleDiff = endAngle - startAngle;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    endAngle = startAngle + angleDiff;
    
    for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (endAngle - startAngle) * i / segments;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, 0));
    }
    
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

export function createEdgeArc(vertex1, vertex2, vanishingPoint, material) {
    // Create an arc that connects only the two vertices, using the vanishing point to determine curvature
    const ax = vertex1.x, ay = vertex1.y;
    const bx = vanishingPoint.x, by = vanishingPoint.y;
    const cx = vertex2.x, cy = vertex2.y;
    
    // Improved collinear detection using multiple methods
    function arePointsCollinear(p1, p2, p3) {
        // Method 1: Area of triangle (should be zero for collinear points)
        const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;
        
        // Method 2: Cross product of vectors
        const v1x = p2.x - p1.x;
        const v1y = p2.y - p1.y;
        const v2x = p3.x - p1.x;
        const v2y = p3.y - p1.y;
        const crossProduct = Math.abs(v1x * v2y - v1y * v2x);
        
        // Method 3: Original determinant method
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        
        // Calculate scale-dependent tolerance
        const maxCoord = Math.max(Math.abs(ax), Math.abs(ay), Math.abs(bx), Math.abs(by), Math.abs(cx), Math.abs(cy));
        const scaleTolerance = Math.max(1e-6, maxCoord * 1e-8); // Adaptive tolerance
        
        // Check if any method indicates collinearity
        const isCollinear = area < scaleTolerance || 
                           crossProduct < scaleTolerance || 
                           Math.abs(d) < scaleTolerance;
        
        return isCollinear;
    }
    
    if (arePointsCollinear(vertex1, vanishingPoint, vertex2)) {
        // Points are collinear - draw straight line between vertices
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(vertex1.x, vertex1.y, 0.2), // Higher z-index to render on top
            new THREE.Vector3(vertex2.x, vertex2.y, 0.2)
        ]), material);
    }
    
    // Calculate circle center and radius using the original method
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    
    const centerX = ux;
    const centerY = uy;
    const radius = Math.sqrt((ax - centerX) * (ax - centerX) + (ay - centerY) * (ay - centerY));
    
    // Create arc only between the two vertices (not through the vanishing point)
    const angle1 = Math.atan2(vertex1.y - centerY, vertex1.x - centerX);
    const angle2 = Math.atan2(vertex2.y - centerY, vertex2.x - centerX);
    
    // Calculate adaptive segments based on radius
    const baseSegments = 32;
    const maxArcLength = 0.5; // Maximum arc length between segments in world units
    const arcLength = Math.abs(angle2 - angle1) * radius;
    const adaptiveSegments = Math.max(baseSegments, Math.ceil(arcLength / maxArcLength));
    const segments = Math.min(adaptiveSegments, 128); // Cap at 128 for performance
    const points = [];
    
    // Determine the shorter arc direction
    let startAngle = angle1;
    let endAngle = angle2;
    let angleDiff = endAngle - startAngle;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    endAngle = startAngle + angleDiff;
    
    for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (endAngle - startAngle) * i / segments;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, 0.2)); // Higher z-index to render on top
    }
    
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

export function createFullCircle(p1, p2, p3, material) {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y; 
    const cx = p3.x, cy = p3.y;
    
    // Improved collinear detection using multiple methods
    function arePointsCollinear(p1, p2, p3) {
        // Method 1: Area of triangle (should be zero for collinear points)
        const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;
        
        // Method 2: Cross product of vectors
        const v1x = p2.x - p1.x;
        const v1y = p2.y - p1.y;
        const v2x = p3.x - p1.x;
        const v2y = p3.y - p1.y;
        const crossProduct = Math.abs(v1x * v2y - v1y * v2x);
        
        // Method 3: Original determinant method
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        
        // Calculate scale-dependent tolerance
        const maxCoord = Math.max(Math.abs(ax), Math.abs(ay), Math.abs(bx), Math.abs(by), Math.abs(cx), Math.abs(cy));
        const scaleTolerance = Math.max(1e-6, maxCoord * 1e-8); // Adaptive tolerance
        
        // Check if any method indicates collinearity
        const isCollinear = area < scaleTolerance || 
                           crossProduct < scaleTolerance || 
                           Math.abs(d) < scaleTolerance;
        
        return isCollinear;
    }
    
    if (arePointsCollinear(p1, p2, p3)) {
        // Points are collinear - draw straight lines connecting all three points
        // Sort points to ensure proper line order
        const points = [p1, p2, p3];
        points.sort((a, b) => {
            // Sort by x-coordinate first, then by y-coordinate
            if (Math.abs(a.x - b.x) > 1e-6) {
                return a.x - b.x;
            }
            return a.y - b.y;
        });
        
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(points[0].x, points[0].y, 0),
            new THREE.Vector3(points[1].x, points[1].y, 0),
            new THREE.Vector3(points[2].x, points[2].y, 0)
        ]), material);
    }
    
    // Calculate circle center and radius using the original method
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    
    const centerX = ux;
    const centerY = uy;
    const radius = Math.sqrt((ax - centerX) * (ax - centerX) + (ay - centerY) * (ay - centerY));
    
    // Create full circle (0 to 2π) with adaptive segments based on radius
    // Use more segments for larger circles to maintain smoothness
    const baseSegments = 256;
    const maxArcLength = 0.5; // Maximum arc length between segments in world units
    const adaptiveSegments = Math.max(baseSegments, Math.ceil((2 * Math.PI * radius) / maxArcLength));
    const segments = Math.min(adaptiveSegments, 1024); // Cap at 1024 for performance
    const points = [];
    
    for (let i = 0; i <= segments; i++) {
        const angle = (2 * Math.PI * i) / segments;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, 0));
    }
    
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

// Helper functions for intersection-based hemispherical projection
function computeCircleFromThreePoints(p1, p2, p3) {
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

function intersectCircles(c1, r1, c2, r2) {
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

function intersectLines(p, q, r, s) {
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

function intersectCircleLine(circle, linePoints) {
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

function intersectArcsOrLines(arc1, arc2) {
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

function selectCorrectIntersection(intersections, boundaryRadius) {
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

export function createHemi2DBoundary(scene, hemisphereRadius) {
    const boundaryRadius = (Math.PI / 2) * hemisphereRadius;
    const circleGeometry = new THREE.RingGeometry(boundaryRadius - 0.05, boundaryRadius, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({ color: config.COLORS.boundary, side: THREE.DoubleSide });
    const hemiBoundary = new THREE.Mesh(circleGeometry, circleMaterial);
    scene.add(hemiBoundary);
    return hemiBoundary;
}

export function updateHemisphericalProjection(scenes, groups, hemisphere) {
    // Update shared 3D scene objects (cube, viewpoint) - using custom ray handling
    const worldVertices = updateMaster3DScene({
        customRayHandling: true  // We'll handle rays ourselves with complementary system
    });
    
    // Update hemisphere
    const hemisphereCenter = state.viewpointPosition.clone();
    hemisphere.position.copy(hemisphereCenter);
    // No scaling needed - geometry is already created with correct radius
    
    // Update hemisphere boundary in 2D
    if (window.hemiBoundary) {
        scenes.hemi2D.remove(window.hemiBoundary);
        safeDispose(window.hemiBoundary);
    }
    window.hemiBoundary = createHemi2DBoundary(scenes.hemi2D, state.hemisphereRadius);
    
    // Clear previous 2D projections only (3D was handled by shared function)
    Object.values(groups.hemi2D).forEach(group => clearGroup(group));
    
    // Update projected viewpoint marker
    const hemisphereDir = hemisphereCenter.clone().sub(state.viewpointPosition).normalize();
    const viewpointOnHemisphere = intersectRayWithHemisphere(state.viewpointPosition, hemisphereDir, hemisphereCenter, state.hemisphereRadius);
    if (viewpointOnHemisphere) {
        const projected2D = postelProjection(viewpointOnHemisphere, hemisphereCenter, state.hemisphereRadius);
        updateProjectedViewpointMarker('hemi2D', projected2D.x, projected2D.y, scenes.hemi2D);
    }
    
    // Calculate 2D projections using new intersection-based hemispherical projection
    const projectedVertices = [];
    const boundaryRadius = (Math.PI / 2) * state.hemisphereRadius;

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
        
        let arc1Data, arc2Data;
        
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
            if (arc1) {
                arc1Data = { type: 'circle', center: arc1.center, radius: arc1.radius, p1: p_theta, p2: X2 };
            } else {
                arc1Data = { type: 'line', p1: p_theta, p2: X2 };
            }
            
            const arc2 = computeCircleFromThreePoints(p_phi, Y1, Y2);
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

    // Calculate vanishing points
    const dirX = new THREE.Vector3().subVectors(worldVertices[1], worldVertices[0]);
    const dirY = new THREE.Vector3().subVectors(worldVertices[3], worldVertices[0]);
    const dirZ = new THREE.Vector3().subVectors(worldVertices[4], worldVertices[0]);
    
    // Calculate direction vectors for vanishing points
    
    // Auto-fix: If matrix determinant is far from 1.0, reset the rotation matrix
    if (state.cube) {
        const matrix = state.cube.matrixWorld;
        const det = matrix.determinant();
        if (Math.abs(det - 1.0) > 0.01) {
            state.cube.matrix.makeRotationFromEuler(state.cube.rotation);
            state.cube.updateMatrixWorld(true);
        }
    }

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
            } else {
                // Inside VP at center - skip outside VP calculation
            }
        }
        
        // Store inside VP at index 0, outside VP at index 1
        vanishingPoints.push(insideVP);
        vanishingPoints.push(outsideVP);
        
        // Draw vanishing point markers
        if (insideVP) {
            const insideVpGeom = new THREE.CircleGeometry(0.15, 16);
            const insideVpMat = new THREE.MeshBasicMaterial({ 
                color: vpData.color,
                opacity: 1.0
            });
            const insideVpMesh = new THREE.Mesh(insideVpGeom, insideVpMat);
            insideVpMesh.position.set(insideVP.x, insideVP.y, 0.1);
            groups.hemi2D.vanishingPoints.add(insideVpMesh);
        }
        
        if (outsideVP) {
            const outsideVpGeom = new THREE.CircleGeometry(0.15, 16);
            const outsideVpMat = new THREE.MeshBasicMaterial({ 
                color: vpData.color,
                opacity: 0.7,
                transparent: true
            });
            const outsideVpMesh = new THREE.Mesh(outsideVpGeom, outsideVpMat);
            outsideVpMesh.position.set(outsideVP.x, outsideVP.y, 0.1);
            groups.hemi2D.vanishingPoints.add(outsideVpMesh);
        }
    });

    // Special case: If both vanishing points are on the boundary circle, connect them with shorter arc
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
    
                
                // Create the guide material for this axis
                const guideColor = config.COLORS.guideLines[['x', 'y', 'z'][axisIndex]];
                const guideMaterial = new THREE.LineBasicMaterial({ 
                    color: guideColor,
                    opacity: 0.7,
                    transparent: true
                });
                
                // Use the same logic as the general case: for each edge, draw two arcs (inside and outside VP)
                const edgeAxisMapping = config.CUBE_MAPPINGS.edgeAxisMapping;
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

    // Helper functions for arc drawing
    function calculateDistance(point) {
        return Math.sqrt(point.x * point.x + point.y * point.y);
    }
    
    function getVanishingPointForEdge(v1Index, v2Index) {
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





    // Draw projected vertices as points
    const vertexMaterial = new THREE.MeshBasicMaterial({ color: config.COLORS.cubeEdge });
    
    projectedVertices.forEach((vertex, index) => {
        if (vertex && isFinite(vertex.x) && isFinite(vertex.y)) {
            const vertexGeom = new THREE.CircleGeometry(0.1, 16);
            const vertexMesh = new THREE.Mesh(vertexGeom, vertexMaterial);
            vertexMesh.position.set(vertex.x, vertex.y, 0.1);
            groups.hemi2D.projectedCubeLines.add(vertexMesh);
        }
    });

    // Draw guide lines from cube edges to vanishing points using arcs
    const edgeAxisMapping = config.CUBE_MAPPINGS.edgeAxisMapping;
    
    // Store special case lines to draw on top later
    const specialCaseLines = [];
    
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
            const guideColor = config.COLORS.guideLines[['x', 'y', 'z'][axisIndex]];
            const guideMaterial = new THREE.LineBasicMaterial({ 
                color: guideColor,
                opacity: 0.7,
                transparent: true
            });
            
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
        const guideColor = config.COLORS.guideLines[['x', 'y', 'z'][axisIndex]];
        const guideMaterial = new THREE.LineBasicMaterial({ 
            color: guideColor,
            opacity: 0.7,
            transparent: true
        });
        
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
                const oppositeGuideColor = config.COLORS.guideLines[['x', 'y', 'z'][axisIndex]];
                const oppositeGuideMaterial = new THREE.LineBasicMaterial({ 
                    color: oppositeGuideColor,
                    opacity: 0.7,
                    transparent: true
                });
                
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
            
            const oppositeGuideColor = config.COLORS.guideLines[['x', 'y', 'z'][axisIndex]];
            const oppositeGuideMaterial = new THREE.LineBasicMaterial({ 
                color: oppositeGuideColor, 
                opacity: 0.7,
                transparent: true
            });
            
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
                                    new THREE.Vector3(nearerToInside.x, nearerToInside.y, -0.1),
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
                                new THREE.Vector3(nearerVertex.x, nearerVertex.y, -0.1),
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
    
    // Draw projected cube edges as arcs (after guide lines so they render on top)
    const edges = config.CUBE_MAPPINGS.edges;
    const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: config.COLORS.cubeEdge, // Use same color as linear projection
        linewidth: 3 // Make edges thicker to ensure they're visible on top
    });
    

    
    for (let i = 0; i < edges.length; i += 2) {
        const v1Index = edges[i];
        const v2Index = edges[i + 1];
        const vertex1 = projectedVertices[v1Index];
        const vertex2 = projectedVertices[v2Index];
        
        if (isFinite(vertex1.x) && isFinite(vertex1.y) && isFinite(vertex2.x) && isFinite(vertex2.y)) {
            // Get the vanishing point for this edge
            const { vp, axisIndex } = getVanishingPointForEdge(v1Index, v2Index);
            

            
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

// Helper function to find circle center and radius from three points
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

// Helper to get a point's angle on the circle (normalized from 0 to 2*PI)
function getAngle(center, point) {
    const angle = Math.atan2(point.y - center.y, point.x - center.x);
    return angle < 0 ? angle + 2 * Math.PI : angle;
}

// The core logic for choosing which arc to draw
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