/**
 * @zakkster/lite-ease-params
 * Tunable parametric easing factories — type definitions.
 *
 * Each factory returns an {@link EasingFunction} `(t) => y` where `t ∈ [0, 1]`.
 *
 * @packageDocumentation
 */

/**
 * A normalized easing function.
 *
 * Domain: `t ∈ [0, 1]`. Outputs `0` at `t = 0` and `1` at `t = 1`.
 * Range: typically `[0, 1]`, but `Back` and `Elastic` curves can overshoot
 * either end of `[0, 1]` by design.
 */
export type EasingFunction = (t: number) => number;

/**
 * Create an `easeInBack` curve with a tunable overshoot.
 *
 * The curve dips below zero in the early portion of `t`, then accelerates
 * past `1` only at `t = 1`.
 *
 * @param overshoot Magnitude of the back-pull. Penner's canonical value is
 *   `1.70158`. Higher = deeper dip. Defaults to `1.70158`.
 * @returns Easing function. `f(0) = 0`, `f(1) = 1`. Dips below `0` for some
 *   intermediate `t`.
 */
export declare function createBackIn(overshoot?: number): EasingFunction;

/**
 * Create an `easeOutBack` curve with a tunable overshoot.
 *
 * The curve overshoots `1` near the end of `t`, then settles back to `1`
 * exactly at `t = 1`.
 *
 * @param overshoot Magnitude of the back-pull. Penner's canonical value is
 *   `1.70158`. Higher = bigger overshoot. Defaults to `1.70158`.
 * @returns Easing function. `f(0) = 0`, `f(1) = 1`. Overshoots `1` for some
 *   intermediate `t`.
 */
export declare function createBackOut(overshoot?: number): EasingFunction;

/**
 * Create an `easeInOutBack` curve with a tunable overshoot.
 *
 * Combines the inward dip of `BackIn` (first half) with the outward overshoot
 * of `BackOut` (second half). The overshoot constant is internally multiplied
 * by `1.525` per Penner's standard.
 *
 * @param overshoot Magnitude of the back-pull (pre-multiplied by `1.525`).
 *   Defaults to `1.70158`.
 * @returns Easing function. `f(0) = 0`, `f(0.5) = 0.5`, `f(1) = 1`.
 */
export declare function createBackInOut(overshoot?: number): EasingFunction;

/**
 * Create an `easeInElastic` curve with tunable amplitude and period.
 *
 * Produces small oscillations that build into a sharp swing into the target.
 *
 * @param amplitude Peak overshoot magnitude. Internally clamped to `>= 1`
 *   (the formula uses `asin(1/amplitude)` for the phase shift). Defaults to
 *   `1`.
 * @param period Oscillation period in `t`-space. Smaller = faster
 *   oscillation. Non-positive values fall back to `0.3`. Defaults to `0.3`.
 * @returns Easing function. `f(0) = 0`, `f(1) = 1`. Range can dip below `0`.
 */
export declare function createElasticIn(amplitude?: number, period?: number): EasingFunction;

/**
 * Create an `easeOutElastic` curve with tunable amplitude and period.
 *
 * Produces a sharp initial overshoot followed by exponentially-damped
 * oscillations that settle to `1`. The classic "spring snap" feel.
 *
 * @param amplitude Peak overshoot magnitude. Clamped to `>= 1`. Defaults to `1`.
 * @param period Oscillation period in `t`-space. Defaults to `0.3`.
 * @returns Easing function. `f(0) = 0`, `f(1) = 1`. Range can overshoot `1`.
 */
export declare function createElasticOut(amplitude?: number, period?: number): EasingFunction;

/**
 * Create an `easeInOutElastic` curve with tunable amplitude and period.
 *
 * Symmetric: small oscillations on both ends with a smooth crossing through
 * `0.5` at `t = 0.5`.
 *
 * @param amplitude Peak overshoot magnitude. Clamped to `>= 1`. Defaults to `1`.
 * @param period Oscillation period in `t`-space. Defaults to `0.3`.
 * @returns Easing function. `f(0) = 0`, `f(0.5) = 0.5`, `f(1) = 1`.
 */
export declare function createElasticInOut(amplitude?: number, period?: number): EasingFunction;

/**
 * Create an `easeInBounce` curve with tunable bounciness.
 *
 * Defined as the time-reflection of {@link createBounceOut}.
 *
 * @param bounciness Fraction of energy retained per bounce. Clamped to
 *   `[0.01, 0.99]`. Defaults to `0.25` (Penner's canonical value).
 * @returns Easing function. `f(0) = 0`, `f(1) = 1`. Range strictly within
 *   `[0, 1]`.
 */
export declare function createBounceIn(bounciness?: number): EasingFunction;

/**
 * Create an `easeOutBounce` curve with tunable bounciness.
 *
 * `bounciness` is the fraction of vertical energy retained per bounce.
 * The default value (`0.25`) reproduces Penner's canonical curve exactly
 * (bit-identical) via a cached closure: `createBounceOut() === createBounceOut()`.
 *
 * Geometry: 4 parabolic segments. All peaks reach exactly `1`; valleys hit
 * `1 - b`, `1 - b²`, `1 - b³` at the centers of segments 2–4.
 *
 * @param bounciness Fraction of energy retained per bounce. Clamped to
 *   `[0.01, 0.99]`. Values closer to `1` = many small bounces; values closer
 *   to `0` = long drop with tiny final bounces. Defaults to `0.25`.
 * @returns Easing function. `f(0) = 0`, `f(1) = 1`. Range strictly within
 *   `[0, 1]`.
 */
export declare function createBounceOut(bounciness?: number): EasingFunction;

/**
 * Create an `easeInOutBounce` curve with tunable bounciness.
 *
 * Symmetric: bounce-in for the first half, bounce-out for the second.
 *
 * @param bounciness Fraction of energy retained per bounce. Clamped to
 *   `[0.01, 0.99]`. Defaults to `0.25`.
 * @returns Easing function. `f(0) = 0`, `f(0.5) = 0.5`, `f(1) = 1`.
 */
export declare function createBounceInOut(bounciness?: number): EasingFunction;
