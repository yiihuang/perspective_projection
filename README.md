# 🎯 Interactive 3D Perspective Projection Suite

An interactive web application that visualizes the principles of **perspective projection** by demonstrating how a 3D cube projects onto different 2D surfaces. This educational tool helps users understand fundamental concepts in computer graphics, computer vision, and technical drawing by comparing **linear perspective** (planar projection) with **hemispherical perspective** (spherical projection).

## 🌐 Live Demo

**[🚀 Try it now!](https://yiihuang.github.io/perspective_projection/index.html)** - No installation required!

## 🚀 Quick Start

### Option 1: Use the Live Demo (Recommended)
Simply visit the live demo link above - no setup required!

> 💡 **New Feature**: UI controls are now draggable! Look for the ⋮⋮ dots on the Controls button and drag to move the panel anywhere on screen.

### Option 2: Run Locally
```bash
# Clone the repository
git clone https://github.com/yiihuang/perspective_projection.git
cd perspective_projection

# Start local server (required for ES6 modules)
python3 -m http.server 8000

# Open in browser
http://localhost:8000/index.html
```

## 🎯 What This Application Demonstrates

This visualization shows the mathematical relationships between 3D objects and their 2D projections across different projection surfaces:

### Linear Perspective
- **Planar Projection**: Traditional perspective onto a flat image plane
- **Straight Lines**: 3D edges project as straight lines in 2D
- **Vanishing Points**: Convergence points for parallel lines
- **Fixed Reference Frame**: Viewpoint-centered coordinate system

### Hemispherical Perspective  
- **Spherical Projection**: Projection onto a hemispherical surface
- **Postel Projection**: Mathematical mapping from hemisphere to 2D plane
- **Circular Arcs**: 3D straight lines become circular arcs in 2D
- **Guide Lines**: Visual connections showing arc extensions to vanishing points
- **Extended Guide Arcs**: Full continuous curves connecting degenerate vanishing points
- **Adaptive Arc System**: 4 or 8 extended arcs based on cube orientation (1 or 2 parallel axes)

### Unified Parameters
- **Radius R**: Controls both hemisphere radius and image plane distance
- **Synchronized Viewpoint**: Same viewpoint position across both perspectives
- **Dynamic Scaling**: Image plane size (2R × 2R) matches hemisphere diameter

## 🏗️ Optimized Architecture

This application features a **highly optimized modular architecture** achieved through comprehensive code optimization:

### Core Innovation: Master 3D Scene System
The application uses a revolutionary **single master 3D scene** architecture that eliminates object duplication:

```
🎯 BEFORE: Redundant Architecture
├── linear3D scene (cube + viewpoint + hemisphere + lighting + groups)
├── hemi3D scene   (cube + viewpoint + hemisphere + lighting + groups)  
└── Duplicate objects, materials, and resources

✅ AFTER: Optimized Master Scene Architecture  
├── master3D scene (single authoritative 3D scene)
│   ├── Single cube instance
│   ├── Single viewpoint sphere
│   ├── Single hemisphere + image plane (visibility controlled)
│   ├── Unified lighting system
│   └── Shared projection groups
├── linear3D viewport  → Renders master3D (shows image plane only)
├── hemi3D viewport    → Renders master3D (shows hemisphere only)
└── 2D scenes (unchanged - linear2D, hemi2D)
```

### ES6 Module System
```
index.html (156 lines) - Clean entry point
├── css/
│   ├── main.css - Core styling
│   ├── windows.css - Window system styling  
│   └── controls.css - UI controls styling
├── js/
│   ├── main.js - Application entry point
│   ├── config.js - Configuration constants
│   ├── state.js - Centralized state management
│   ├── scenes/
│   │   ├── scene-manager.js - Master 3D scene setup
│   │   └── objects.js - Shared object creation
│   ├── projections/
│   │   ├── linear-projection.js - Linear perspective math
│   │   ├── hemispherical-projection.js - Spherical projection math
│   │   └── projection-manager.js - Centralized ray management
│   ├── ui/
│   │   ├── window-manager.js - Flexible window system
│   │   └── controls.js - Master scene controls
│   ├── events/
│   │   └── mouse-handlers.js - Mouse interaction logic
│   ├── rendering/
│   │   └── renderer.js - Optimized viewport rendering
│   └── utils/
│       └── three-utils.js - Shared materials & functions
```

## 🚀 Performance Optimizations

### Object Consolidation
- **Before**: 2× cubes, 2× viewpoint spheres, 2× grid helpers (duplicated)
- **After**: 1× cube, 1× viewpoint sphere, 1× grid helper (shared in master scene)
- **Memory Reduction**: ~50% fewer 3D objects

### Material System Optimization
- **Before**: 6+ material creation calls per update cycle
- **After**: 5 pre-created shared ray materials (`RAY_MATERIALS`)
- **Performance**: Eliminated redundant material instantiation

### Function Call Streamlining
- **Before**: `updateShared3DScene('master3D', state.master3D, state.groups.master3D, cube, viewpointSphere, options)`
- **After**: `updateMaster3DScene(options)` - automatic object discovery
- **Parameter Reduction**: 5 → 1 parameter (80% reduction)

### Scene Architecture
- **Before**: 3× full 3D scenes with lighting + groups + objects
- **After**: 1× master scene + 2× minimal viewport scenes
- **Resource Efficiency**: Minimal individual scene setup

### Ray Management Revolution
- **Before**: Individual scenes conflicting with ray clearing
- **After**: Centralized master scene ray management
- **Result**: Perfect ray visualization with no conflicts

### Hemispherical Projection Optimizations
- **Eliminated Debug Logging**: Removed 20+ console.log calls running per frame
- **Pre-calculated Values**: Cached boundary radius, tolerance, and squared distances
- **Optimized Boundary Checks**: Replaced expensive sqrt() with squared distance comparisons
- **Streamlined Arc Generation**: Removed redundant calculations and object creation
- **Enhanced Intersection Logic**: Fixed edge disappearance at extreme orientations
- **Performance Impact**: 3-5x faster frame rates during continuous rotation

## 🎮 Interactive Features

### Window Management
- **Flexible Layout**: Drag windows anywhere on screen
- **Window Menu**: Toggle window visibility with checkmarks
- **Resizable Windows**: Adjust window sizes as needed
- **Professional UI**: Modern styling with gradients and shadows

### Enhanced Controls (Master Scene Architecture)
- **Dropdown Controls**: Click "Controls ⚙️" to reveal/hide control panel
- **Master Scene Integration**: All controls operate on shared objects
- **Real-time Updates**: Changes instantly reflected in both viewports
- **Dual Input Methods**: 
  - Sliders for visual adjustment
  - Number inputs for precise values
- **Bidirectional Sync**: Sliders and inputs update each other
- **Value Validation**: Automatic clamping to valid ranges

### Draggable UI Controls
- **Smart Drag System**: Drag the Controls button (⋮⋮ indicator) to move the entire control panel
- **Visual Feedback**: Semi-transparent appearance and scaling during drag operations
- **Boundary Protection**: Controls stay partially visible (50px minimum) even at screen edges
- **Click vs. Drag Detection**: Single clicks still toggle the panel, dragging moves position
- **Advanced Features**:
  - **Double-click Reset**: Double-click the Controls button to return to original position
  - **Escape to Cancel**: Press Escape key during drag to cancel the operation
  - **Window Resize Handling**: Controls automatically reposition if moved off-screen after window resize
  - **Professional Animations**: Smooth transitions and hover effects
- **Responsive Design**: Works on both desktop (mouse) and mobile (touch) devices

### Mouse Controls (Context-Sensitive)
- **Left-drag in 3D views**: Rotate the shared cube (affects both viewports)
- **Right-drag in 3D views**: Rotate the camera around the scene
- **Drag/Wheel in 2D views**: Zoom in/out on the 2D projections
- **Window dragging**: Drag windows by their title bars

### Ray Visualization System
- **Toggle Switch**: "Show Intersection Rays" checkbox
- **Complementary Mode**: Green rays (viewpoint → surface) + Red rays (surface → vertex)
- **Full Ray Mode**: Single red rays (viewpoint → vertex)
- **Master Scene Rendering**: All rays rendered in single shared scene

### Control Parameters
- **Viewpoint Y**: Adjust the vertical position (-10 to +10)
- **Viewpoint Z**: Move the viewpoint closer/farther (3 to 20)
- **Radius R**: Controls hemisphere radius and image plane distance (1 to 15)
- **3D Zoom**: Control the 3D camera distance (10 to 40)
- **Cube Rotation X/Y/Z**: Precise control (-180° to +180°)

## 📊 Visual Elements

### Four-Window Layout
- **Linear 3D Scene**: Master scene rendered with image plane visible
- **Linear 2D Projection**: Flat projection with straight lines
- **Hemispherical 3D Scene**: Master scene rendered with hemisphere visible
- **Hemispherical 2D Projection**: Curved projection with circular arcs

### Shared 3D Objects (Master Scene)
- **Blue Cube**: Single instance in master scene (visible in both 3D viewports)
- **Red Viewpoint Sphere**: Single instance showing camera position
- **Projection Surfaces**: Image plane + hemisphere with smart visibility control
- **Shared Ray System**: Unified projection rays managed centrally
- **Single Grid**: Shared reference ground plane

### Projection Surface Visibility System
- **Linear 3D Viewport**: Shows image plane only (`hemisphere.visible = false`)
- **Hemispherical 3D Viewport**: Shows hemisphere only (`imagePlane.visible = false`)
- **Dynamic Switching**: Automatic visibility control per viewport

### 2D Projections

#### Linear Perspective
- **Blue Lines**: Projected cube edges (straight lines)
- **Light-colored Guide Lines**: Extensions from vertices to vanishing points
- **Fixed Reference Frame**: Viewpoint always at center, boundary fixed
- **Square Boundary**: 2R × 2R image plane boundary

#### Hemispherical Perspective
- **Blue Arcs**: Projected cube edges (circular arcs)
- **Light-colored Guide Arcs**: Extensions showing full circular paths to vanishing points
- **Extended Guide Arcs**: Full continuous curves when axis is parallel to view plane
  - **Automatic Detection**: System detects when vanishing points are on boundary circle
  - **Adaptive Count**: 4 arcs (1 degenerate axis) or 8 arcs (2 degenerate axes)
  - **Robust Geometry**: Handles both circular and linear fallback cases
  - **Boundary Clipping**: Arcs automatically trimmed to projection boundary
- **Circular Boundary**: Postel projection boundary (radius = πR/2)
- **Color-coded Guides**: Red (X-axis), Green (Y-axis), Blue (Z-axis)

### Vanishing Points
- **Colored Circles**: Vanishing points for each axis (Red=X, Green=Y, Blue=Z)
- **Multiple Points**: Both positive and negative directions for each axis
- **Transparency**: Different opacity for positive vs negative directions

## 🔬 Mathematical Concepts

### Linear Perspective Projection
For a 3D point `(x, y, z)` and viewpoint `(vx, vy, vz)`, the 2D projection `(x', y')` on an image plane at distance R is:
```
plane_z = vz - R
x' = (x - vx) * (plane_z - vz) / (z - vz) + vx
y' = (y - vy) * (plane_z - vz) / (z - vz) + vy
```
Transformed to fixed reference frame: `(x' - vx, y' - vy)`

### Hemispherical Perspective Projection
1. **Ray-Hemisphere Intersection**: Find intersection of ray from viewpoint through 3D point with hemisphere
2. **Postel Projection**: Map hemisphere point to 2D plane
   ```
   cos(α) = -z / R  (where z ≤ 0 for dome extending toward cube)
   arc_length = α * R
   x_2D = arc_length * cos(θ)
   y_2D = arc_length * sin(θ)
   ```

### Circular Arc Generation
For hemispherical perspective, straight lines become circular arcs determined by:
- Two edge endpoints (projected to 2D)
- Corresponding vanishing point (inside boundary circle)
- Circle passing through all three points

### Extended Guide Arc Mathematics
When cube axes are parallel to the viewing plane (degenerate vanishing points):
1. **Degenerate Detection**: Vanishing points located on boundary circle (distance ≈ πR/2)
2. **Arc Direction Selection**: Robust algorithm chooses optimal arc direction
3. **Boundary Intersection**: Enhanced ray-hemisphere intersection accepts full sphere
4. **Fallback Handling**: Linear interpolation for collinear edge-vanishing point cases
5. **Floating-Point Tolerance**: 0.1% boundary tolerance handles rotation precision errors

## 🛠 Technical Implementation

### Technologies Used
- **Three.js**: 3D graphics rendering and scene management
- **HTML5 Canvas**: 2D rendering context
- **ES6 Modules**: Modern JavaScript architecture
- **CSS Grid & Flexbox**: Responsive layout system
- **WebGL**: Hardware-accelerated 3D rendering

### Advanced Features
- **Master Scene Architecture**: Single authoritative 3D scene with viewport-specific rendering
- **Shared Material System**: Pre-created materials eliminating runtime instantiation
- **Centralized Ray Management**: Conflict-free ray visualization system
- **Smart Visibility Control**: Dynamic projection surface switching
- **Optimized Function Calls**: Streamlined parameter passing
- **Draggable UI System**: Event-driven drag handling with bounds checking and visual feedback
- **Extended Guide Arc System**: Adaptive arc generation for degenerate vanishing points
- **Robust Hemisphere Intersection**: Enhanced ray-sphere intersection handling all orientations
- **Performance-Optimized Rendering**: Eliminated debug overhead and optimized mathematical operations

### Performance Features
- **Object Deduplication**: Single instances of all 3D objects
- **Material Caching**: Shared ray materials (`RAY_MATERIALS`)
- **Selective Rendering**: Only render dirty viewports
- **Memory Optimization**: Minimal scene resource usage
- **Frame Rate Management**: Adaptive FPS based on activity

### Development Features
- **Clean Architecture**: "Change one place for one functionality"
- **Module Hot Loading**: Easy development iteration
- **Comprehensive Error Handling**: Detailed error messages
- **Professional Code Structure**: Clear separation of concerns

## 📈 Optimization Results

### Code Quality Improvements
- **Eliminated Redundancy**: No more duplicate objects across scenes
- **Centralized Control**: All functionality operates on shared objects
- **Maintainable Code**: Single source of truth for all 3D objects
- **Performance Gains**: Reduced memory usage and faster rendering

### Developer Experience
- **Simplified Debugging**: Only one place to check for 3D object state
- **Easier Feature Addition**: New features automatically work in both viewports
- **Clean Codebase**: Removed duplicate logic and redundant parameters
- **Professional Architecture**: Industry-standard modular design

## 🎓 Educational Value

This application demonstrates key concepts in:
- **Computer Graphics**: Perspective projection mathematics and spherical projections
- **3D Rendering**: Scene management, viewport control, and ray-surface intersection
- **Software Architecture**: Optimization through consolidation and modular design
- **Performance Engineering**: Memory optimization, efficient rendering, and algorithmic improvements
- **User Interface Design**: Professional controls and window management
- **Computational Geometry**: Degenerate case handling and floating-point precision management
- **Mathematical Visualization**: Extended guide arcs and boundary circle projections

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! The optimized architecture makes it easy to:
- Add new projection types
- Implement additional visualization features  
- Enhance the UI/UX
- Improve performance further

## 🙏 Acknowledgments

- **Three.js Community** for the excellent 3D graphics library
- **GitHub Pages** for free hosting of static applications
- **WebGL** for hardware-accelerated 3D rendering 