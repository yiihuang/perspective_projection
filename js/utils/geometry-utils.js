/**
 * Geometry Utilities Module
 * Shared geometric calculation functions used across projection modules
 * Phase 1 Optimization: Consolidates duplicate collinearity checks and arc creation logic
 */

/**
 * Detects if three 2D points are collinear using multiple verification methods
 * @param {Object} p1 - First point with {x, y} properties
 * @param {Object} p2 - Second point with {x, y} properties
 * @param {Object} p3 - Third point with {x, y} properties
 * @param {number|null} tolerance - Optional custom tolerance (null = auto-adaptive)
 * @returns {boolean} True if points are collinear within tolerance
 */
export function arePointsCollinear(p1, p2, p3, tolerance = null) {
    // Method 1: Area of triangle (should be zero for collinear points)
    const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;

    // Method 2: Cross product of vectors
    const v1x = p2.x - p1.x;
    const v1y = p2.y - p1.y;
    const v2x = p3.x - p1.x;
    const v2y = p3.y - p1.y;
    const crossProduct = Math.abs(v1x * v2y - v1y * v2x);

    // Method 3: Determinant method
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

    // Calculate scale-dependent tolerance (adaptive based on coordinate magnitude)
    const maxCoord = Math.max(
        Math.abs(ax), Math.abs(ay),
        Math.abs(bx), Math.abs(by),
        Math.abs(cx), Math.abs(cy)
    );
    const scaleTolerance = tolerance ?? Math.max(1e-6, maxCoord * 1e-8);

    // Check if any method indicates collinearity
    const isCollinear = area < scaleTolerance ||
                       crossProduct < scaleTolerance ||
                       Math.abs(d) < scaleTolerance;

    return isCollinear;
}

/**
 * Calculate circle center and radius from three points
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @param {Object} p3 - Third point {x, y}
 * @returns {Object|null} Circle data {centerX, centerY, radius} or null if collinear
 */
export function calculateCircleFrom3Points(p1, p2, p3) {
    if (arePointsCollinear(p1, p2, p3)) {
        return null;
    }

    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;

    // Calculate circle center using determinant method
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

    const centerX = ux;
    const centerY = uy;
    const radius = Math.sqrt((ax - centerX) * (ax - centerX) + (ay - centerY) * (ay - centerY));

    return { centerX, centerY, radius };
}

/**
 * Create arc geometry between two points through a third point
 * @param {Object} p1 - Start point {x, y}
 * @param {Object} p2 - End point {x, y}
 * @param {Object} p3 - Through point {x, y} (determines arc curvature)
 * @param {Object} options - Configuration options
 * @param {number} options.zIndex - Z-coordinate for all points (default 0)
 * @param {number} options.baseSegments - Base segment count (default 64)
 * @param {number} options.maxSegments - Maximum segment count (default 256)
 * @param {number} options.maxArcLength - Max length per segment (default 0.5)
 * @param {string} options.arcType - 'partial' | 'full' | 'edge' (default 'partial')
 * @returns {Array<THREE.Vector3>} Array of points for the arc
 */
export function createArcGeometry(p1, p2, p3, options = {}) {
    const {
        zIndex = 0,
        baseSegments = 64,
        maxSegments = 256,
        maxArcLength = 0.5,
        arcType = 'partial'
    } = options;

    // Check if points are collinear
    if (arePointsCollinear(p1, p2, p3)) {
        // Return straight line through all points (sorted)
        const points = [p1, p2, p3];
        points.sort((a, b) => {
            if (Math.abs(a.x - b.x) > 1e-6) {
                return a.x - b.x;
            }
            return a.y - b.y;
        });

        return [
            new THREE.Vector3(points[0].x, points[0].y, zIndex),
            new THREE.Vector3(points[1].x, points[1].y, zIndex),
            new THREE.Vector3(points[2].x, points[2].y, zIndex)
        ];
    }

    // Calculate circle parameters
    const circle = calculateCircleFrom3Points(p1, p2, p3);
    if (!circle) {
        // Fallback to straight line
        return [
            new THREE.Vector3(p1.x, p1.y, zIndex),
            new THREE.Vector3(p2.x, p2.y, zIndex)
        ];
    }

    const { centerX, centerY, radius } = circle;

    // Determine arc angles and type
    let startAngle, endAngle, totalAngle;

    if (arcType === 'full') {
        // Full circle (0 to 2π)
        startAngle = 0;
        endAngle = 2 * Math.PI;
        totalAngle = 2 * Math.PI;
    } else if (arcType === 'edge') {
        // Arc only between p1 and p2 (not through p3)
        const angle1 = Math.atan2(p1.y - centerY, p1.x - centerX);
        const angle2 = Math.atan2(p2.y - centerY, p2.x - centerX);

        startAngle = angle1;
        let angleDiff = angle2 - angle1;

        // Normalize to shorter arc
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        endAngle = startAngle + angleDiff;
        totalAngle = Math.abs(angleDiff);
    } else {
        // Partial arc from p1 to p2 through p3
        const angle1 = Math.atan2(p1.y - centerY, p1.x - centerX);
        const angle2 = Math.atan2(p2.y - centerY, p2.x - centerX);

        startAngle = angle1;
        let angleDiff = angle2 - angle1;

        // Normalize to shorter arc
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        endAngle = startAngle + angleDiff;
        totalAngle = Math.abs(angleDiff);
    }

    // Calculate adaptive segment count based on arc length
    const arcLength = totalAngle * radius;
    const adaptiveSegments = Math.max(baseSegments, Math.ceil(arcLength / maxArcLength));
    const segments = Math.min(adaptiveSegments, maxSegments);

    // Generate arc points
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (endAngle - startAngle) * i / segments;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, zIndex));
    }

    return points;
}

/**
 * Create a THREE.Line from arc geometry
 * Convenience wrapper around createArcGeometry
 * @param {Object} p1 - Start point
 * @param {Object} p2 - End point
 * @param {Object} p3 - Through point
 * @param {THREE.Material} material - Line material
 * @param {Object} options - Same options as createArcGeometry
 * @returns {THREE.Line} Line object ready to add to scene
 */
export function createArcLine(p1, p2, p3, material, options = {}) {
    const points = createArcGeometry(p1, p2, p3, options);
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}
