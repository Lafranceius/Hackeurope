export type PlaceholderComplexityTag = "A" | "B" | "C" | "D";

export type DatasetAssessmentResult = {
  PLACEHOLDER_QUALITY_PERCENT: number;
  PLACEHOLDER_COMPLEXITY_TAG: PlaceholderComplexityTag;
  PLACEHOLDER_CLEANING_COST_USD: number;
  PLACEHOLDER_IMPROVED_QUALITY_PERCENT: number;
};

export type DatasetAssessmentInput = {
  fileUrl?: string;
  fileBytes?: Uint8Array;
  fileName?: string;
  fileSize?: number;
};

const PLACEHOLDER_BASE_RESULT = {
  PLACEHOLDER_QUALITY_PERCENT: 62,
  PLACEHOLDER_COMPLEXITY_TAG: "B" as const,
  PLACEHOLDER_CLEANING_COST_USD: 110
};

export const assessDatasetFile = async (_input: DatasetAssessmentInput): Promise<DatasetAssessmentResult> => {
  const PLACEHOLDER_IMPROVED_QUALITY_PERCENT = Math.min(PLACEHOLDER_BASE_RESULT.PLACEHOLDER_QUALITY_PERCENT + 20, 95);

  return {
    ...PLACEHOLDER_BASE_RESULT,
    PLACEHOLDER_IMPROVED_QUALITY_PERCENT
  };
};
