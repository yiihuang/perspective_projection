# 🧪 Interactive Testing Guide - Perspective Visualization

## 📋 Quick Start Testing Checklist

### 1. **Setup & Launch**
```bash
# Start HTTP server (required for ES6 modules)
python3 -m http.server 8000

# Open application
http://localhost:8000/index.html
```

**⚠️ Important**: ES6 modules require HTTP server - opening `index.html` directly will fail!

### 2. **Initial Load Test**
**URL**: `http://localhost:8000/index.html`

✅ **Expected**: 4 windows should appear in default layout:
- **Top Left**: Linear 3D Scene
- **Top Right**: Linear 2D Projection  
- **Bottom Left**: Hemispherical 3D Scene
- **Bottom Right**: Hemispherical 2D Projection

---

## 🎮 Interactive Features to Test

### **A. Window Management System** 
1. **Window Menu**: Click "Window" button (top-left)
   - ✅ Dropdown menu should appear with 4 items
   - ✅ Each item should have a checkmark (✓) indicating visibility
   - ✅ Click items to toggle window visibility
   - ✅ Checkmarks should update correctly

2. **Window Dragging**:
   - ✅ Drag windows by their title bars
   - ✅ Windows should move smoothly
   - ✅ Windows should stay within screen bounds
   - ✅ Other windows should not be affected

3. **Window Controls**:
   - ✅ Close buttons (×) should hide windows
   - ✅ Hidden windows should reappear via Window menu
   - ✅ Windows should remember their positions

### **B. Enhanced Controls Panel** 
1. **Open Controls**: Click "Controls ⚙️" button (top-right)
   - ✅ Control panel should slide down with backdrop blur effect
   - ✅ Click button again to hide controls

2. **Dual Control System**:
   - ✅ **Sliders**: Drag to adjust values visually
   - ✅ **Number Inputs**: Type precise values directly
   - ✅ **Bidirectional Sync**: Changing slider updates number input and vice versa
   - ✅ **Value Validation**: Invalid values should be clamped to valid ranges

3. **Test Each Control**:
   - ✅ **Viewpoint Y** (-10 to 10): Moves viewpoint up/down
   - ✅ **Viewpoint Z** (3 to 20): Moves viewpoint forward/back
   - ✅ **Radius R** (1 to 15): Changes hemisphere size and image plane distance
   - ✅ **Cube Rot X/Y/Z** (-180 to 180): Rotates cube around local axes
   - ✅ **3D Zoom** (10 to 40): Changes camera distance

---

### **C. 3D Scene Interaction**
**In Linear 3D and Hemispherical 3D windows**:

1. **Cube Rotation** (Left-click + drag):
   - ✅ Should rotate the blue cube smoothly
   - ✅ Rotation sliders should update automatically
   - ✅ Both 3D views should show same cube rotation
   - ✅ Projections should update in real-time

2. **Camera Rotation** (Right-click + drag):
   - ✅ Should rotate camera around scene center
   - ✅ Grid and objects should move accordingly
   - ✅ Right-click context menu should be disabled
   - ✅ Viewpoint sphere should remain visible

---

### **D. 2D Projection Interaction**
**In Linear 2D and Hemispherical 2D windows**:

1. **Zoom Control** (Mouse wheel or drag):
   - ✅ Wheel scroll should zoom in/out smoothly
   - ✅ Drag up/down should zoom
   - ✅ Projection lines should scale correctly
   - ✅ Vanishing points should remain visible

---

### **E. Real-time Projection Updates**
1. **Linear Perspective** (Top windows):
   - ✅ Red projection lines from viewpoint to cube vertices
   - ✅ Blue projected cube outline in 2D view (straight lines)
   - ✅ Colored vanishing points (red, green, blue circles)
   - ✅ Light-colored extension lines to vanishing points
   - ✅ Square boundary representing image plane

2. **Hemispherical Perspective** (Bottom windows):
   - ✅ Green hemisphere centered at viewpoint
   - ✅ Curved projection lines to hemisphere surface
   - ✅ Blue projected cube outline in 2D view (circular arcs)
   - ✅ Circular boundary in 2D view
   - ✅ Vanishing points as colored circles within boundary

---

## 🐛 Debugging Support

### **Module Validation**
**URL**: `http://localhost:8000/test-modules.html`

