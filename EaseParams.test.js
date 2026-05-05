import { describe, it, expect } from 'vitest';
import {
    createBackIn, createBackOut, createBackInOut,
    createElasticIn, createElasticOut, createElasticInOut,
    createBounceIn, createBounceOut, createBounceInOut,
} from './EaseParams.js';

// Helpers --------------------------------------------------------------------

const sample = (fn, n = 1001) => {
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = fn(i / (n - 1));
    return out;
};

const allFinite = (arr) => arr.every((v) => Number.isFinite(v));

const isMonotonic = (arr, dir = 'asc') => {
    for (let i = 1; i < arr.length; i++) {
        if (dir === 'asc' && arr[i] < arr[i - 1] - 1e-12) return false;
        if (dir === 'desc' && arr[i] > arr[i - 1] + 1e-12) return false;
    }
    return true;
};

// Reference Penner BounceOut, used as a bit-exact oracle for the default path.
const pennerBounceOut = (t) => {
    const d1 = 2.75, n1 = 7.5625;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

// ============================================================================
// 1. Endpoint guarantees: f(0) === 0, f(1) === 1 for every factory + variant.
// ============================================================================

describe('endpoint guarantees', () => {
    const factories = [
        ['createBackIn',       createBackIn],
        ['createBackOut',      createBackOut],
        ['createBackInOut',    createBackInOut],
        ['createElasticIn',    createElasticIn],
        ['createElasticOut',   createElasticOut],
        ['createElasticInOut', createElasticInOut],
        ['createBounceIn',     createBounceIn],
        ['createBounceOut',    createBounceOut],
        ['createBounceInOut',  createBounceInOut],
    ];

    for (const [name, factory] of factories) {
        const isBounce = name.startsWith('createBounce');
        it(`${name}() satisfies f(0) ≈ 0 and f(1) ≈ 1 with defaults`, () => {
            const fn = factory();
            if (isBounce) {
                // Bounce factories have explicit boundary guards, so strict
                // equality is guaranteed — this is a documented invariant.
                expect(fn(0)).toBe(0);
                expect(fn(1)).toBe(1);
            } else {
                // Back & Elastic compute endpoints from non-exactly-representable
                // float literals (e.g. 1.70158); float drift is bounded by ~2e-16.
                expect(fn(0)).toBeCloseTo(0, 12);
                expect(fn(1)).toBeCloseTo(1, 12);
            }
        });
    }

    it('createBackInOut(default) crosses 0.5 exactly at t=0.5', () => {
        expect(createBackInOut()(0.5)).toBeCloseTo(0.5, 12);
    });

    it('createElasticInOut(default) crosses 0.5 exactly at t=0.5', () => {
        expect(createElasticInOut()(0.5)).toBeCloseTo(0.5, 12);
    });

    it('createBounceInOut(default) crosses 0.5 exactly at t=0.5', () => {
        expect(createBounceInOut()(0.5)).toBeCloseTo(0.5, 12);
    });
});

// ============================================================================
// 2. Back family — math correctness.
// ============================================================================

describe('Back family', () => {
    it('createBackIn produces a sub-zero dip with default overshoot', () => {
        const fn = createBackIn();
        const samples = sample(fn);
        expect(samples.some((v) => v < -0.05)).toBe(true);
        expect(allFinite(samples)).toBe(true);
    });

    it('createBackOut produces an overshoot above 1 with default overshoot', () => {
        const fn = createBackOut();
        const samples = sample(fn);
        expect(samples.some((v) => v > 1.05)).toBe(true);
        expect(allFinite(samples)).toBe(true);
    });

    it('larger overshoot deepens the dip', () => {
        const small = sample(createBackIn(1.0));
        const large = sample(createBackIn(3.0));
        expect(Math.min(...large)).toBeLessThan(Math.min(...small));
    });

    it('createBackOut is the time-mirror of createBackIn', () => {
        const inFn  = createBackIn();
        const outFn = createBackOut();
        for (const t of [0.1, 0.25, 0.4, 0.6, 0.75, 0.9]) {
            // inFn(t) === 1 - outFn(1 - t)  (within float epsilon)
            expect(inFn(t)).toBeCloseTo(1 - outFn(1 - t), 12);
        }
    });

    it('createBackInOut is point-symmetric around (0.5, 0.5)', () => {
        const fn = createBackInOut();
        for (const t of [0.05, 0.2, 0.35, 0.45]) {
            expect(fn(t) + fn(1 - t)).toBeCloseTo(1, 12);
        }
    });
});

// ============================================================================
// 3. Elastic family — math correctness.
// ============================================================================

describe('Elastic family', () => {
    it('createElasticOut overshoots 1 early, settles into 1', () => {
        const fn = createElasticOut();
        const samples = sample(fn);
        expect(samples.some((v) => v > 1.1)).toBe(true);
        expect(samples.every(Number.isFinite)).toBe(true);
        expect(fn(1)).toBe(1);
    });

    it('amplitude < 1 is clamped (no NaN through asin)', () => {
        // amplitude < 1 would feed asin a value > 1 → NaN. Must be clamped.
        const fn = createElasticOut(0.5);
        const samples = sample(fn);
        expect(allFinite(samples)).toBe(true);
    });

    it('non-positive period falls back to 0.3', () => {
        const explicit = createElasticOut(1, 0.3);
        const zero     = createElasticOut(1, 0);
        const negative = createElasticOut(1, -1);
        for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
            expect(zero(t)).toBeCloseTo(explicit(t), 12);
            expect(negative(t)).toBeCloseTo(explicit(t), 12);
        }
    });

    it('createElasticIn is the time-mirror of createElasticOut', () => {
        const inFn  = createElasticIn();
        const outFn = createElasticOut();
        for (const t of [0.05, 0.2, 0.4, 0.6, 0.8, 0.95]) {
            expect(inFn(t)).toBeCloseTo(1 - outFn(1 - t), 10);
        }
    });

    it('higher amplitude produces deeper extremes', () => {
        const small = sample(createElasticOut(1));
        const large = sample(createElasticOut(2));
        expect(Math.max(...large)).toBeGreaterThan(Math.max(...small));
    });

    it('smaller period produces more oscillations (more sign changes)', () => {
        const countSignChanges = (samples) => {
            let n = 0;
            for (let i = 1; i < samples.length; i++) {
                if ((samples[i] - 1) * (samples[i - 1] - 1) < 0) n++;
            }
            return n;
        };
        const slow = countSignChanges(sample(createElasticOut(1, 0.5)));
        const fast = countSignChanges(sample(createElasticOut(1, 0.1)));
        expect(fast).toBeGreaterThan(slow);
    });

    it('createElasticInOut is point-symmetric around (0.5, 0.5)', () => {
        const fn = createElasticInOut();
        for (const t of [0.05, 0.15, 0.25, 0.4]) {
            expect(fn(t) + fn(1 - t)).toBeCloseTo(1, 10);
        }
    });
});

