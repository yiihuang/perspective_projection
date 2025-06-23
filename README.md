# Interactive 3D Perspective Projection Suite

An interactive web application suite that visualizes the principles of **perspective projection** by demonstrating how a 3D cube projects onto different 2D surfaces. This educational tool helps users understand fundamental concepts in computer graphics, computer vision, and technical drawing by comparing **linear perspective** (planar projection) with **hemispherical perspective** (spherical projection).

## 🌐 **Live Demos**

- **[🚀 Combined Application](https://yiihuang.github.io/perspective_projection/combined_perspective.html)** - Side-by-side comparison of both projection types
- **[📐 Linear Perspective](https://yiihuang.github.io/perspective_projection/linear_projection.html)** - Traditional planar projection
- **[🌍 Hemispherical Perspective](https://yiihuang.github.io/perspective_projection/hemispherical_projection.html)** - Spherical projection with Postel mapping

## 🎯 What This Application Suite Demonstrates

This visualization suite shows the mathematical relationships between 3D objects and their 2D projections across different projection surfaces:

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

## 🚀 How to Run

### Option 1: Direct Browser Opening
```bash
# Combined application (recommended)
open combined_perspective.html

# Individual applications
open linear_projection.html
open hemispherical_projection.html
```

### Option 2: Local HTTP Server (Recommended)
```bash
python3 -m http.server 8000
```
Then navigate to:
- Combined: `http://localhost:8000/combined_perspective.html`
- Linear: `http://localhost:8000/linear_projection.html`
- Hemispherical: `http://localhost:8000/hemispherical_projection.html`

## 🎮 Interactive Controls

### Mouse Controls (Context-Sensitive)
- **Left-drag in 3D views**: Rotate the cube around its local axes
- **Right-drag in 3D views**: Rotate the camera around the scene
- **Drag/Wheel in 2D views**: Zoom in/out on the 2D projections
- **Slider areas**: Protected from drag interactions

### Slider Controls
- **Viewpoint Y**: Adjust the vertical position of the viewpoint (-10 to +10)
- **Viewpoint Z**: Move the viewpoint closer/farther from the scene (3 to 20)
- **Radius R (Both)**: Controls hemisphere radius and image plane distance (1 to 15)
- **3D Zoom**: Control the 3D camera distance (10 to 40)
- **Cube Rot X/Y/Z**: Precise control of cube rotation around local axes (-180° to +180°)

## 📊 Visual Elements

### Combined Application (2×2 Grid)
- **Top Row**: Linear perspective (3D scene + 2D projection)
- **Bottom Row**: Hemispherical perspective (3D scene + 2D projection)
- **Synchronized Parameters**: All views update simultaneously

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
- **Vanilla JavaScript**: Interactive controls and mathematical calculations
- **CSS Grid**: 2×2 layout for combined application
- **WebGL**: Hardware-accelerated 3D rendering

### Key Features
- **Real-time Synchronization**: All views update simultaneously
- **Context-Sensitive Interaction**: Different mouse behaviors per window type
- **Mathematical Accuracy**: Precise projection calculations for both methods
- **Dynamic Geometry**: Surfaces resize/reposition based on parameters
- **Memory Management**: Proper disposal of geometries during updates
- **Responsive Design**: Adapts to different screen sizes

### Advanced Interactions
- **Dual 3D Interactions**: Left-click (cube rotation) + Right-click (scene rotation)
- **Protected Controls**: Slider interactions don't trigger rotations
- **Visual Feedback**: Cursor changes indicate interaction types
- **Zoom Controls**: Mouse wheel and drag support for 2D views

## 📚 Educational Applications

This tool suite is valuable for:

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
Key parameters can be adjusted in the JavaScript code:
- `CUBE_SIZE`: Size of the 3D cube (default: 4)
- `hemisphereRadius`: Initial hemisphere radius (default: 6)
- Slider ranges and step sizes
- Colors and visual styling
- Arc segment count for smoothness

### Adding Features
The modular code structure allows for easy extensions:
- Additional 3D objects (spheres, pyramids, etc.)
- Different projection types (orthographic, cylindrical, etc.)
- Export functionality for projections
- Animation sequences
- Multiple viewpoints
- Custom projection surfaces

## 🐛 Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **WebGL Support**: Required for Three.js rendering
- **ES6 Features**: Uses modern JavaScript syntax
- **Performance**: Optimized for 60fps real-time interaction

## 📖 Further Reading

### Projection Theory
- [Perspective Projection (Wikipedia)](https://en.wikipedia.org/wiki/3D_projection#Perspective_projection)
- [Spherical Perspective](https://en.wikipedia.org/wiki/Curvilinear_perspective)
- [Postel Projection](https://en.wikipedia.org/wiki/Azimuthal_equidistant_projection)

### Technical Documentation
- [Three.js Documentation](https://threejs.org/docs/)
- [Computer Graphics: Principles and Practice](https://www.amazon.com/Computer-Graphics-Principles-Practice-3rd/dp/0321399528)
- [Multiple View Geometry](https://www.robots.ox.ac.uk/~vgg/hzbook/)

### Mathematical Background
- [Projective Geometry](https://en.wikipedia.org/wiki/Projective_geometry)
- [Spherical Trigonometry](https://en.wikipedia.org/wiki/Spherical_trigonometry)
- [Coordinate System Transformations](https://en.wikipedia.org/wiki/Transformation_matrix)

## 📄 License

This project is open source and available under the MIT License.

---

*Created for educational purposes to demonstrate fundamental concepts in 3D computer graphics, perspective projection, and spherical geometry. The suite provides comprehensive tools for understanding how different projection methods affect the visualization of 3D objects in 2D space.* 