/**
 * ## getStroke
 * @description Get an array of points describing a polygon that surrounds the input points.
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
function getStroke(points, options) {
    if (options === void 0) { options = {}; }
    return getStrokeOutlinePoints(getStrokePoints(points, options), options);
}
//# sourceMappingURL=getStroke.js.map
var __spreadArray = function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var min = Math.min, PI = Math.PI;
// This is the rate of change for simulated pressure. It could be an option.
var RATE_OF_PRESSURE_CHANGE = 0.275;
// Browser strokes seem to be off if PI is regular, a tiny offset seems to fix it
var FIXED_PI = PI + 0.0001;
/**
 * ## getStrokeOutlinePoints
 * @description Get an array of points (as `[x, y]`) representing the outline of a stroke.
 * @param points An array of StrokePoints as returned from `getStrokePoints`.
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
 function getStrokeOutlinePoints(points, options) {
    if (options === void 0) { options = {}; }
    var _a = options.size, size = _a === void 0 ? 16 : _a, _b = options.smoothing, smoothing = _b === void 0 ? 0.5 : _b, _c = options.thinning, thinning = _c === void 0 ? 0.5 : _c, _d = options.simulatePressure, simulatePressure = _d === void 0 ? true : _d, _e = options.easing, easing = _e === void 0 ? function (t) { return t; } : _e, _f = options.start, start = _f === void 0 ? {} : _f, _g = options.end, end = _g === void 0 ? {} : _g, _h = options.last, isComplete = _h === void 0 ? false : _h;
    var _j = start.cap, capStart = _j === void 0 ? true : _j, _k = start.taper, taperStart = _k === void 0 ? 0 : _k, _l = start.easing, taperStartEase = _l === void 0 ? function (t) { return t * (2 - t); } : _l;
    var _m = end.cap, capEnd = _m === void 0 ? true : _m, _o = end.taper, taperEnd = _o === void 0 ? 0 : _o, _p = end.easing, taperEndEase = _p === void 0 ? function (t) { return --t * t * t + 1; } : _p;
    // We can't do anything with an empty array or a stroke with negative size.
    if (points.length === 0 || size <= 0) {
        return [];
    }
    // The total length of the line
    var totalLength = points[points.length - 1].runningLength;
    // The minimum allowed distance between points (squared)
    var minDistance = Math.pow(size * smoothing, 2);
    // Our collected left and right points
    var leftPts = [];
    var rightPts = [];
    // Previous pressure (start with average of first five pressures,
    // in order to prevent fat starts for every line. Drawn lines
    // almost always start slow!
    var prevPressure = points.slice(0, 10).reduce(function (acc, curr) {
        var pressure = curr.pressure;
        if (simulatePressure) {
            // Speed of change - how fast should the the pressure changing?
            var sp = min(1, curr.distance / size);
            // Rate of change - how much of a change is there?
            var rp = min(1, 1 - sp);
            // Accelerate the pressure
            pressure = min(1, acc + (rp - acc) * (sp * RATE_OF_PRESSURE_CHANGE));
        }
        return (acc + pressure) / 2;
    }, points[0].pressure);
    // The current radius
    var radius = getStrokeRadius(size, thinning, points[points.length - 1].pressure, easing);
    // The radius of the first saved point
    var firstRadius = undefined;
    // Previous vector
    var prevVector = points[0].vector;
    // Previous left and right points
    var pl = points[0].point;
    var pr = pl;
    // Temporary left and right points
    var tl = pl;
    var tr = pr;
    // let short = true
    /*
      Find the outline's left and right points
  
      Iterating through the points and populate the rightPts and leftPts arrays,
      skipping the first and last pointsm, which will get caps later on.
    */
    for (var i = 0; i < points.length; i++) {
        var pressure = points[i].pressure;
        var _q = points[i], point = _q.point, vector = _q.vector, distance = _q.distance, runningLength = _q.runningLength;
        // Removes noise from the end of the line
        if (i < points.length - 1 && totalLength - runningLength < 3) {
            continue;
        }
        /*
          Calculate the radius
    
          If not thinning, the current point's radius will be half the size; or
          otherwise, the size will be based on the current (real or simulated)
          pressure.
        */
        if (thinning) {
            if (simulatePressure) {
                // If we're simulating pressure, then do so based on the distance
                // between the current point and the previous point, and the size
                // of the stroke. Otherwise, use the input pressure.
                var sp = min(1, distance / size);
                var rp = min(1, 1 - sp);
                pressure = min(1, prevPressure + (rp - prevPressure) * (sp * RATE_OF_PRESSURE_CHANGE));
            }
            radius = getStrokeRadius(size, thinning, pressure, easing);
        }
        else {
            radius = size / 2;
        }
        if (firstRadius === undefined) {
            firstRadius = radius;
        }
        /*
          Apply tapering
    
          If the current length is within the taper distance at either the
          start or the end, calculate the taper strengths. Apply the smaller
          of the two taper strengths to the radius.
        */
        var ts = runningLength < taperStart
            ? taperStartEase(runningLength / taperStart)
            : 1;
        var te = totalLength - runningLength < taperEnd
            ? taperEndEase((totalLength - runningLength) / taperEnd)
            : 1;
        radius = Math.max(0.01, radius * Math.min(ts, te));
        /* Add points to left and right */
        // Handle the last point
        if (i === points.length - 1) {
            var offset_1 = mul(per(vector), radius);
            leftPts.push(sub(point, offset_1));
            rightPts.push(add(point, offset_1));
            continue;
        }
        var nextVector = points[i + 1].vector;
        var nextDpr = dpr(vector, nextVector);
        /*
          Handle sharp corners
    
          Find the difference (dot product) between the current and next vector.
          If the next vector is at more than a right angle to the current vector,
          draw a cap at the current point.
        */
        if (nextDpr < 0) {
            // It's a sharp corner. Draw a rounded cap and move on to the next point
            // Considering saving these and drawing them later? So that we can avoid
            // crossing future points.
            var offset_2 = mul(per(prevVector), radius);
            for (var step = 1 / 13, t = 0; t <= 1; t += step) {
                tl = rotAround(sub(point, offset_2), point, FIXED_PI * t);
                leftPts.push(tl);
                tr = rotAround(add(point, offset_2), point, FIXED_PI * -t);
                rightPts.push(tr);
            }
            pl = tl;
            pr = tr;
            continue;
        }
        /*
          Add regular points
    
          Project points to either side of the current point, using the
          calculated size as a distance. If a point's distance to the
          previous point on that side greater than the minimum distance
          (or if the corner is kinda sharp), add the points to the side's
          points array.
        */
        var offset = mul(per(lrp(nextVector, vector, nextDpr)), radius);
        tl = sub(point, offset);
        if (i <= 1 || dist2(pl, tl) > minDistance) {
            leftPts.push(tl);
            pl = tl;
        }
        tr = add(point, offset);
        if (i <= 1 || dist2(pr, tr) > minDistance) {
            rightPts.push(tr);
            pr = tr;
        }
        // Set variables for next iteration
        prevPressure = pressure;
        prevVector = vector;
    }
    /*
      Drawing caps
      
      Now that we have our points on either side of the line, we need to
      draw caps at the start and end. Tapered lines don't have caps, but
      may have dots for very short lines.
    */
    var firstPoint = points[0].point.slice(0, 2);
    var lastPoint = points.length > 1
        ? points[points.length - 1].point.slice(0, 2)
        : add(points[0].point, [1, 1]);
    var startCap = [];
    var endCap = [];
    /*
      Draw a dot for very short or completed strokes
      
      If the line is too short to gather left or right points and if the line is
      not tapered on either side, draw a dot. If the line is tapered, then only
      draw a dot if the line is both very short and complete. If we draw a dot,
      we can just return those points.
    */
    if (points.length === 1) {
        if (!(taperStart || taperEnd) || isComplete) {
            var start_1 = prj(firstPoint, uni(per(sub(firstPoint, lastPoint))), -(firstRadius || radius));
            var dotPts = [];
            for (var step = 1 / 13, t = step; t <= 1; t += step) {
                dotPts.push(rotAround(start_1, firstPoint, FIXED_PI * 2 * t));
            }
            return dotPts;
        }
    }
    else {
        /*
        Draw a start cap
    
        Unless the line has a tapered start, or unless the line has a tapered end
        and the line is very short, draw a start cap around the first point. Use
        the distance between the second left and right point for the cap's radius.
        Finally remove the first left and right points. :psyduck:
      */
        if (taperStart || (taperEnd && points.length === 1)) {
            // The start point is tapered, noop
        }
        else if (capStart) {
            // Draw the round cap - add thirteen points rotating the right point around the start point to the left point
            for (var step = 1 / 13, t = step; t <= 1; t += step) {
                var pt = rotAround(rightPts[0], firstPoint, FIXED_PI * t);
                startCap.push(pt);
            }
        }
        else {
            // Draw the flat cap - add a point to the left and right of the start point
            var cornersVector = sub(leftPts[0], rightPts[0]);
            var offsetA = mul(cornersVector, 0.5);
            var offsetB = mul(cornersVector, 0.51);
            startCap.push(sub(firstPoint, offsetA), sub(firstPoint, offsetB), add(firstPoint, offsetB), add(firstPoint, offsetA));
        }
        /*
        Draw an end cap
    
        If the line does not have a tapered end, and unless the line has a tapered
        start and the line is very short, draw a cap around the last point. Finally,
        remove the last left and right points. Otherwise, add the last point. Note
        that This cap is a full-turn-and-a-half: this prevents incorrect caps on
        sharp end turns.
      */
        var direction = per(neg(points[points.length - 1].vector));
        if (taperEnd || (taperStart && points.length === 1)) {
            // Tapered end - push the last point to the line
            endCap.push(lastPoint);
        }
        else if (capEnd) {
            // Draw the round end cap
            var start_2 = prj(lastPoint, direction, radius);
            for (var step = 1 / 29, t = step; t < 1; t += step) {
                endCap.push(rotAround(start_2, lastPoint, FIXED_PI * 3 * t));
            }
        }
        else {
            // Draw the flat end cap
            endCap.push(add(lastPoint, mul(direction, radius)), add(lastPoint, mul(direction, radius * 0.99)), sub(lastPoint, mul(direction, radius * 0.99)), sub(lastPoint, mul(direction, radius)));
        }
    }
    /*
      Return the points in the correct winding order: begin on the left side, then
      continue around the end cap, then come back along the right side, and finally
      complete the start cap.
    */
    return leftPts.concat(endCap, rightPts.reverse(), startCap);
}

