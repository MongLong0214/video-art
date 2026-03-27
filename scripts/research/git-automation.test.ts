import { describe, it, expect } from "vitest";
import { CrashCounter, BudgetTracker } from "./git-automation.js";

describe("CrashCounter", () => {
  it("starts at 0", () => {
    const c = new CrashCounter();
    expect(c.count).toBe(0);
    expect(c.shouldStop()).toBe(false);
  });

  it("increments on crash", () => {
    const c = new CrashCounter();
    c.recordCrash();
    expect(c.count).toBe(1);
  });

  it("resets on success", () => {
    const c = new CrashCounter();
    c.recordCrash();
    c.recordCrash();
    c.recordSuccess();
    expect(c.count).toBe(0);
  });

  it("stops at 5 consecutive crashes", () => {
    const c = new CrashCounter();
    for (let i = 0; i < 5; i++) c.recordCrash();
    expect(c.shouldStop()).toBe(true);
  });

  it("does not stop at 4 crashes", () => {
    const c = new CrashCounter();
    for (let i = 0; i < 4; i++) c.recordCrash();
    expect(c.shouldStop()).toBe(false);
  });

  it("resets after success even with 4 prior crashes", () => {
    const c = new CrashCounter();
    for (let i = 0; i < 4; i++) c.recordCrash();
    c.recordSuccess();
    expect(c.shouldStop()).toBe(false);
    expect(c.count).toBe(0);
  });
});

describe("BudgetTracker", () => {
  it("unlimited when no budget set", () => {
    const b = new BudgetTracker();
    for (let i = 0; i < 1000; i++) b.increment();
    expect(b.isExhausted()).toBe(false);
  });

  it("stops at budget limit", () => {
    const b = new BudgetTracker(5);
    for (let i = 0; i < 5; i++) b.increment();
    expect(b.isExhausted()).toBe(true);
  });

  it("does not stop before budget", () => {
    const b = new BudgetTracker(5);
    for (let i = 0; i < 4; i++) b.increment();
    expect(b.isExhausted()).toBe(false);
  });

  it("tracks current count", () => {
    const b = new BudgetTracker(10);
    b.increment();
    b.increment();
    expect(b.current).toBe(2);
  });
});