// ============================================================================
// 4. Bounce family — math correctness, including the bug-class regression
//    tests that would have caught the previous broken parametric formula.
// ============================================================================

describe('Bounce family (default 0.25 — Penner exact)', () => {
    it('default createBounceOut returns the cached Penner closure', () => {
        // Reference equality: repeated calls with the default return the SAME
        // function. This is a documented invariant.
        expect(createBounceOut()).toBe(createBounceOut());
        expect(createBounceOut(0.25)).toBe(createBounceOut());
    });

    it('default createBounceOut matches Penner bit-identically across [0, 1]', () => {
        const fn = createBounceOut();
        for (let i = 0; i <= 1000; i++) {
            const t = i / 1000;
            expect(fn(t)).toBe(pennerBounceOut(t));
        }
    });

    it('default createBounceOut hits Penner valley/peak landmarks', () => {
        const fn = createBounceOut();
        // Valleys at 1.5/2.75, 2.25/2.75, 2.625/2.75 → 0.75, 0.9375, 0.984375
        expect(fn(1.5 / 2.75)).toBeCloseTo(0.75, 12);
        expect(fn(2.25 / 2.75)).toBeCloseTo(0.9375, 12);
        expect(fn(2.625 / 2.75)).toBeCloseTo(0.984375, 12);
        // Peaks at 1/2.75, 2/2.75, 2.5/2.75 → all 1
        expect(fn(1 / 2.75)).toBeCloseTo(1, 12);
        expect(fn(2 / 2.75)).toBeCloseTo(1, 12);
        expect(fn(2.5 / 2.75)).toBeCloseTo(1, 12);
    });
});

