/**
 * Compute a radius based on the pressure.
 * @param size
 * @param thinning
 * @param pressure
 * @param easing
 * @internal
 */
export function getStrokeRadius(size, thinning, pressure, easing) {
    if (easing === void 0) { easing = function (t) { return t; }; }
    return size * easing(0.5 - thinning * (0.5 - pressure));
}
//# sourceMappingURL=getStrokeRadius.js.map