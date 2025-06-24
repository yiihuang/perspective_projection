// Configuration and Constants
export const config = {
    // Cube parameters
    CUBE_SIZE: 4,
    
    // Default values
    DEFAULTS: {
        hemisphereRadius: 6,
        viewpointPosition: { x: 0, y: 2, z: 8 },
        cubeLocalRotation: { x: 0, y: 0, z: 0 },
        zoomLevel2D: 25,
        zoom3D: 16.5
    },
    
    // Performance settings
    PERFORMANCE: {
        targetFPS: 60,
        idleFPS: 30,
        idleTimeout: 1000, // ms
        debounceTimeout: 8, // ms
        frameInterval: 1000 / 60
    },
    
    // UI settings
    UI: {
        minWindowWidth: 200,
        minWindowHeight: 150,
        minVisibleWidth: 200,
        minVisibleHeight: 50
    },
    
    // Colors
    COLORS: {
        cube: 0x00aaff,
        cubeEdge: 0x0077cc,
        cubeEdges: 0x004466,
        viewpoint: 0xff0000,
        imagePlane: 0x0000ff,
        hemisphere: 0x0000ff,
        boundary: 0x6667ab,
        projectionLine: 0xff0000,
        vanishingPoint: {
            red: 0xff4136,
            green: 0x2ecc40,
            blue: 0x0074d9
        },
        guide: {
            red: 0xffaaaa,
            green: 0xaaffaa,
            blue: 0xaaaaff
        },
        vanishingPoints: {
            x: 0xff4136,
            y: 0x2ecc40,
            z: 0x0074d9
        },
        guideLines: {
            x: 0xffaaaa,
            y: 0xaaffaa,
            z: 0xaaaaff
        }
    }
}; 