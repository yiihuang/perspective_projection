import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { projectLinear, projectHemispherical, calculateHemisphericalVPs, getArcPointsAvoidingMiddle, getArcPointsThroughMiddle } from '../../lib/math/projections'
import { useAppStore } from '../../store'

const CUBE_VERTICES = [
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, 0.5, -0.5),
    new THREE.Vector3(-0.5, 0.5, -0.5),
    new THREE.Vector3(-0.5, -0.5, 0.5),
    new THREE.Vector3(0.5, -0.5, 0.5),
    new THREE.Vector3(0.5, 0.5, 0.5),
    new THREE.Vector3(-0.5, 0.5, 0.5),
];

const CUBE_EDGES = [
    [0, 1], [1, 2], [2, 3], [3, 0], // Back face
    [4, 5], [5, 6], [6, 7], [7, 4], // Front face
    [0, 4], [1, 5], [2, 6], [3, 7]  // Connecting lines
];

// Mapping edges to axis indices (0: x, 1: y, 2: z) based on standard cube indexing
const EDGE_AXIS_INDICES = [
    0, 1, 0, 1, // Back face edges
    0, 1, 0, 1, // Front face edges
    2, 2, 2, 2  // Connecting edges (Z)
];

export function TwoDView({ mode }: { mode: 'linear' | 'hemispherical' }) {
    const { cubeRotation, radius, viewpoint } = useAppStore()

    // Create stable viewpoint vector from store data
    const viewpointVector = useMemo(() => {
        return new THREE.Vector3(viewpoint.x, viewpoint.y, viewpoint.z);
    }, [viewpoint.x, viewpoint.y, viewpoint.z]);

    // Transform vertices based on rotation
    const transformedVertices = useMemo(() => {
        const euler = new THREE.Euler(
            THREE.MathUtils.degToRad(cubeRotation.x),
            THREE.MathUtils.degToRad(cubeRotation.y),
            THREE.MathUtils.degToRad(cubeRotation.z)
        );
        return CUBE_VERTICES.map(v => v.clone().applyEuler(euler));
    }, [cubeRotation]);

    const projections = useMemo(() => {
        return transformedVertices.map(v => {
            if (mode === 'linear') {
                return projectLinear(v, viewpointVector, radius);
            } else {
                return projectHemispherical(v, viewpointVector, radius);
            }
        });
    }, [transformedVertices, mode, radius, viewpointVector]);


    // Boundary Calculation
    const boundary = useMemo(() => {
        // Both Linear (if shape=circle, which is default) and Hemispherical use circular boundary
        // User requested "Image plane ... should be a disk of radius R"
        const boundaryRadius = (mode === 'hemispherical') ? (Math.PI / 2) * radius : radius;

        return (
            <mesh>
                <ringGeometry args={[boundaryRadius - 0.05, boundaryRadius, 64]} />
                <meshBasicMaterial color="#334155" side={THREE.DoubleSide} />
            </mesh>
        );
    }, [mode, radius]);

    // Vanishing Points (Linear Mode only)
    const linearVPs = useMemo(() => {
        if (mode !== 'linear') return [];

        const v0 = transformedVertices[0];
        const v1 = transformedVertices[1]; // X-axis neighbor
        const v3 = transformedVertices[3]; // Y-axis neighbor
        const v4 = transformedVertices[4]; // Z-axis neighbor

        // Directions of the cube's local axes in world space
        const axes = [
            { dir: v1.clone().sub(v0).normalize(), color: '#ef4444' }, // Red (Local X)
            { dir: v3.clone().sub(v0).normalize(), color: '#22c55e' }, // Green (Local Y)
            { dir: v4.clone().sub(v0).normalize(), color: '#3b82f6' }  // Blue (Local Z)
        ];

        return axes.map(axis => {
            if (Math.abs(axis.dir.z) < 0.0001) return null; // Parallel to image plane, VP at infinity

            // Calculate intersection with image plane relative to viewpoint
            // VP is where a line from viewpoint parallel to the edge direction hits the image plane.
            // Plane Z (relative to viewpoint) = -radius
            // Ray: Viewpoint (0,0,0) + t * dir
            // t * dir.z = -radius => t = -radius / dir.z

            const t = -radius / axis.dir.z;
            const x = axis.dir.x * t;
            const y = axis.dir.y * t;

            // Check finiteness
            if (!isFinite(x) || !isFinite(y)) return null;

            return { pos: new THREE.Vector3(x, y, 0.05), color: axis.color };
        }).filter(Boolean);
    }, [transformedVertices, mode, radius]);

    // Hemispherical VPs
    const hemiVPs = useMemo(() => {
        if (mode !== 'hemispherical') return [];
        return calculateHemisphericalVPs(transformedVertices, radius); // Calculates both inside/outside
    }, [transformedVertices, radius, mode]);

    const lines = useMemo(() => {
        const boundaryRadius = (Math.PI / 2) * radius;

        return CUBE_EDGES.map(([start, end]) => {
            const vStart = transformedVertices[start];
            const vEnd = transformedVertices[end];

            if (mode === 'linear') {
                const p1 = projectLinear(vStart, viewpointVector, radius);
                const p2 = projectLinear(vEnd, viewpointVector, radius);

                if (!isFinite(p1.x) || !isFinite(p1.y) || !isFinite(p2.x) || !isFinite(p2.y)) return null;

                return [
                    new THREE.Vector3(p1.x, p1.y, 0.05),
                    new THREE.Vector3(p2.x, p2.y, 0.05)
                ];
            } else {
                // Hemispherical: Use the same arc logic as guide lines for perfect alignment.
                // To disambiguate the "shorter" or "longer" arc, we project the 3D midpoint of the edge.
                const vMid = new THREE.Vector3().lerpVectors(vStart, vEnd, 0.5);
                const pMid = projectHemispherical(vMid, viewpointVector, radius);

                const p1 = projections[start];
                const p2 = projections[end];

                if (!isFinite(p1.x) || !isFinite(p1.y) || !isFinite(p2.x) || !isFinite(p2.y) || !isFinite(pMid.x) || !isFinite(pMid.y)) {
                    return null;
                }

                // Get arc points passing THROUGH the projected midpoint.
                // This will always select the correct segment of the circle defined by the edge.
                return getArcPointsThroughMiddle(p1, p2, pMid, boundaryRadius);
            }
        }).filter(Boolean) as THREE.Vector3[][];
    }, [transformedVertices, mode, radius, viewpointVector, hemiVPs, projections]);

    // Hemispherical Guide Arcs
    const hemiGuideArcs = useMemo(() => {
        if (mode !== 'hemispherical' || hemiVPs.length === 0) return [];

        const arcs: { points: THREE.Vector3[], color: string }[] = [];
        const boundaryRadius = (Math.PI / 2) * radius;

        CUBE_EDGES.forEach((edge, i) => {
            const v1Index = edge[0];
            const v2Index = edge[1];
            const axisIndex = EDGE_AXIS_INDICES[i];

            // Find VPs for this axis
            const insideVP = hemiVPs.find(v => v.axisIndex === axisIndex && v.type === 'inside');
            const outsideVP = hemiVPs.find(v => v.axisIndex === axisIndex && v.type === 'outside');

            if (!insideVP) return;

            const p1 = projections[v1Index];
            const p2 = projections[v2Index];

            if (isFinite(p1.x) && isFinite(p1.y) && isFinite(p2.x) && isFinite(p2.y)) {
                // Determine Near and Far vertices relative to Inside VP (the front-pointing one)
                const d1 = new THREE.Vector2(p1.x - insideVP.pos.x, p1.y - insideVP.pos.y).length();
                const d2 = new THREE.Vector2(p2.x - insideVP.pos.x, p2.y - insideVP.pos.y).length();

                let near = p1, far = p2;
                if (d2 < d1) {
                    near = p2;
                    far = p1;
                }

                // Arc 1: From "Near" vertex to Inside VP (avoids the edge/far vertex)
                const insidePoints = getArcPointsAvoidingMiddle(near, insideVP.pos, far, boundaryRadius);
                if (insidePoints.length > 0) {
                    arcs.push({ points: insidePoints, color: insideVP.color });
                }

                // Arc 2: From "Far" vertex to Outside VP (avoids the edge/near vertex)
                if (outsideVP) {
                    const outsidePoints = getArcPointsAvoidingMiddle(far, outsideVP.pos, near, boundaryRadius);
                    if (outsidePoints.length > 0) {
                        arcs.push({ points: outsidePoints, color: outsideVP.color });
                    }
                }
            }
        });

        return arcs;
    }, [hemiVPs, projections, mode, radius]);

    return (
        <group>
            {/* Helper Grid */}
            <gridHelper args={[20, 20]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.1]} />

            {/* Projection Boundary */}
            {boundary}

            {/* Linear: Vanishing Points & Guides */}
            {linearVPs.map((vp, i) => (
                vp && (
                    <group key={`lin-vp-${i}`}>
                        <mesh position={vp.pos}>
                            <circleGeometry args={[0.2, 32]} />
                            <meshBasicMaterial color={vp.color} />
                        </mesh>
                        {Math.abs(vp.pos.x) < 50 && Math.abs(vp.pos.y) < 50 && projections.map((p, j) => (
                            isFinite(p.x) && isFinite(p.y) && (
                                <Line
                                    key={`guide-${i}-${j}`}
                                    points={[new THREE.Vector3(p.x, p.y, 0.04), vp.pos]}
                                    color={vp.color}
                                    transparent opacity={0.15} lineWidth={1}
                                />
                            )
                        ))}
                    </group>
                )
            ))}

            {/* Hemi: Vanishing Points */}
            {hemiVPs.map((vp, i) => (
                <mesh key={`hemi-vp-${i}`} position={[vp.pos.x, vp.pos.y, 0.1]}>
                    <circleGeometry args={[0.15, 32]} />
                    <meshBasicMaterial color={vp.color} transparent opacity={vp.type === 'outside' ? 0.3 : 0.8} />
                </mesh>
            ))}

            {/* Hemi: Guide Arcs */}
            {hemiGuideArcs.map((arc, i) => (
                <Line
                    key={`hemi-guide-${i}`}
                    points={arc.points}
                    color={arc.color}
                    transparent opacity={0.15} lineWidth={1}
                />
            ))}

            {/* Projected Lines */}
            {lines.map((points, i) => (
                <Line
                    key={`line-${i}`}
                    points={points}
                    color={mode === 'linear' ? '#4ade80' : '#f472b6'} // Green vs Pink
                    lineWidth={3}
                />
            ))}

            {/* Projected Vertices */}
            {projections.map((p, i) => (
                isFinite(p.x) && isFinite(p.y) && (
                    <mesh key={`vert-${i}`} position={[p.x, p.y, 0.1]}>
                        <circleGeometry args={[0.08, 16]} />
                        <meshBasicMaterial color="#cbd5e1" />
                    </mesh>
                )
            ))}
        </group>
    )
}
