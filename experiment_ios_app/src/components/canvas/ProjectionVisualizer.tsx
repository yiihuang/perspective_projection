import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { projectLinear, projectHemispherical } from '../../lib/math/projections'
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

// Edges defined by vertex indices
const CUBE_EDGES = [
    [0, 1], [1, 2], [2, 3], [3, 0], // Back face
    [4, 5], [5, 6], [6, 7], [7, 4], // Front face
    [0, 4], [1, 5], [2, 6], [3, 7]  // Connecting lines
];

export function ProjectionVisualizer({ mode }: { mode: 'linear' | 'hemispherical' }) {
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

    // Calculate projected points (2D coordinates)
    const projections = useMemo(() => {
        return transformedVertices.map(v => {
            if (mode === 'linear') {
                return projectLinear(v, viewpointVector, radius);
            } else {
                return projectHemispherical(v, viewpointVector, radius);
            }
        });
    }, [transformedVertices, mode, radius, viewpointVector]);

    // Create edge lines for the projection (Linear only for now, on the Image Plane)
    const projectedEdgeLines = useMemo(() => {
        if (mode !== 'linear') return [];

        return CUBE_EDGES.map(([start, end]) => {
            const p1_2d = projections[start];
            const p2_2d = projections[end];

            // Reconstruct 3D position on the image plane (z = vp.z - radius)
            const z = viewpointVector.z - radius;
            const p1_3d = new THREE.Vector3(viewpointVector.x + p1_2d.x, viewpointVector.y + p1_2d.y, z);
            const p2_3d = new THREE.Vector3(viewpointVector.x + p2_2d.x, viewpointVector.y + p2_2d.y, z);

            return [p1_3d, p2_3d];
        }).filter(Boolean) as THREE.Vector3[][];
    }, [projections, mode, radius, viewpointVector]);

    // Intersection Points (Vertices on the plane/sphere)
    const intersectionPoints = useMemo(() => {
        const points = transformedVertices.map((v, i) => {
            if (mode === 'linear') {
                // Linear: point on plane
                const p2d = projections[i];
                const z = viewpointVector.z - radius;
                return new THREE.Vector3(viewpointVector.x + p2d.x, viewpointVector.y + p2d.y, z);
            } else {
                // Hemispherical: intersection with sphere of radius R at viewpoint
                const direction = v.clone().sub(viewpointVector).normalize();
                return viewpointVector.clone().add(direction.multiplyScalar(radius));
            }
        });

        // Debug logging
        if (mode === 'hemispherical' && points.length > 0) {
            console.log('Hemi Intersection 0:', points[0].toArray(), 'Viewpoint:', viewpointVector.toArray(), 'Radius:', radius);
        }

        return points;
    }, [transformedVertices, projections, mode, radius, viewpointVector]);

    return (
        <group>
            {/* Draw Rays from Viewpoint to Vertices */}
            {transformedVertices.map((v, i) => (
                <Line
                    key={`ray-${i}`}
                    points={[viewpointVector, v]}
                    color="red"
                    opacity={0.5}
                    transparent
                    lineWidth={1}
                />
            ))}

            {/* Draw Projected Edges (Linear 3D only) */}
            {projectedEdgeLines.map((points, i) => (
                <Line
                    key={`proj-edge-${i}`}
                    points={points}
                    color="cyan"
                    lineWidth={2}
                />
            ))}

            {/* Draw Intersection Markers */}
            {intersectionPoints.map((v, i) => (
                <mesh key={`marker-${i}`} position={v}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshBasicMaterial color="#ffff00" depthTest={false} transparent opacity={0.8} />
                </mesh>
            ))}

            {/* Linear Image Plane Visualization */}
            {mode === 'linear' && (
                <group position={[viewpointVector.x, viewpointVector.y, viewpointVector.z - radius]}>
                    {/* The Disk Plane */}
                    <mesh rotation={[0, 0, 0]}>
                        <circleGeometry args={[radius, 64]} />
                        <meshBasicMaterial color="blue" transparent opacity={0.1} side={THREE.DoubleSide} />
                    </mesh>
                    {/* The Border Ring */}
                    <mesh rotation={[0, 0, 0]}>
                        <ringGeometry args={[radius - 0.05, radius, 64]} />
                        <meshBasicMaterial color="blue" side={THREE.DoubleSide} />
                    </mesh>
                </group>
            )}
        </group>
    )
}