function getStrokePoints(points, options) {
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
function getStrokeRadius(size, thinning, pressure, easing) {
    if (easing === void 0) { easing = function (t) { return t; }; }
    return size * easing(0.5 - thinning * (0.5 - pressure));
}

/**
 * Negate a vector.
 * @param A
 * @internal
 */
function neg(A) {
    return [-A[0], -A[1]];
}
/**
 * Add vectors.
 * @param A
 * @param B
 * @internal
 */
 function add(A, B) {
    return [A[0] + B[0], A[1] + B[1]];
}
/**
 * Subtract vectors.
 * @param A
 * @param B
 * @internal
 */
 function sub(A, B) {
    return [A[0] - B[0], A[1] - B[1]];
}
/**
 * Vector multiplication by scalar
 * @param A
 * @param n
 * @internal
 */
 function mul(A, n) {
    return [A[0] * n, A[1] * n];
}
/**
 * Vector division by scalar.
 * @param A
 * @param n
 * @internal
 */
 function div(A, n) {
    return [A[0] / n, A[1] / n];
}
/**
 * Perpendicular rotation of a vector A
 * @param A
 * @internal
 */
 function per(A) {
    return [A[1], -A[0]];
}
/**
 * Dot product
 * @param A
 * @param B
 * @internal
 */
 function dpr(A, B) {
    return A[0] * B[0] + A[1] * B[1];
}
/**
 * Get whether two vectors are equal.
 * @param A
 * @param B
 * @internal
 */
 function isEqual(A, B) {
    return A[0] === B[0] && A[1] === B[1];
}
/**
 * Length of the vector
 * @param A
 * @internal
 */
 function len(A) {
    return Math.hypot(A[0], A[1]);
}
/**
 * Length of the vector squared
 * @param A
 * @internal
 */
 function len2(A) {
    return A[0] * A[0] + A[1] * A[1];
}
/**
 * Dist length from A to B squared.
 * @param A
 * @param B
 * @internal
 */
 function dist2(A, B) {
    return len2(sub(A, B));
}
/**
 * Get normalized / unit vector.
 * @param A
 * @internal
 */
 function uni(A) {
    return div(A, len(A));
}
/**
 * Dist length from A to B
 * @param A
 * @param B
 * @internal
 */
 function dist(A, B) {
    return Math.hypot(A[1] - B[1], A[0] - B[0]);
}
/**
 * Mean between two vectors or mid vector between two vectors
 * @param A
 * @param B
 * @internal
 */
 function med(A, B) {
    return mul(add(A, B), 0.5);
}
/**
 * Rotate a vector around another vector by r (radians)
 * @param A vector
 * @param C center
 * @param r rotation in radians
 * @internal
 */
 function rotAround(A, C, r) {
    var s = Math.sin(r);
    var c = Math.cos(r);
    var px = A[0] - C[0];
    var py = A[1] - C[1];
    var nx = px * c - py * s;
    var ny = px * s + py * c;
    return [nx + C[0], ny + C[1]];
}
/**
 * Interpolate vector A to B with a scalar t
 * @param A
 * @param B
 * @param t scalar
 * @internal
 */
 function lrp(A, B, t) {
    return add(A, mul(sub(B, A), t));
}
/**
 * Project a point A in the direction B by a scalar c
 * @param A
 * @param B
 * @param c
 * @internal
 */
 function prj(A, B, c) {
    return add(A, mul(B, c));
}