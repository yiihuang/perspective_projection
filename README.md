# Interactive 3D Cube Perspective Projection

An interactive web application that visualizes the principles of **perspective projection** by demonstrating how a 3D cube projects onto a 2D image plane. This educational tool helps users understand fundamental concepts in computer graphics, computer vision, and technical drawing.

## 🌐 **[🚀 Live Demo](https://yiihuang.github.io/perspective_projection/interactive_projection.html)**

**Try it now: https://yiihuang.github.io/perspective_projection/interactive_projection.html**

## 🎯 What This Application Demonstrates

This visualization shows the mathematical relationship between 3D objects and their 2D projections, including:

- **Perspective Projection**: How 3D points map to 2D coordinates through a viewpoint
- **Vanishing Points**: Where parallel lines in 3D appear to converge in 2D
- **Projection Lines**: The rays from the viewpoint through 3D points to the image plane
- **Local vs Global Rotations**: How object rotations affect perspective views

## 🚀 How to Run

### Option 1: Direct Browser Opening
```bash
open interactive_projection.html
```

### Option 2: Local HTTP Server (Recommended)
```bash
python3 -m http.server 8000
```
Then navigate to: `http://localhost:8000/interactive_projection.html`

## 🎮 Interactive Controls

### Mouse Controls
- **Left-drag in 3D view**: Rotate the cube around its local axes
- **Right-drag in 3D view**: Rotate the camera around the scene
- **Drag up/down in 2D view**: Zoom in/out on the 2D projection

### Slider Controls
- **Viewpoint Y**: Adjust the vertical position of the viewpoint (-10 to +10)
- **Viewpoint Z**: Move the viewpoint closer/farther from the scene (3 to 20)
- **3D Zoom**: Control the 3D camera distance (10 to 40)
- **Cube Rot X/Y/Z**: Precise control of cube rotation around local axes (-180° to +180°)

## 📊 Visual Elements

### 3D Scene (Left Panel)
- **Blue Cube**: The 3D object being projected (semi-transparent with visible edges)
- **Red Sphere**: The viewpoint/camera position
- **Blue Plane**: The image plane where projection occurs
- **Red Lines**: Projection rays from viewpoint through cube vertices
- **Grid**: Reference ground plane

### 2D Projection (Right Panel)
- **Blue Lines**: Projected cube edges on the image plane
- **Colored Circles**: Vanishing points for each axis (Red=X, Green=Y, Blue=Z)
- **Dashed Lines**: Extension lines showing how edges converge to vanishing points
- **Red Ring**: Projected viewpoint position
- **Blue Border**: Image plane boundary

## 🔬 Mathematical Concepts

### Perspective Projection Formula
For a 3D point `(x, y, z)` and viewpoint `(vx, vy, vz)`, the 2D projection `(x', y')` on an image plane at `z = IMAGE_PLANE_Z` is:

```
x' = (x - vx) * (IMAGE_PLANE_Z - vz) / (z - vz) + vx
y' = (y - vy) * (IMAGE_PLANE_Z - vz) / (z - vz) + vy
```

### Vanishing Points
Vanishing points occur where parallel lines in 3D converge in the 2D projection. They are calculated by projecting the direction vectors of the cube's edges onto the image plane.

### Local Axis Rotations
The application uses Three.js `rotateOnAxis()` method to ensure true local axis rotations, avoiding gimbal lock issues that occur with Euler angles.

## 🛠 Technical Implementation

### Technologies Used
- **Three.js**: 3D graphics rendering and scene management
- **HTML5 Canvas**: 2D rendering context
- **Vanilla JavaScript**: Interactive controls and mathematical calculations
- **CSS3**: Modern UI styling and responsive layout

### Key Features
- **Real-time Updates**: All changes immediately update both 3D and 2D views
- **Synchronized Controls**: Mouse interactions update slider values automatically
- **Responsive Design**: Adapts to different screen sizes with flexible layout
- **Mathematical Accuracy**: Precise perspective projection calculations

## 📚 Educational Applications

This tool is valuable for:
- **Computer Graphics Courses**: Understanding projection matrices and perspective
- **Computer Vision**: Camera models and image formation
- **Technical Drawing**: Perspective drawing principles
- **Mathematics**: 3D to 2D coordinate transformations
- **Art Education**: Understanding perspective in drawing and painting

## 🔧 Customization

### Modifying Parameters
Key parameters can be adjusted in the JavaScript code:
- `CUBE_SIZE`: Size of the 3D cube (default: 4)
- `IMAGE_PLANE_Z`: Position of the projection plane (default: 2)
- Slider ranges and step sizes
- Colors and visual styling

### Adding Features
The modular code structure allows for easy extensions:
- Additional 3D objects
- Different projection types (orthographic, etc.)
- Export functionality for projections
- Animation sequences

## 🐛 Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **WebGL Support**: Required for Three.js rendering
- **ES6 Features**: Uses modern JavaScript syntax

## 📖 Further Reading

- [Three.js Documentation](https://threejs.org/docs/)
- [Perspective Projection (Wikipedia)](https://en.wikipedia.org/wiki/3D_projection#Perspective_projection)
- [Computer Graphics: Principles and Practice](https://www.amazon.com/Computer-Graphics-Principles-Practice-3rd/dp/0321399528)
- [Multiple View Geometry](https://www.robots.ox.ac.uk/~vgg/hzbook/)

## 📄 License

This project is open source and available under the MIT License.

---

*Created for educational purposes to demonstrate fundamental concepts in 3D computer graphics and perspective projection.* 