/**
 * @zakkster/lite-ease-params
 * Tunable parametric easing factories.
 *
 * Codegen pattern: ONE allocation at factory time (the closure + its captured
 * scalars), ZERO allocations in the hot path. Math.asin and divisions used to
 * derive the elastic phase shift are hoisted into the closure init so the hot
 * path runs only the math the curve fundamentally requires.
 *
 * Each factory returns an `EasingFunction = (t: number) => number` where
 * `t ∈ [0, 1]`. Output is in `[0, 1]` for Bounce; can overshoot above `1` and
 * below `0` for Back and Elastic.
 *
 * Module is `sideEffects: false` and tree-shakeable per factory.
 *
 * @module @zakkster/lite-ease-params
 */

const { PI, sin, pow, sqrt, max, min, asin } = Math;
const TWO_PI = PI * 2;

// ─── 1. Tunable Back ───────────────────────────────────────────────────────
// Penner's Back family with a configurable overshoot constant.
// `overshoot = 1.70158` reproduces the canonical curve. Higher values pull
// the curve further past its origin/destination before settling.

/**
 * Create an `easeInBack` curve with a tunable overshoot.
 *
 * The curve dips below zero in the early portion of `t`, then accelerates
 * past `1` only at `t = 1`. The minimum dip occurs near `t = 2s/(3(s+1))`.
 *
 * @param {number} [overshoot=1.70158] Magnitude of the back-pull. Penner's
 *   canonical value is `1.70158`. Higher = deeper dip.
 * @returns {(t: number) => number} Easing function. `f(0) = 0`, `f(1) = 1`.
 *   Range: dips below `0` for some `t < 1`.
 */
export const createBackIn = (overshoot = 1.70158) => {
    const s1 = overshoot + 1;
    return (t) => t * t * (s1 * t - overshoot);
};

/**
 * Create an `easeOutBack` curve with a tunable overshoot.
 *
 * The curve overshoots `1` near the end of `t`, then settles back to `1`
 * exactly at `t = 1`. Mirror of `createBackIn`.
 *
 * @param {number} [overshoot=1.70158] Magnitude of the back-pull. Penner's
 *   canonical value is `1.70158`. Higher = bigger overshoot.
 * @returns {(t: number) => number} Easing function. `f(0) = 0`, `f(1) = 1`.
 *   Range: overshoots `1` for some `t < 1`.
 */
export const createBackOut = (overshoot = 1.70158) => {
    const s1 = overshoot + 1;
    return (t) => {
        const tm = t - 1; // primitive float math, no allocation
        return 1 + tm * tm * (s1 * tm + overshoot);
    };
};

/**
 * Create an `easeInOutBack` curve with a tunable overshoot.
 *
 * Combines the inward dip of `BackIn` (first half) with the outward overshoot
 * of `BackOut` (second half). Penner multiplies the overshoot constant by
 * `1.525` for the InOut variant — preserved here.
 *
 * @param {number} [overshoot=1.70158] Magnitude of the back-pull. Internally
 *   multiplied by `1.525` per Penner's standard.
 * @returns {(t: number) => number} Easing function. `f(0) = 0`, `f(0.5) = 0.5`,
 *   `f(1) = 1`. Range overshoots `[0, 1]` symmetrically.
 */
export const createBackInOut = (overshoot = 1.70158) => {
    // Penner modifies the overshoot for InOut by multiplying by 1.525
    const s = overshoot * 1.525;
    const s1 = s + 1;
    return (t) => {
        const t2 = t * 2;
        if (t2 < 1) return 0.5 * (t2 * t2 * (s1 * t2 - s));
        const tm = t2 - 2;
        return 0.5 * (tm * tm * (s1 * tm + s) + 2);
    };
};

// ─── 2. Tunable Elastic ────────────────────────────────────────────────────
// Penner's Elastic family with configurable amplitude and period.
// `amplitude` clamps to `>= 1` (a < 1 would give NaN through asin(1/a)).
// `period` clamps to a positive default if a non-positive value is supplied.
// The phase shift `s` and angular frequency `freq` are fully hoisted to the
// closure init, so the hot path is one pow + one sin per call.