✅ **Expected Output**:
```
🔧 Module Import Test Results:
✅ Successfully imported: js/config.js
✅ Successfully imported: js/state.js
✅ Successfully imported: js/utils/three-utils.js
✅ Successfully imported: js/scenes/scene-manager.js
✅ Successfully imported: js/scenes/objects.js
✅ Successfully imported: js/ui/window-manager.js
✅ Successfully imported: js/ui/controls.js
✅ Successfully imported: js/projections/linear-projection.js
✅ Successfully imported: js/projections/hemispherical-projection.js
✅ Successfully imported: js/projections/projection-manager.js
✅ Successfully imported: js/events/mouse-handlers.js
✅ Successfully imported: js/rendering/renderer.js
✅ Successfully imported: js/main.js

🎉 All 13 modules imported successfully!
```

### **Browser Console Debugging**
Press `F12` in Chrome → Console tab

✅ **Expected**: 
- No red error messages
- May see info logs like:
  ```
  Initializing Perspective Visualization...
  Scene managers initialized
  Projection systems ready
  Application startup complete
  ```

### **Common Error Patterns**
❌ **Module Load Errors**:
```
Failed to load module script: The server responded with a non-JavaScript MIME type
```
**Solution**: Ensure HTTP server is running, don't open file:// directly

❌ **Three.js Errors**:
```
THREE.WebGLRenderer: Context Lost
```
**Solution**: Refresh page, check WebGL support

---

## 🎯 Performance Indicators

### **Smooth Operation**
✅ **60 FPS rendering** (check with browser dev tools → Performance tab)
✅ **Responsive controls** (no lag when dragging sliders)
✅ **Immediate updates** when changing parameters
✅ **No memory leaks** (stable memory usage over time)
✅ **Smart caching** (smooth performance even with complex projections)

### **Visual Quality**
✅ **Anti-aliased 3D graphics** with smooth edges
✅ **Smooth lines and curves** in both 2D and 3D views
✅ **Proper transparency effects** on cube and projection surfaces
✅ **Accurate mathematical projections** matching theoretical expectations
✅ **Professional UI styling** with modern gradients and shadows

---

## 🚨 Common Issues & Solutions

### **If Application Doesn't Load**:
1. **Check HTTP Server**: Verify `http://localhost:8000` shows directory listing
2. **Check Browser Console**: Look for module loading errors
3. **Test Module Validation**: Try `http://localhost:8000/test-modules.html`
4. **Clear Browser Cache**: Hard refresh with Ctrl+F5

### **If Controls Don't Work**:
1. **Check Console**: Look for JavaScript errors
2. **Verify Three.js Loading**: Should see no 404 errors for three.min.js
3. **Test Module Imports**: Ensure all modules loaded successfully
4. **Try Different Browser**: Chrome/Firefox recommended

### **If Graphics Look Broken**:
1. **WebGL Support**: Visit `webglreport.com` to verify WebGL works
2. **Graphics Drivers**: Update graphics card drivers
3. **Browser Compatibility**: Try latest Chrome/Firefox
4. **Hardware Acceleration**: Enable in browser settings

### **If Windows Are Missing**:
1. **Check Window Menu**: Windows might be hidden
2. **Reset Layout**: Refresh page to restore default positions
3. **Screen Resolution**: Ensure windows aren't positioned off-screen

---

## 📊 Success Criteria

**✅ Application is working correctly if**:
- All 4 windows load with proper 3D graphics
- Controls respond immediately to user input
- Sliders and number inputs sync bidirectionally
- Projections update in real-time as parameters change
- Window management works smoothly (drag, hide/show)
- No errors in browser console
- Smooth 60fps animation performance
- Module validation passes all tests

**🎉 Congratulations!** You now have a fully functional, modular perspective visualization tool!

---

## 🔧 Advanced Testing

### **Stress Testing**:
- Rapidly change multiple sliders simultaneously
- Quickly drag cube and camera in different windows
- Open/close windows repeatedly
- Resize browser window while interacting

### **Edge Cases**:
- Set extreme parameter values (min/max ranges)
- Try to drag windows completely off-screen
- Test with browser zoom (Ctrl +/-)
- Test with different screen resolutions

### **Performance Testing**:
- Monitor FPS with dev tools during intensive interactions
- Check memory usage over extended use
- Test with multiple browser tabs open
- Verify smooth operation on lower-end devices

### **Module System Testing**:
- Verify all ES6 imports work correctly
- Check error handling for missing modules
- Test hot reload during development
- Validate proper module encapsulation

---

## 📁 File Structure Verification

**Essential Files for Testing**:
```
index.html          - Main application entry point
test-modules.html   - Module validation tool
js/                 - 19 modular JavaScript files
css/                - 3 stylesheet files
backup/             - Legacy files (not needed for testing)
```

**Testing URLs**:
- **Main App**: `http://localhost:8000/index.html`
- **Module Test**: `http://localhost:8000/test-modules.html`

---

*Ready to explore linear and hemispherical perspective mathematics interactively with a professional modular architecture!* 🎨📐 