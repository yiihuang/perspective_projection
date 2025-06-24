import { state } from '../state.js';
import { config } from '../config.js';
import { createMaterial, clearGroup, updateCubeInScene, updateViewpointInScene, updateProjectedViewpointMarker, getCachedWorldVertices, safeDispose } from '../utils/three-utils.js';

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
    
    for (let t of [t1, t2]) {
        if (t > 0.001) {
            const point = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
            if (point.z <= hemisphereCenter.z) {
                return point;
            }
        }
    }
    return null;
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
    const circleMaterial = new THREE.MeshBasicMaterial({ color: config.colors.boundary, side: THREE.DoubleSide });
    const hemiBoundary = new THREE.Mesh(circleGeometry, circleMaterial);
    scene.add(hemiBoundary);
    return hemiBoundary;
}

export function updateHemisphericalProjection(scenes, groups, cube, viewpointSphere, hemisphere) {
    // Update cube and viewpoint positions using helper functions
    updateCubeInScene('hemi3D', cube, scenes.hemi3D);
    updateViewpointInScene('hemi3D', state.viewpointPosition, scenes.hemi3D);
    
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
    
    // Clear previous projections
    Object.values(groups.hemi2D).forEach(group => clearGroup(group));
    Object.values(groups.hemi3D).forEach(group => clearGroup(group));
    
    // Update projected viewpoint marker
    const hemisphereDir = hemisphereCenter.clone().sub(state.viewpointPosition).normalize();
    const viewpointOnHemisphere = intersectRayWithHemisphere(state.viewpointPosition, hemisphereDir, hemisphereCenter, state.hemisphereRadius);
    if (viewpointOnHemisphere) {
        const projected2D = postelProjection(viewpointOnHemisphere, hemisphereCenter, state.hemisphereRadius);
        updateProjectedViewpointMarker('hemi2D', projected2D.x, projected2D.y, scenes.hemi2D);
    }
    
    // Project cube vertices (use cached vertices for better performance)
    const worldVertices = getCachedWorldVertices(cube);
    const projectedVertices = [];

    // Draw projection lines and calculate hemisphere intersections
    worldVertices.forEach(worldVertex => {
        const rayDirection = worldVertex.clone().sub(state.viewpointPosition).normalize();
        
        const lineMat = createMaterial('ProjectionLineMaterial', { opacity: 0.3 });
        const extendedPoint = state.viewpointPosition.clone().add(rayDirection.clone().multiplyScalar(30));
        groups.hemi3D.projectionLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([state.viewpointPosition, extendedPoint]), lineMat));
        
        const hemisphereIntersection = intersectRayWithHemisphere(state.viewpointPosition, rayDirection, hemisphereCenter, state.hemisphereRadius);
        if (hemisphereIntersection) {
            const hemisphereLineMat = createMaterial('ProjectionLineMaterial', { color: 0x00ff00, opacity: 0.6 });
            groups.hemi3D.projectionLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([state.viewpointPosition, hemisphereIntersection]), hemisphereLineMat));
            
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

    const vanishingPointData = [
        { dir: dirX.normalize(), color: config.colors.vanishingPoint.red },
        { dir: dirY.normalize(), color: config.colors.vanishingPoint.green },
        { dir: dirZ.normalize(), color: config.colors.vanishingPoint.blue }
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
        const boundaryRadius = (Math.PI / 2) * state.hemisphereRadius;
        const edgeDirections = {
            '0,1': 0, '1,0': 0, '1,2': 1, '2,1': 1, '2,3': 0, '3,2': 0, '3,0': 1, '0,3': 1,
            '4,5': 0, '5,4': 0, '5,6': 1, '6,5': 1, '6,7': 0, '7,6': 0, '7,4': 1, '4,7': 1,
            '0,4': 2, '4,0': 2, '1,5': 2, '5,1': 2, '2,6': 2, '6,2': 2, '3,7': 2, '7,3': 2
        };
        
        const key = `${v1Index},${v2Index}`;
        let axisIndex = edgeDirections[key];
        if (axisIndex === undefined) return { vp: null, axisIndex: null };
        
        const posVP = vanishingPoints[axisIndex * 2];
        const negVP = vanishingPoints[axisIndex * 2 + 1];
        
        if (posVP && (posVP.x * posVP.x + posVP.y * posVP.y) <= boundaryRadius * boundaryRadius) {
            return { vp: posVP, axisIndex: axisIndex };
        }
        if (negVP && (negVP.x * negVP.x + negVP.y * negVP.y) <= boundaryRadius * boundaryRadius) {
            return { vp: negVP, axisIndex: axisIndex };
        }
        
        return { vp: null, axisIndex: axisIndex };
    }

    function getLighterColor(axisIndex) {
        const colors = [config.colors.guide.red, config.colors.guide.green, config.colors.guide.blue];
        return colors[axisIndex];
    }

    // Draw projected cube edges as circular arcs
    const edges = [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ];
    const projectedLineMaterial = new THREE.LineBasicMaterial({ color: config.colors.cubeEdge, linewidth: 2 });
    
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
                
                // Draw guide lines
                const guideColor = getLighterColor(vpResult.axisIndex);
                const guideMaterial = new THREE.LineBasicMaterial({ 
                    color: guideColor, 
                    opacity: 0.4, 
                    transparent: true,
                    linewidth: 1
                });
                
                const guide1 = createCircularArc(p1, vpResult.vp, p2, guideMaterial);
                const guide2 = createCircularArc(p2, vpResult.vp, p1, guideMaterial);
                
                groups.hemi2D.projectedCubeLines.add(guide1);
                groups.hemi2D.projectedCubeLines.add(guide2);
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