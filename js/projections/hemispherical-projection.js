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

export function createCircularArc(p1, p2, p3, material) {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y; 
    const cx = p3.x, cy = p3.y;
    
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 0.0001) {
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(p1.x, p1.y, 0),
            new THREE.Vector3(p2.x, p2.y, 0)
        ]), material);
    }
    
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    
    const centerX = ux;
    const centerY = uy;
    const radius = Math.sqrt((ax - centerX) * (ax - centerX) + (ay - centerY) * (ay - centerY));
    
    const angle1 = Math.atan2(p1.y - centerY, p1.x - centerX);
    const angle2 = Math.atan2(p2.y - centerY, p2.x - centerX);
    
    const segments = 32;
    const points = [];
    
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
    
    // Calculate hemisphere intersections and 2D projections with ray visualization based on toggle state
    const projectedVertices = [];

    worldVertices.forEach(worldVertex => {
        const rayDirection = worldVertex.clone().sub(state.viewpointPosition).normalize();
        
        const hemisphereIntersection = intersectRayWithHemisphere(state.viewpointPosition, rayDirection, hemisphereCenter, state.hemisphereRadius);
        if (hemisphereIntersection) {
            if (state.showRedRays) {
                if (state.showIntersectionRays) {
                    // Complementary ray system (green + red segments to avoid overlap)
                    // Green ray: viewpoint → hemisphere intersection (bright, thick)
                    const greenRay = new THREE.Line(
                        new THREE.BufferGeometry().setFromPoints([state.viewpointPosition, hemisphereIntersection]), 
                        RAY_MATERIALS.GREEN_INTERSECTION
                    );
                    state.groups.master3D.projectionLines.add(greenRay);
                    
                    // Red ray: hemisphere intersection → extended point (complementary segment)
                    const extendedPoint = state.viewpointPosition.clone().add(rayDirection.clone().multiplyScalar(30));
                    const redRay = new THREE.Line(
                        new THREE.BufferGeometry().setFromPoints([hemisphereIntersection, extendedPoint]), 
                        RAY_MATERIALS.RED_COMPLEMENT_HEMI
                    );
                    state.groups.master3D.projectionLines.add(redRay);
                } else {
                    // Full red rays only (viewpoint → extended points, thicker and more opaque)
                    const extendedPoint = state.viewpointPosition.clone().add(rayDirection.clone().multiplyScalar(30));
                    const redRay = new THREE.Line(
                        new THREE.BufferGeometry().setFromPoints([state.viewpointPosition, extendedPoint]), 
                        RAY_MATERIALS.RED_EXTENDED
                    );
                    state.groups.master3D.projectionLines.add(redRay);
                }
            }
            // If showRedRays is false, no rays are drawn at all
            
            const projected2D = postelProjection(hemisphereIntersection, hemisphereCenter, state.hemisphereRadius);
            projectedVertices.push(projected2D);
        } else {
            projectedVertices.push(new THREE.Vector2(Infinity, Infinity));
        }
    });

    // Calculate vanishing points
    const dirX = new THREE.Vector3().subVectors(worldVertices[1], worldVertices[0]);
    const dirY = new THREE.Vector3().subVectors(worldVertices[3], worldVertices[0]);
    const dirZ = new THREE.Vector3().subVectors(worldVertices[4], worldVertices[0]);
    
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
    vanishingPointData.forEach(vpData => {
        const directions = [vpData.dir, vpData.dir.clone().negate()];
        
        directions.forEach((direction, index) => {
            const hemisphereIntersection = intersectRayWithHemisphere(state.viewpointPosition, direction, hemisphereCenter, state.hemisphereRadius);
            
            if (hemisphereIntersection) {
                const projected2D = postelProjection(hemisphereIntersection, hemisphereCenter, state.hemisphereRadius);
                
                if (isFinite(projected2D.x) && isFinite(projected2D.y)) {
                    vanishingPoints.push(projected2D);
                    
                    const vpGeom = new THREE.CircleGeometry(0.15, 16);
                    const vpMat = new THREE.MeshBasicMaterial({ 
                        color: vpData.color,
                        opacity: index === 0 ? 1.0 : 0.7,
                        transparent: index === 1
                    });
                    const vpMesh = new THREE.Mesh(vpGeom, vpMat);
                    vpMesh.position.set(projected2D.x, projected2D.y, 0.1);
                    groups.hemi2D.vanishingPoints.add(vpMesh);
                } else {
                    vanishingPoints.push(null);
                }
            } else {
                vanishingPoints.push(null);
            }
        });
    });

    // Helper functions for arc drawing
    function getVanishingPointForEdge(v1Index, v2Index) {
        const edgeDirections = config.CUBE_MAPPINGS.edgeDirections;
        const key = `${v1Index},${v2Index}`;
        let axisIndex = edgeDirections[key];
        if (axisIndex === undefined) return { vp: null, axisIndex: null };
        
        const posVP = vanishingPoints[axisIndex * 2];
        const negVP = vanishingPoints[axisIndex * 2 + 1];
        
        // Use tolerance to handle floating-point precision errors during rotation
        const vpTolerance = boundaryRadius * 0.001; // 0.1% tolerance
        const vpBoundaryRadiusSquared = (boundaryRadius + vpTolerance) * (boundaryRadius + vpTolerance);
        
        if (posVP && isFinite(posVP.x) && isFinite(posVP.y)) {
            const posDistSquared = posVP.x * posVP.x + posVP.y * posVP.y;
            if (posDistSquared <= vpBoundaryRadiusSquared) {
                return { vp: posVP, axisIndex: axisIndex };
            }
        }
        
        if (negVP && isFinite(negVP.x) && isFinite(negVP.y)) {
            const negDistSquared = negVP.x * negVP.x + negVP.y * negVP.y;
            if (negDistSquared <= vpBoundaryRadiusSquared) {
                return { vp: negVP, axisIndex: axisIndex };
            }
        }
        
        return { vp: null, axisIndex: axisIndex };
    }

    function getLighterColor(axisIndex) {
        const colors = [config.COLORS.guide.red, config.COLORS.guide.green, config.COLORS.guide.blue];
        return colors[axisIndex];
    }

    // Cache commonly used values
    const boundaryRadius = (Math.PI / 2) * state.hemisphereRadius;
    const tolerance = boundaryRadius * 0.01;
    const boundaryRadiusSquared = boundaryRadius * boundaryRadius;

    // Draw projected cube edges as circular arcs
    const edges = config.CUBE_MAPPINGS.edges;
    const projectedLineMaterial = new THREE.LineBasicMaterial({ color: config.COLORS.cubeEdge, linewidth: 2 });
    
    // Pre-calculate degenerate status for each axis to avoid repeated calculations
    const axisDegenerate = new Array(3);
    for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
        const posVP = vanishingPoints[axisIndex * 2];
        const negVP = vanishingPoints[axisIndex * 2 + 1];
        
        const isPosVPDegenerate = posVP && isFinite(posVP.x) && isFinite(posVP.y) && 
            Math.abs(Math.sqrt(posVP.x * posVP.x + posVP.y * posVP.y) - boundaryRadius) < tolerance;
        const isNegVPDegenerate = negVP && isFinite(negVP.x) && isFinite(negVP.y) && 
            Math.abs(Math.sqrt(negVP.x * negVP.x + negVP.y * negVP.y) - boundaryRadius) < tolerance;
            
        axisDegenerate[axisIndex] = isPosVPDegenerate || isNegVPDegenerate;
    }
    
    for (let i = 0; i < edges.length; i += 2) {
        const v1Index = edges[i];
        const v2Index = edges[i+1];
        const p1 = projectedVertices[v1Index];
        const p2 = projectedVertices[v2Index];
        
        if (p1 && p2 && isFinite(p1.x) && isFinite(p1.y) && isFinite(p2.x) && isFinite(p2.y)) {
            const vpResult = getVanishingPointForEdge(v1Index, v2Index);
            
            if (vpResult.vp) {
                const arc = createCircularArc(p1, p2, vpResult.vp, projectedLineMaterial);
                groups.hemi2D.projectedCubeLines.add(arc);
                
                // Draw guide lines - check if we should extend this arc
                const guideColor = getLighterColor(vpResult.axisIndex);
                const guideMaterial = new THREE.LineBasicMaterial({ 
                    color: guideColor, 
                    opacity: 0.4, 
                    transparent: true,
                    linewidth: 1
                });
                
                if (axisDegenerate[vpResult.axisIndex]) {
                    // At least one vanishing point is degenerate - create extended guide arc for this edge
                    const axisIndex = vpResult.axisIndex;
                    const posVP = vanishingPoints[axisIndex * 2];
                    const negVP = vanishingPoints[axisIndex * 2 + 1];
                    
                    // Calculate circle parameters using the same method as createCircularArc
                    const ax = p1.x, ay = p1.y;
                    const bx = p2.x, by = p2.y; 
                    const cx = vpResult.vp.x, cy = vpResult.vp.y;
                    
                    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
                    
                    if (Math.abs(d) > 0.0001) {
                        const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
                        const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
                        
                        const centerX = ux;
                        const centerY = uy;
                        const radius = Math.sqrt((ax - centerX) * (ax - centerX) + (ay - centerY) * (ay - centerY));
                        
                        // Create extended arc from posVP through edge to negVP
                        const posVPAngle = Math.atan2(posVP.y - centerY, posVP.x - centerX);
                        const negVPAngle = Math.atan2(negVP.y - centerY, negVP.x - centerX);
                        const p1Angle = Math.atan2(p1.y - centerY, p1.x - centerX);
                        const p2Angle = Math.atan2(p2.y - centerY, p2.x - centerX);
                        
                        // Function to normalize angle difference
                        const angleDiff = (a2, a1) => {
                            let diff = a2 - a1;
                            while (diff > Math.PI) diff -= 2 * Math.PI;
                            while (diff < -Math.PI) diff += 2 * Math.PI;
                            return diff;
                        };
                        
                        // Function to check if angle is between two other angles (going counterclockwise)
                        const isAngleBetween = (angle, start, end) => {
                            const startDiff = angleDiff(angle, start);
                            const endDiff = angleDiff(end, start);
                            return startDiff >= 0 && startDiff <= endDiff && endDiff > 0;
                        };
                        
                        // Try both directions and pick the one where the edge vertices are between the vanishing points
                        let startAngle, endAngle;
                        
                        // Direction 1: posVP -> negVP (counterclockwise)
                        const diff1 = angleDiff(negVPAngle, posVPAngle);
                        const p1Between1 = isAngleBetween(p1Angle, posVPAngle, negVPAngle);
                        const p2Between1 = isAngleBetween(p2Angle, posVPAngle, negVPAngle);
                        
                        // Direction 2: negVP -> posVP (counterclockwise, which is the other direction)
                        const diff2 = angleDiff(posVPAngle, negVPAngle);
                        const p1Between2 = isAngleBetween(p1Angle, negVPAngle, posVPAngle);
                        const p2Between2 = isAngleBetween(p2Angle, negVPAngle, posVPAngle);
                        
                        // Choose direction based on which has both edge vertices between vanishing points
                        if ((p1Between1 && p2Between1) || (!p1Between2 && !p2Between2)) {
                            startAngle = posVPAngle;
                            endAngle = posVPAngle + diff1;
                        } else {
                            startAngle = negVPAngle;
                            endAngle = negVPAngle + diff2;
                        }
                        
                        // Generate arc points with boundary checking
                        const segments = 64;
                        const points = [];
                        const boundaryCheck = boundaryRadius + 0.1; // Small tolerance
                        
                        for (let j = 0; j <= segments; j++) {
                            const angle = startAngle + (endAngle - startAngle) * j / segments;
                            const x = centerX + radius * Math.cos(angle);
                            const y = centerY + radius * Math.sin(angle);
                            
                            // Optimized boundary check using squared distance
                            if (x * x + y * y <= boundaryCheck * boundaryCheck) {
                                points.push(new THREE.Vector3(x, y, 0));
                            }
                        }
                        
                        if (points.length > 2) {
                            const extendedGuideArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), guideMaterial);
                            groups.hemi2D.projectedCubeLines.add(extendedGuideArc);
                        }
                    } else {
                        // Fallback: Create a direct line arc between the vanishing points
                        // This handles the special case where edge and vanishing points are collinear
                        const points = [];
                        const segments = 64;
                        const boundaryCheck = boundaryRadius + 0.1; // Small tolerance
                        const boundaryCheckSquared = boundaryCheck * boundaryCheck;
                        
                        for (let j = 0; j <= segments; j++) {
                            const t = j / segments;
                            const x = negVP.x + t * (posVP.x - negVP.x);
                            const y = negVP.y + t * (posVP.y - negVP.y);
                            
                            // Optimized boundary check using squared distance
                            if (x * x + y * y <= boundaryCheckSquared) {
                                points.push(new THREE.Vector3(x, y, 0));
                            }
                        }
                        
                        if (points.length > 2) {
                            const extendedGuideArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), guideMaterial);
                            groups.hemi2D.projectedCubeLines.add(extendedGuideArc);
                        }
                    }
                } else {
                    // Standard guide arcs (existing behavior)
                    const guide1 = createCircularArc(p1, vpResult.vp, p2, guideMaterial);
                    const guide2 = createCircularArc(p2, vpResult.vp, p1, guideMaterial);
                    
                    groups.hemi2D.projectedCubeLines.add(guide1);
                    groups.hemi2D.projectedCubeLines.add(guide2);
                }
            } else {
                const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(p1.x, p1.y, 0),
                    new THREE.Vector3(p2.x, p2.y, 0)
                ]), projectedLineMaterial);
                groups.hemi2D.projectedCubeLines.add(line);
            }
        }
    }
} 