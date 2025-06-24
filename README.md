# Interactive 3D Perspective Projection Suite

An interactive web application that visualizes the principles of **perspective projection** by demonstrating how a 3D cube projects onto different 2D surfaces. This educational tool helps users understand fundamental concepts in computer graphics, computer vision, and technical drawing by comparing **linear perspective** (planar projection) with **hemispherical perspective** (spherical projection).

## 🚀 Quick Start

### Run the Application
```bash
# Start local server (required for ES6 modules)
python3 -m http.server 8000

# Open in browser
http://localhost:8000/index.html
```

### Alternative: Node.js Server
```bash
npx http-server -p 8000
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

### Unified Parameters
- **Radius R**: Controls both hemisphere radius and image plane distance
- **Synchronized Viewpoint**: Same viewpoint position across both perspectives
- **Dynamic Scaling**: Image plane size (2R × 2R) matches hemisphere diameter

## 🏗️ Modern Architecture

This application features a **professional modular architecture** with:

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
│   │   ├── scene-manager.js - Three.js scene setup
│   │   └── objects.js - 3D object creation
│   ├── projections/
│   │   ├── linear-projection.js - Linear perspective math
│   │   ├── hemispherical-projection.js - Spherical projection math
│   │   └── projection-manager.js - Projection coordination
│   ├── ui/
│   │   ├── window-manager.js - Flexible window system
│   │   └── controls.js - Slider/input controls
│   ├── events/
│   │   └── mouse-handlers.js - Mouse interaction logic
│   ├── rendering/
│   │   └── renderer.js - Animation loop & performance
│   └── utils/
│       └── three-utils.js - Three.js helper functions
```

### Key Improvements
- **92% reduction** in HTML complexity (1943 → 156 lines)
- **Professional ES6 module system** with clean separation of concerns
- **Flexible window management** - drag, resize, show/hide windows
- **Enhanced UI controls** - sliders with numerical inputs
- **Comprehensive error handling** and debugging support
- **Performance optimizations** - smart caching and selective rendering

## 🎮 Interactive Features

### Window Management
- **Flexible Layout**: Drag windows anywhere on screen
- **Window Menu**: Toggle window visibility with checkmarks
- **Resizable Windows**: Adjust window sizes as needed
- **Professional UI**: Modern styling with gradients and shadows

### Enhanced Controls
- **Dropdown Controls**: Click "Controls ⚙️" to reveal/hide control panel
- **Dual Input Methods**: 
  - Sliders for visual adjustment
  - Number inputs for precise values
- **Bidirectional Sync**: Sliders and inputs update each other
- **Value Validation**: Automatic clamping to valid ranges

### Mouse Controls (Context-Sensitive)
- **Left-drag in 3D views**: Rotate the cube around its local axes
- **Right-drag in 3D views**: Rotate the camera around the scene
- **Drag/Wheel in 2D views**: Zoom in/out on the 2D projections
- **Window dragging**: Drag windows by their title bars

### Control Parameters
- **Viewpoint Y**: Adjust the vertical position of the viewpoint (-10 to +10)
- **Viewpoint Z**: Move the viewpoint closer/farther from the scene (3 to 20)
- **Radius R (Both)**: Controls hemisphere radius and image plane distance (1 to 15)
- **3D Zoom**: Control the 3D camera distance (10 to 40)
- **Cube Rot X/Y/Z**: Precise control of cube rotation around local axes (-180° to +180°)

## 📊 Visual Elements

### Four-Window Layout
- **Linear 3D Scene**: 3D visualization with traditional perspective
- **Linear 2D Projection**: Flat projection with straight lines
- **Hemispherical 3D Scene**: 3D visualization with spherical perspective
- **Hemispherical 2D Projection**: Curved projection with circular arcs

### 3D Scenes
- **Blue Cube**: The 3D object being projected (semi-transparent with visible edges)
- **Red Sphere**: The viewpoint/camera position
- **Blue Plane/Hemisphere**: The projection surface (plane or hemisphere)
- **Projection Lines**: Rays from viewpoint through cube vertices
- **Grid**: Reference ground plane

### 2D Projections

#### Linear Perspective
- **Blue Lines**: Projected cube edges (straight lines)
- **Light-colored Guide Lines**: Extensions from vertices to vanishing points
- **Fixed Reference Frame**: Viewpoint always at center, boundary fixed
- **Square Boundary**: 2R × 2R image plane boundary

