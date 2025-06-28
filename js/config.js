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
    },

    // Shared geometry mappings
    CUBE_MAPPINGS: {
        // Edge list for cube (pairs of vertex indices)
        edges: [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7],
        
        // Maps axis index to vertex indices for that axis
        edgeAxisMapping: {
            0: [0, 1, 2, 3, 4, 5, 6, 7], // X-axis edges (indices of vertices)
            1: [0, 3, 1, 2, 4, 7, 5, 6], // Y-axis edges
            2: [0, 4, 1, 5, 2, 6, 3, 7]  // Z-axis edges
        },
        
        // Maps edge pairs to axis indices
        edgeDirections: {
            '0,1': 0, '1,0': 0, '1,2': 1, '2,1': 1, '2,3': 0, '3,2': 0, '3,0': 1, '0,3': 1,
            '4,5': 0, '5,4': 0, '5,6': 1, '6,5': 1, '6,7': 0, '7,6': 0, '7,4': 1, '4,7': 1,
            '0,4': 2, '4,0': 2, '1,5': 2, '5,1': 2, '2,6': 2, '6,2': 2, '3,7': 2, '7,3': 2
        }
    }
}; 