import { useRef } from 'react'
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../store'
import { ProjectionVisualizer } from './ProjectionVisualizer'

export function Scene({
    mode = 'linear'
}: {
    mode?: 'linear' | 'hemispherical'
}) {
    const { cubeRotation, viewpoint, radius } = useAppStore()
    const cubeRef = useRef<THREE.Mesh>(null)

    useFrame(() => {
        if (cubeRef.current) {
            // Apply rotation from store
            cubeRef.current.rotation.x = THREE.MathUtils.degToRad(cubeRotation.x)
            cubeRef.current.rotation.y = THREE.MathUtils.degToRad(cubeRotation.y)
            cubeRef.current.rotation.z = THREE.MathUtils.degToRad(cubeRotation.z)
        }
    })

    return (
        <>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />

            {/* High quality environment map */}
            <Environment preset="city" blur={0.8} />

            {/* The Cube Object */}
            <mesh ref={cubeRef} position={[0, 0, 0]} castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshPhysicalMaterial
                    color="#4f46e5" // Indigo-600
                    metalness={0.1}
                    roughness={0.2}
                    clearcoat={0.5}
                    clearcoatRoughness={0.1}
                />
            </mesh>

            {/* Soft Shadows */}
            <ContactShadows resolution={1024} scale={10} blur={2} opacity={0.5} far={10} color="#000000" />

            {/* Hemisphere Visualization */}
            {mode === 'hemispherical' && (
                <mesh
                    position={[useAppStore.getState().viewpoint.x, useAppStore.getState().viewpoint.y, useAppStore.getState().viewpoint.z]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    ref={(mesh) => {
                        if (mesh) {
                            // Keep position in sync with store (since using getState() only sets it initially if not re-rendered)
                            // Better to use useFrame or just key it to re-mount, or useFrame to update position.
                            // But here we are inside the Component, so it re-renders when store updates IF we select it.
                            // We are NOT selecting viewpoint in the component props, so it might not update.
                            // Let's select it.
                        }
                    }}
                >
                    <sphereGeometry args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.15} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Image Plane Visualization (Linear only) */}
            {mode === 'linear' && (
                <mesh
                    position={[viewpoint.x, viewpoint.y, viewpoint.z - radius]}
                    ref={(mesh) => {
                        // Ensure updates
                    }}
                >
                    <planeGeometry args={[radius * 2, radius * 2]} />
                    <meshBasicMaterial color="cyan" transparent opacity={0.1} side={THREE.DoubleSide} />
                    <lineSegments>
                        <edgesGeometry args={[new THREE.PlaneGeometry(radius * 2, radius * 2)]} />
                        <lineBasicMaterial color="cyan" opacity={0.5} transparent />
                    </lineSegments>
                </mesh>
            )}

            <ProjectionVisualizer mode={mode} />

            <OrbitControls makeDefault />
        </>
    )
}