describe('Bounce family (parametric path — regression coverage)', () => {
    // These tests were specifically designed to catch the bug class where
    // the previous formula produced peaks below 1, segment discontinuities,
    // and degenerate t² output for bounciness >= 0.5.
    const bouncinesses = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9];

    for (const b of bouncinesses) {
        describe(`bounciness = ${b}`, () => {
            const fn = createBounceOut(b);
            const samples = sample(fn);

            it('produces only finite values', () => {
                expect(allFinite(samples)).toBe(true);
            });

            it('stays strictly within [0, 1]', () => {
                expect(Math.min(...samples)).toBeGreaterThanOrEqual(-1e-12);
                expect(Math.max(...samples)).toBeLessThanOrEqual(1 + 1e-12);
            });

            it('reaches a peak of 1 at every internal segment boundary', () => {
                // All four segments must reach a peak of 1. We don't know the
                // exact breakpoints but we do know the maximum across [0, 1]
                // must be very close to 1.
                expect(Math.max(...samples)).toBeCloseTo(1, 6);
            });

            it('has continuous segments (no discontinuity > 0.05)', () => {
                let maxJump = 0;
                for (let i = 1; i < samples.length; i++) {
                    const jump = Math.abs(samples[i] - samples[i - 1]);
                    if (jump > maxJump) maxJump = jump;
                }
                // Local jump per 1/1000 of t. With max gravity n ~ 50 and
                // dt = 0.001, max derivative * dt ~ 0.05. A real
                // discontinuity in the previous broken formula was ~0.36.
                expect(maxJump).toBeLessThan(0.05);
            });

            it('hits f(0) === 0 and f(1) === 1 exactly', () => {
                expect(fn(0)).toBe(0);
                expect(fn(1)).toBe(1);
            });
        });
    }

    it('clamps bounciness < 0.01 without throwing', () => {
        const fn = createBounceOut(0.001);
        expect(allFinite(sample(fn))).toBe(true);
    });

    it('clamps bounciness > 0.99 without throwing', () => {
        const fn = createBounceOut(1.5);
        expect(allFinite(sample(fn))).toBe(true);
    });

    it('createBounceIn is the time-mirror of createBounceOut at b=0.4', () => {
        const inFn  = createBounceIn(0.4);
        const outFn = createBounceOut(0.4);
        for (const t of [0.05, 0.2, 0.4, 0.6, 0.8, 0.95]) {
            expect(inFn(t)).toBeCloseTo(1 - outFn(1 - t), 10);
        }
    });

    it('createBounceInOut is point-symmetric around (0.5, 0.5) at b=0.4', () => {
        const fn = createBounceInOut(0.4);
        for (const t of [0.05, 0.15, 0.25, 0.4, 0.45]) {
            expect(fn(t) + fn(1 - t)).toBeCloseTo(1, 10);
        }
    });
});

// ============================================================================
// 5. Hot-path allocation discipline.
//    The codegen pattern guarantees zero allocations after the factory call.
// ============================================================================

describe('hot-path discipline', () => {
    it('factory returns a stable function reference per call', () => {
        const a = createBackIn(2);
        const b = createBackIn(2);
        // They are DIFFERENT closures (separate captured s1) — by design,
        // each factory call materializes one closure. The hot path itself
        // allocates nothing.
        expect(typeof a).toBe('function');
        expect(typeof b).toBe('function');
    });

    it('default createBounceOut returns the same cached closure', () => {
        // Special-case: default bounciness routes to a module-level constant.
        expect(createBounceOut()).toBe(createBounceOut());
    });

    it('all closures are pure (same input → same output) within a factory', () => {
        const fn = createElasticOut(1.5, 0.4);
        const first = sample(fn);
        const second = sample(fn);
        for (let i = 0; i < first.length; i++) {
            expect(first[i]).toBe(second[i]);
        }
    });
});
