import { Decimal } from "@prisma/client/runtime/library";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PricingInput {
  datasetId: string;
  currentPrice: number;
  
  // Dataset Attributes
  category: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  rowCount?: number; // Optional if not known
  
  // Assessment (Quality/Complexity)
  // These might come from a metadata field or future "Assessment" model
  qualityScore?: number; // 0-100
  complexity?: "A" | "B" | "C" | "D"; // D is hardest
  cleaningCostUsd?: number;

  // Signals (30d)
  views30d: number;
  purchases30d: number;
  conversionRate30d: number;
  
  // Config
  minPrice: number;
  maxPrice: number;
  maxWeeklyChangePct: number;
}

export interface PricingOutput {
  recommendedPrice: number;
  explanation: {
    factor: string;
    impact: "HIGH" | "MEDIUM" | "LOW";
    direction: "UP" | "DOWN" | "NEUTRAL";
    description: string;
  }[];
  computedAt: Date;
  inputsHash: string;
}

// -----------------------------------------------------------------------------
// Constants & Baselines
// -----------------------------------------------------------------------------

const BASE_PRICES_BY_CATEGORY: Record<string, number> = {
  "Healthcare": 5000,
  "Financial": 8000,
  "Geospatial": 3000,
  "Retail": 2000,
  "Marketing": 1500,
  // Default fallback
  "Other": 1000
};

const COMPLEXITY_MULTIPLIER = {
  "A": 1.0,
  "B": 1.5,
  "C": 2.5,
  "D": 4.0
};

// -----------------------------------------------------------------------------
// Logic
// -----------------------------------------------------------------------------

export function computeRecommendedPrice(input: PricingInput): PricingOutput {
  const {
    category,
    qualityScore = 70, // Default average quality
    complexity = "A",
    cleaningCostUsd = 0,
    views30d,
    purchases30d,
    conversionRate30d,
    currentPrice,
    minPrice,
    maxPrice,
    maxWeeklyChangePct
  } = input;

  // 1. Establish Baseline
  // Use category anchor or fallback
  let base = BASE_PRICES_BY_CATEGORY[category] || BASE_PRICES_BY_CATEGORY["Other"];
  
  // 2. Apply Quality Modifier (0.5x to 1.5x)
  // Score 50 is neutral (1.0). 
  // Score 100 -> 1.5x
  // Score 0 -> 0.5x
  const qualityMod = 0.5 + (qualityScore / 100);
  
  // 3. Apply Complexity/Volume Modifier
  const complexityMod = COMPLEXITY_MULTIPLIER[complexity] || 1.0;

  // 4. Calculate Intrinsic Value
  let intrinsicPrice = base * qualityMod * complexityMod;
  
  // Ensure we cover cleaning cost + 30% margin if provided
  if (cleaningCostUsd > 0) {
    const costFloor = cleaningCostUsd * 1.3;
    if (intrinsicPrice < costFloor) {
      intrinsicPrice = costFloor;
    }
  }

  // 5. Apply Market Demand Signals
  // High demand -> price up
  // Low demand -> price down (to a limit)
  
  let demandMod = 1.0;
  const demandExplanations: PricingOutput["explanation"] = [];

  // Simple heuristic: 
  // If conversion > 5% and views > 100 -> High Demand (+20%)
  // If conversion < 1% and views > 100 -> Low Demand (-10%)
  
  if (views30d > 50) {
    if (conversionRate30d > 0.05) {
      demandMod += 0.20;
      demandExplanations.push({
        factor: "High Demand",
        impact: "HIGH",
        direction: "UP",
        description: "Conversion rate is strong (>5%)."
      });
    } else if (conversionRate30d < 0.01) {
      demandMod -= 0.10;
      demandExplanations.push({
        factor: "Low Conversion",
        impact: "MEDIUM",
        direction: "DOWN",
        description: "Many views but few purchases."
      });
    }
  }

  // Boost for recent purchases
  if (purchases30d > 5) {
    demandMod += 0.10;
    demandExplanations.push({
      factor: "Sales Velocity",
      impact: "MEDIUM",
      direction: "UP",
      description: "Recent sales indicate strong fit."
    });
  }

  let recommended = intrinsicPrice * demandMod;

  // 6. Apply Smoothing & Constraints
  // Don't swing more than maxWeeklyChangePct from currentPrice (if currentPrice is > 0)
  // If currentPrice is 0 (new), we just take the recommended.
  
  if (currentPrice > 0) {
    const maxChange = currentPrice * (maxWeeklyChangePct / 100);
    const lowerBound = currentPrice - maxChange;
    const upperBound = currentPrice + maxChange;

    if (recommended < lowerBound) {
      recommended = lowerBound;
      demandExplanations.push({
        factor: "Stability Buffer",
        impact: "LOW",
        direction: "UP",
        description: "Capped decrease to prevent price shock."
      });
    } else if (recommended > upperBound) {
      recommended = upperBound;
      demandExplanations.push({
        factor: "Stability Buffer",
        impact: "LOW",
        direction: "DOWN",
        description: "Capped increase to prevent price shock."
      });
    }
  }

  // 7. Global Min/Max Bounds
  if (recommended < minPrice) recommended = minPrice;
  if (recommended > maxPrice) recommended = maxPrice;

  // Round to nearest 10 or 50 or 100 depending on magnitude
  recommended = roundPrice(recommended);

  // Default explanation if none
  if (demandExplanations.length === 0) {
    demandExplanations.push({
      factor: "Market Baseline",
      impact: "MEDIUM",
      direction: "NEUTRAL",
      description: "Price aligns with category standards."
    });
  }

  return {
    recommendedPrice: recommended,
    explanation: demandExplanations,
    computedAt: new Date(),
    inputsHash: JSON.stringify(input), // Simple hash for now
  };
}

function roundPrice(price: number): number {
  if (price < 100) return Math.round(price);
  if (price < 1000) return Math.round(price / 10) * 10;
  return Math.round(price / 50) * 50;
}
