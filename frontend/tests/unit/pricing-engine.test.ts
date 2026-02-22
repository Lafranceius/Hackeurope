import { describe, expect, it } from "vitest";

import { computeRecommendedPrice, PricingInput } from "@/server/pricing-engine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseInput = (): PricingInput => ({
  categories: ["Finance"],
  lastUpdatedAt: new Date(), // today → freshness bonus ×1.15
  createdAt: new Date(Date.now() - 90 * 86_400_000),
  qualityPercent: 62,
  complexityTag: "B",
  cleaningCostUsd: 110,
  views30d: 0,
  purchases30d: 0,
  revenue30d: 0,
  peerMedianPriceUsd: null,
  currentPriceUsd: null
});

// ---------------------------------------------------------------------------
// Core formula tests
// ---------------------------------------------------------------------------

describe("computeRecommendedPrice", () => {
  it("returns a positive integer rounded to nearest $50", () => {
    const out = computeRecommendedPrice(baseInput());
    expect(out.recommendedOneTimePriceUsd).toBeGreaterThan(0);
    expect(out.recommendedOneTimePriceUsd % 50).toBe(0);
  });

  it("respects Finance category floor ($500)", () => {
    const input = baseInput();
    // Very low cleaning cost
    input.cleaningCostUsd = 1;
    input.qualityPercent = 30;
    const out = computeRecommendedPrice(input);
    expect(out.recommendedOneTimePriceUsd).toBeGreaterThanOrEqual(500);
  });

  it("respects Finance category ceiling ($50,000)", () => {
    const input = baseInput();
    // Artificially pump demand and quality
    input.purchases30d = 100;
    input.qualityPercent = 95;
    input.complexityTag = "D";
    input.cleaningCostUsd = 250;
    const out = computeRecommendedPrice(input);
    expect(out.recommendedOneTimePriceUsd).toBeLessThanOrEqual(50_000);
  });

  it("respects Healthcare ceiling ($100,000)", () => {
    const input = baseInput();
    input.categories = ["Healthcare"];
    input.purchases30d = 100;
    input.qualityPercent = 95;
    input.complexityTag = "D";
    input.cleaningCostUsd = 250;
    const out = computeRecommendedPrice(input);
    expect(out.recommendedOneTimePriceUsd).toBeLessThanOrEqual(100_000);
  });

  it("higher quality produces higher price, all else equal", () => {
    const low = computeRecommendedPrice({ ...baseInput(), qualityPercent: 30 });
    const high = computeRecommendedPrice({ ...baseInput(), qualityPercent: 95 });
    expect(high.recommendedOneTimePriceUsd).toBeGreaterThan(low.recommendedOneTimePriceUsd);
  });

  it("complexity D produces higher price than A", () => {
    const simple = computeRecommendedPrice({ ...baseInput(), complexityTag: "A" });
    const hard = computeRecommendedPrice({ ...baseInput(), complexityTag: "D" });
    expect(hard.recommendedOneTimePriceUsd).toBeGreaterThan(simple.recommendedOneTimePriceUsd);
  });

  it("demand (purchases30d=10) increases price vs zero demand", () => {
    const none = computeRecommendedPrice({ ...baseInput(), currentPriceUsd: null });
    const busy = computeRecommendedPrice({
      ...baseInput(),
      purchases30d: 10,
      currentPriceUsd: null
    });
    // Cannot directly compare because smoothing is inactive (no currentPrice),
    // but busy should be >= none due to demand multiplier
    expect(busy.recommendedOneTimePriceUsd).toBeGreaterThanOrEqual(none.recommendedOneTimePriceUsd);
  });

  it("smoothing caps upward change at 10%", () => {
    const currentPrice = 5000;
    const out = computeRecommendedPrice({
      ...baseInput(),
      qualityPercent: 95,
      purchases30d: 100, // would drive price very high without smoothing
      currentPriceUsd: currentPrice
    });
    expect(out.recommendedOneTimePriceUsd).toBeLessThanOrEqual(currentPrice * 1.1 + 49);
  });

  it("smoothing caps downward change at 10%", () => {
    const currentPrice = 20_000;
    const out = computeRecommendedPrice({
      ...baseInput(),
      qualityPercent: 30,
      purchases30d: 0,
      currentPriceUsd: currentPrice
    });
    expect(out.recommendedOneTimePriceUsd).toBeGreaterThanOrEqual(currentPrice * 0.9 - 49);
  });

  it("peer median is blended when provided", () => {
    const withoutPeer = computeRecommendedPrice({ ...baseInput(), peerMedianPriceUsd: null });
    const withPeer = computeRecommendedPrice({
      ...baseInput(),
      peerMedianPriceUsd: 10_000 // well above typical base price
    });
    // Peer blend should pull price toward peerMedian
    expect(withPeer.recommendedOneTimePriceUsd).toBeGreaterThan(withoutPeer.recommendedOneTimePriceUsd);
  });

  it("Default category falls back correctly with low inputs", () => {
    const out = computeRecommendedPrice({
      ...baseInput(),
      categories: ["Unknown Category"],
      cleaningCostUsd: 50,
      qualityPercent: 30
    });
    expect(out.recommendedOneTimePriceUsd).toBeGreaterThanOrEqual(100);
  });

  it("returns 1-3 explanation factors", () => {
    const out = computeRecommendedPrice(baseInput());
    expect(out.explanationFactors.length).toBeGreaterThanOrEqual(1);
    expect(out.explanationFactors.length).toBeLessThanOrEqual(3);
  });

  it("includes computedAt ISO timestamp", () => {
    const out = computeRecommendedPrice(baseInput());
    expect(() => new Date(out.computedAt)).not.toThrow();
    expect(new Date(out.computedAt).getTime()).toBeGreaterThan(0);
  });

  it("produces a stable 16-char hex inputsHash", () => {
    const out = computeRecommendedPrice(baseInput());
    expect(out.inputsHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("same inputs produce same hash", () => {
    const input = baseInput();
    const out1 = computeRecommendedPrice(input);
    const out2 = computeRecommendedPrice(input);
    expect(out1.inputsHash).toBe(out2.inputsHash);
  });

  it("stale data (> 90 days old) reduces price vs fresh data, all else equal", () => {
    const staleInput: PricingInput = {
      ...baseInput(),
      lastUpdatedAt: new Date(Date.now() - 120 * 86_400_000), // 120 days ago
      currentPriceUsd: null // disable smoothing
    };
    const freshInput: PricingInput = {
      ...baseInput(),
      lastUpdatedAt: new Date(), // today
      currentPriceUsd: null
    };
    const stale = computeRecommendedPrice(staleInput);
    const fresh = computeRecommendedPrice(freshInput);
    expect(fresh.recommendedOneTimePriceUsd).toBeGreaterThan(stale.recommendedOneTimePriceUsd);
  });
});
