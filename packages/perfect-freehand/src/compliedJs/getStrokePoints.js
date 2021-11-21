import { __spreadArray } from "tslib";
import { add, dist, isEqual, lrp, sub, uni } from './vec';
/**
 * ## getStrokePoints
 * @description Get an array of points as objects with an adjusted point, pressure, vector, distance, and runningLength.
 * @param points An array of points (as `[x, y, pressure]` or `{x, y, pressure}`). Pressure is optional in both cases.
 * @param options (optional) An object with options.
 * @param options.size	The base size (diameter) of the stroke.
 * @param options.thinning The effect of pressure on the stroke's size.
 * @param options.smoothing	How much to soften the stroke's edges.
 * @param options.easing	An easing function to apply to each point's pressure.
 * @param options.simulatePressure Whether to simulate pressure based on velocity.
 * @param options.start Cap, taper and easing for the start of the line.
 * @param options.end Cap, taper and easing for the end of the line.
 * @param options.last Whether to handle the points as a completed stroke.
 */
export function getStrokePoints(points, options) {
    var _a;
    if (options === void 0) { options = {}; }
    var _b = options.streamline, streamline = _b === void 0 ? 0.5 : _b, _c = options.size, size = _c === void 0 ? 16 : _c, _d = options.last, isComplete = _d === void 0 ? false : _d;
    // If we don't have any points, return an empty array.
    if (points.length === 0)
        return [];
    // Find the interpolation level between points.
    var t = 0.15 + (1 - streamline) * 0.85;
    // Whatever the input is, make sure that the points are in number[][].
    var pts = Array.isArray(points[0])
        ? points
        : points.map(function (_a) {
            var x = _a.x, y = _a.y, _b = _a.pressure, pressure = _b === void 0 ? 0.5 : _b;
            return [x, y, pressure];
        });
    // Add extra points between the two, to help avoid "dash" lines
    // for strokes with tapered start and ends. Don't mutate the
    // input array!
    if (pts.length === 2) {
        var last = pts[1];
        pts = pts.slice(0, -1);
        for (var i = 1; i < 5; i++) {
            pts.push(lrp(pts[0], last, i / 4));
        }
    }
    // If there's only one point, add another point at a 1pt offset.
    // Don't mutate the input array!
    if (pts.length === 1) {
        pts = __spreadArray(__spreadArray([], pts, true), [__spreadArray(__spreadArray([], add(pts[0], [1, 1]), true), pts[0].slice(2), true)], false);
    }
    // The strokePoints array will hold the points for the stroke.
    // Start it out with the first point, which needs no adjustment.
    var strokePoints = [
        {
            point: [pts[0][0], pts[0][1]],
            pressure: pts[0][2] >= 0 ? pts[0][2] : 0.25,
            vector: [1, 1],
            distance: 0,
            runningLength: 0,
        },
    ];
    // A flag to see whether we've already reached out minimum length
    var hasReachedMinimumLength = false;
    // We use the runningLength to keep track of the total distance
    var runningLength = 0;
    // We're set this to the latest point, so we can use it to calculate
    // the distance and vector of the next point.
    var prev = strokePoints[0];
    var max = pts.length - 1;
    // Iterate through all of the points, creating StrokePoints.
    for (var i = 1; i < pts.length; i++) {
        var point = isComplete && i === max
            ? // If we're at the last point, and `options.last` is true,
                // then add the actual input point.
                pts[i].slice(0, 2)
            : // Otherwise, using the t calculated from the streamline
                // option, interpolate a new point between the previous
                // point the current point.
                lrp(prev.point, pts[i], t);
        // If the new point is the same as the previous point, skip ahead.
        if (isEqual(prev.point, point))
            continue;
        // How far is the new point from the previous point?
        var distance = dist(point, prev.point);
        // Add this distance to the total "running length" of the line.
        runningLength += distance;
        // At the start of the line, we wait until the new point is a
        // certain distance away from the original point, to avoid noise
        if (i < max && !hasReachedMinimumLength) {
            if (runningLength < size)
                continue;
            hasReachedMinimumLength = true;
            // TODO: Backfill the missing points so that tapering works correctly.
        }
        // Create a new strokepoint (it will be the new "previous" one).
        prev = {
            // The adjusted point
            point: point,
            // The input pressure (or .5 if not specified)
            pressure: pts[i][2] >= 0 ? pts[i][2] : 0.5,
            // The vector from the current point to the previous point
            vector: uni(sub(prev.point, point)),
            // The distance between the current point and the previous point
            distance: distance,
            // The total distance so far
            runningLength: runningLength,
        };
        // Push it to the strokePoints array.
        strokePoints.push(prev);
    }
    // Set the vector of the first point to be the same as the second point.
    strokePoints[0].vector = ((_a = strokePoints[1]) === null || _a === void 0 ? void 0 : _a.vector) || [0, 0];
    return strokePoints;
}
//# sourceMappingURL=getStrokePoints.js.map