#### Hemispherical Perspective
- **Blue Arcs**: Projected cube edges (circular arcs)
- **Light-colored Guide Arcs**: Extensions showing full circular paths to vanishing points
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

## 🛠 Technical Implementation

### Technologies Used
- **Three.js**: 3D graphics rendering and scene management
- **HTML5 Canvas**: 2D rendering context
- **ES6 Modules**: Modern JavaScript architecture
- **CSS Grid & Flexbox**: Responsive layout system
- **WebGL**: Hardware-accelerated 3D rendering

### Performance Features
- **Smart Caching**: Cached vertex calculations and materials
- **Selective Rendering**: Only render dirty viewports
- **Frame Rate Management**: Adaptive FPS based on activity
- **Memory Management**: Proper disposal of Three.js objects
- **Error Boundaries**: Comprehensive error handling

### Development Features
- **Module Hot Loading**: Easy development iteration
- **Debug Infrastructure**: Built-in debugging tools
- **Test Framework**: Module validation system
- **Clear Error Reporting**: Detailed error messages and stack traces

## 🧪 Testing & Debugging

### Testing Tools
- **Module Validator**: `test-modules.html` - Validates all ES6 imports
- **Browser Console**: Press F12 for detailed debugging
- **Performance Monitor**: Built-in FPS tracking

### Quick Test Checklist
1. **Load Test**: All 4 windows should appear with 3D graphics
2. **Controls Test**: Sliders and number inputs should sync
3. **Window Test**: Drag windows, toggle visibility
4. **Interaction Test**: Left-click cube, right-click camera
5. **Performance Test**: Smooth 60fps animation

For detailed testing instructions, see [TESTING_GUIDE.md](TESTING_GUIDE.md).

## 📚 Educational Applications

This tool is valuable for:

### Computer Graphics Courses
- **Projection Types**: Comparing planar vs spherical projections
- **Coordinate Transformations**: Understanding different mapping methods
- **Vanishing Point Theory**: How parallel lines converge differently

### Computer Vision
- **Camera Models**: Different lens types and distortion effects
- **Spherical Imaging**: Wide-angle and fisheye camera systems
- **Projection Geometry**: Mathematical foundations of image formation

### Mathematics Education
- **3D to 2D Mappings**: Different mathematical approaches to dimensionality reduction
- **Spherical Geometry**: Understanding curved surface projections
- **Trigonometry**: Practical applications of angular relationships

### Art and Design
- **Perspective Drawing**: Traditional vs wide-angle perspective effects
- **Architectural Visualization**: How different projection methods affect perception
- **Digital Art**: Understanding distortion in different projection systems

## 🔧 Customization

### Modifying Parameters
Key parameters can be adjusted in `js/config.js`:
- **CUBE_SIZE**: Size of the 3D cube
- **Color schemes**: Projection lines, vanishing points, etc.
- **Performance settings**: FPS limits, cache sizes
- **UI settings**: Window positions, control ranges

### Adding Features
The modular architecture allows for easy extensions:
- Additional 3D objects (spheres, pyramids, etc.)
- Different projection types (orthographic, cylindrical, etc.)
- Export functionality for projections
- Animation sequences
- Multiple viewpoints
- Custom projection surfaces

## 🐛 Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **WebGL Support**: Required for Three.js rendering
- **ES6 Module Support**: Required for the modular architecture
- **Performance**: Optimized for 60fps real-time interaction

## 📖 Documentation

- **[MODULARIZATION_REPORT.md](MODULARIZATION_REPORT.md)**: Detailed technical report on the modular architecture
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)**: Comprehensive testing instructions
- **[backup/README.md](backup/README.md)**: Information about archived legacy files

## 📖 Further Reading

### Projection Theory
- [Perspective Projection (Wikipedia)](https://en.wikipedia.org/wiki/3D_projection#Perspective_projection)
- [Spherical Perspective](https://en.wikipedia.org/wiki/Curvilinear_perspective)
- [Postel Projection](https://en.wikipedia.org/wiki/Azimuthal_equidistant_projection)

### Technical Documentation
- [Three.js Documentation](https://threejs.org/docs/)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [WebGL Fundamentals](https://webglfundamentals.org/)

## 📄 License

This project is open source and available under the MIT License.

---

*A modern, modular educational tool for understanding 3D perspective projection mathematics through interactive visualization. Features professional ES6 architecture with comprehensive testing and debugging support.* 