import { create } from 'zustand';

interface AppState {
    // Viewpoint
    viewpoint: { x: number; y: number; z: number };
    setViewpoint: (v: Partial<{ x: number; y: number; z: number }>) => void;

    // Projection Config
    radius: number;
    setRadius: (r: number) => void;

    // Cube Orientation (Euler)
    cubeRotation: { x: number; y: number; z: number };
    setCubeRotation: (r: Partial<{ x: number; y: number; z: number }>) => void;

    // UI State
    showRays: boolean;
    setShowRays: (show: boolean) => void;
    activeWindow: 'linear3D' | 'linear2D' | 'hemi3D' | 'hemi2D' | null; // For mobile expansion
    setActiveWindow: (win: 'linear3D' | 'linear2D' | 'hemi3D' | 'hemi2D' | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
    viewpoint: { x: 0, y: 0, z: 5 },
    setViewpoint: (v) => set((state) => ({ viewpoint: { ...state.viewpoint, ...v } })),

    radius: 2.5, // Initial position in the middle (Viewpoint Z=5, Plane Z=2.5 implies r=2.5)
    setRadius: (r) => set({ radius: r }),

    cubeRotation: { x: 0, y: 0, z: 0 },
    setCubeRotation: (r) => set((state) => ({ cubeRotation: { ...state.cubeRotation, ...r } })),

    showRays: true,
    setShowRays: (show) => set({ showRays: show }),

    activeWindow: null,
    setActiveWindow: (win) => set({ activeWindow: win }),
}));