/**
 * Create an `easeInElastic` curve with tunable amplitude and period.
 *
 * Produces small oscillations that build into a sharp swing into the target.
 * The default `amplitude = 1` and `period = 0.3` reproduce Penner's canonical
 * curve.
 *
 * @param {number} [amplitude=1] Peak overshoot magnitude. Clamped to `>= 1`
 *   because the formula uses `asin(1/amplitude)` for the phase shift.
 * @param {number} [period=0.3] Oscillation period in `t`-space. Smaller =
 *   faster oscillation. Non-positive values fall back to `0.3`.
 * @returns {(t: number) => number} Easing function. `f(0) = 0`, `f(1) = 1`.
 *   Range can dip below `0` near the end (sharp pre-swing).
 */
export const createElasticIn = (amplitude = 1, period = 0.3) => {
    const a = max(1, amplitude);
    const p = period <= 0 ? 0.3 : period;
    const s = asin(1 / a) * (p / TWO_PI);
    const freq = TWO_PI / p;

    return (t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        const tm = t - 1;
        return -(a * pow(2, 10 * tm) * sin((tm - s) * freq));
    };
};

/**
 * Create an `easeOutElastic` curve with tunable amplitude and period.
 *
 * Produces a sharp initial overshoot followed by exponentially-damped
 * oscillations that settle to `1`. The classic "spring snap" feel.
 *
 * @param {number} [amplitude=1] Peak overshoot magnitude. Clamped to `>= 1`.
 * @param {number} [period=0.3] Oscillation period in `t`-space. Smaller =
 *   faster oscillation. Non-positive values fall back to `0.3`.
 * @returns {(t: number) => number} Easing function. `f(0) = 0`, `f(1) = 1`.
 *   Range can overshoot `1` near the beginning.
 */
export const createElasticOut = (amplitude = 1, period = 0.3) => {
    const a = max(1, amplitude);
    const p = period <= 0 ? 0.3 : period;
    const s = asin(1 / a) * (p / TWO_PI);
    const freq = TWO_PI / p;

    return (t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return a * pow(2, -10 * t) * sin((t - s) * freq) + 1;
    };
};

/**
 * Create an `easeInOutElastic` curve with tunable amplitude and period.
 *
 * Symmetric: small oscillations on both ends with a smooth crossing through
 * `0.5` at `t = 0.5`.
 *
 * @param {number} [amplitude=1] Peak overshoot magnitude. Clamped to `>= 1`.
 * @param {number} [period=0.3] Oscillation period in `t`-space.
 * @returns {(t: number) => number} Easing function. `f(0) = 0`, `f(0.5) = 0.5`,
 *   `f(1) = 1`.
 */
export const createElasticInOut = (amplitude = 1, period = 0.3) => {
    const a = max(1, amplitude);
    const p = period <= 0 ? 0.3 : period;
    const s = asin(1 / a) * (p / TWO_PI);
    const freq = TWO_PI / p;

    return (t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        const tm = (t * 2) - 1;
        if (tm < 0) {
            return -0.5 * (a * pow(2, 10 * tm) * sin((tm - s) * freq));
        }
        return a * pow(2, -10 * tm) * sin((tm - s) * freq) * 0.5 + 1;
    };
};

// ─── 3. Tunable Bounce ─────────────────────────────────────────────────────
// Penner's Bounce family with one physically-meaningful parameter:
// `bounciness ∈ (0, 1)` is the fraction of vertical energy retained per
// bounce. The canonical Penner curve corresponds to bounciness = 0.25.
//
// Geometric breakpoints are derived from the per-bounce velocity ratio
// `q = √b`. With `n = 1/p1²` (gravity), bounce-k arc has half-width `q^k·p1`,
// so `n·h_k² = q^(2k) = b^k`, giving valley depths of exactly `1 - b^k`.
// All peaks resolve to exactly `1`.
//
// The default value (0.25) routes to a cached zero-allocation closure that
// uses Penner's bit-exact constants — preserving reference equality across
// `createBounceOut() === createBounceOut()`.

const PENNER_N1 = 7.5625;
const PENNER_D1 = 2.75;

/**
 * Exact Penner BounceOut. Cached closure, returned by `createBounceOut(0.25)`
 * (the default). Reproduces the canonical Penner constants bit-exactly,
 * skipping the `sqrt` and breakpoint algebra.
 *
 * @param {number} t
 * @returns {number}
 */
const exactBounceOut = (t) => {
    if (t < 1 / PENNER_D1) return PENNER_N1 * t * t;
    else if (t < 2 / PENNER_D1) return PENNER_N1 * (t -= 1.5 / PENNER_D1) * t + 0.75;
    else if (t < 2.5 / PENNER_D1) return PENNER_N1 * (t -= 2.25 / PENNER_D1) * t + 0.9375;
    else return PENNER_N1 * (t -= 2.625 / PENNER_D1) * t + 0.984375;
};

