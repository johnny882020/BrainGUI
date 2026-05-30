import { CognitiveLoadTracker } from "../sensors/touch/CognitiveLoadTracker";

describe("CognitiveLoadTracker", () => {
  it("emits output on tap", () => {
    const outputs: number[] = [];
    const tracker = new CognitiveLoadTracker((out) => outputs.push(out.cognitiveLoad));
    tracker.recordTap();
    expect(outputs.length).toBeGreaterThan(0);
  });

  it("cognitive load is between 0 and 1", () => {
    const outputs: number[] = [];
    const tracker = new CognitiveLoadTracker((out) => outputs.push(out.cognitiveLoad));
    for (let i = 0; i < 20; i++) {
      tracker.recordTap();
      if (i % 3 === 0) tracker.recordError();
    }
    for (const load of outputs) {
      expect(load).toBeGreaterThanOrEqual(0);
      expect(load).toBeLessThanOrEqual(1);
    }
  });

  it("errors increase cognitive load", () => {
    const base: number[] = [];
    const withErrors: number[] = [];

    const t1 = new CognitiveLoadTracker((out) => base.push(out.cognitiveLoad));
    for (let i = 0; i < 10; i++) {
      t1.recordTap();
      // Even timing → low variance
    }

    const t2 = new CognitiveLoadTracker((out) => withErrors.push(out.cognitiveLoad));
    for (let i = 0; i < 10; i++) {
      t2.recordTap();
      t2.recordError();
    }

    const lastBase = base[base.length - 1] ?? 0;
    const lastError = withErrors[withErrors.length - 1] ?? 0;
    expect(lastError).toBeGreaterThan(lastBase);
  });
});