/**
 * Create an `easeOutBounce` curve with tunable bounciness.
 *
 * `bounciness` represents the fraction of vertical energy retained per bounce.
 * The default value (`0.25`) reproduces Penner's canonical curve exactly
 * (bit-identical) via a cached closure. Values closer to `1` produce many
 * small bounces; values closer to `0` produce a long initial drop with tiny
 * final bounces.
 *
 * Geometry: 4 parabolic segments with breakpoints `[0, p1, p2, p3, 1]` derived
 * from `q = √bounciness`. All peaks reach exactly `1`. Valleys hit `1 - b`,
 * `1 - b²`, `1 - b³` at the centers of segments 2–4 respectively.
 *
 * @param {number} [bounciness=0.25] Fraction of energy retained per bounce.
 *   Clamped to `[0.01, 0.99]`. The default routes to a cached pure-Penner
 *   implementation, so `createBounceOut() === createBounceOut()`.
 * @returns {(t: number) => number} Easing function. `f(0) = 0`, `f(1) = 1`.
 *   Range strictly within `[0, 1]`.
 */
export const createBounceOut = (bounciness = 0.25) => {
    // Exact-Match Guarantee: the default routes to the cached Penner path.
    // This preserves reference equality across calls AND guarantees
    // bit-identical output to the well-known Penner constants.
    if (bounciness === 0.25) return exactBounceOut;

    // Clamp to a physically-valid range. b → 0 means no bounces, b → 1 means
    // perfectly elastic (no energy loss). The formula is well-defined on the
    // open interval (0, 1).
    const b = max(0.01, min(0.99, bounciness));
    const q = sqrt(b);

    // Solve  p1·(1 + 2q + 2q² + 2q³) = 1  for p1, with q² = b.
    //   → p1·(1 + 2q + 2b + 2qb) = 1
    //   → p1 = 1 / (1 + 2q·(1 + q + b))
    const p1 = 1 / (1 + 2 * q * (1 + q + b));
    const p2 = p1 * (1 + 2 * q);          // p1 + 2q·p1
    const p3 = p2 + 2 * b * p1;            // p2 + 2q²·p1
    const n  = 1 / (p1 * p1);              // gravity, so n·p1² = 1

    return (t) => {
        // Boundary Guarantee: clamp to exact 0 / 1 to avoid float drift.
        if (t >= 1) return 1;
        if (t <= 0) return 0;

        if (t < p1) {
            return n * t * t;
        } else if (t < p2) {
            const tm = t - (p1 + (p2 - p1) * 0.5);
            return n * tm * tm + (1 - b);
        } else if (t < p3) {
            const tm = t - (p2 + (p3 - p2) * 0.5);
            return n * tm * tm + (1 - b * b);
        } else {
            const tm = t - (p3 + (1 - p3) * 0.5);
            return n * tm * tm + (1 - b * b * b);
        }
    };
};

/**
 * Create an `easeInBounce` curve with tunable bounciness.
 *
 * Defined as the time-reflection of `BounceOut`: `f(t) = 1 - bounceOut(1 - t)`.
 * Captures one allocated closure (the inner `bounceOut`) at factory time.
 *
 * @param {number} [bounciness=0.25] See {@link createBounceOut}.
 * @returns {(t: number) => number} Easing function. `f(0) = 0`, `f(1) = 1`.
 */
export const createBounceIn = (bounciness = 0.25) => {
    const bounceOut = createBounceOut(bounciness);
    return (t) => 1 - bounceOut(1 - t);
};

/**
 * Create an `easeInOutBounce` curve with tunable bounciness.
 *
 * Symmetric: bounce-in for the first half, bounce-out for the second.
 * Captures one allocated `bounceOut` closure at factory time and reuses it
 * for both halves.
 *
 * @param {number} [bounciness=0.25] See {@link createBounceOut}.
 * @returns {(t: number) => number} Easing function. `f(0) = 0`, `f(0.5) = 0.5`,
 *   `f(1) = 1`.
 */
export const createBounceInOut = (bounciness = 0.25) => {
    const bounceOut = createBounceOut(bounciness);
    return (t) => t < 0.5
        ? (1 - bounceOut(1 - t * 2)) * 0.5
        : (1 + bounceOut(t * 2 - 1)) * 0.5;
};
