/**
 * Dataset Assessment Pipeline
 *
 * Reads the actual uploaded file and runs four analysis passes:
 *   1. check_duplicates        — identical row detection
 *   2. inspect_column          — null %, unique %, inferred type per column
 *   3. check_type_consistency  — mixed-type detection on suspicious columns
 *   4. find_outliers           — IQR-based outlier detection on numeric columns
 *
 * Scores quality 30–95 based on real findings, deducting for nulls, duplicates,
 * mixed types, and outliers. Produces actionable cleaning recommendations.
 * No external service or API key required.
 */

import { readFile } from "fs/promises";
import path from "path";

import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Public types (unchanged API surface — existing UI still works)
// ---------------------------------------------------------------------------

export type PlaceholderComplexityTag = "A" | "B" | "C" | "D";

export type DatasetAssessmentResult = {
  PLACEHOLDER_QUALITY_PERCENT: number;
  PLACEHOLDER_COMPLEXITY_TAG: PlaceholderComplexityTag;
  PLACEHOLDER_CLEANING_COST_USD: number;
  PLACEHOLDER_IMPROVED_QUALITY_PERCENT: number;
  issues: string[];
  summary: string;
  agentAssessed: boolean;
};

export type DatasetAssessmentInput = {
  fileUrl?: string;
  fileBytes?: Uint8Array;
  fileName?: string;
  fileSize?: number;
};

// ---------------------------------------------------------------------------
// File reading + parsing
// ---------------------------------------------------------------------------

type ParsedSample = {
  headers: string[];
  rows: string[][];
  totalRowsInSample: number;
  fileType: string;
};

const MAX_SAMPLE_ROWS = 80;

const readFileBytes = async (input: DatasetAssessmentInput): Promise<Buffer> => {
  if (input.fileBytes) return Buffer.from(input.fileBytes);

  if (input.fileUrl) {
    if (input.fileUrl.startsWith("/uploads/")) {
      return readFile(path.join(process.cwd(), input.fileUrl.slice(1)));
    }
    if (input.fileUrl.startsWith("http")) {
      const res = await fetch(input.fileUrl);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    }
  }
  throw new Error("No file source");
};

const parseFileSample = async (buffer: Buffer, fileName: string): Promise<ParsedSample> => {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".json") {
    const parsed = JSON.parse(buffer.toString("utf8"));
    const records: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed
      : (parsed.data ?? parsed.records ?? [parsed]);
    const headers = Object.keys(records[0] ?? {});
    const rows = records
      .slice(0, MAX_SAMPLE_ROWS)
      .map((r) => headers.map((h) => String(r[h] ?? "")));
    return { headers, rows, totalRowsInSample: rows.length, fileType: "JSON" };
  }

  if (ext === ".csv" || ext === ".xlsx") {
    const wb = XLSX.read(buffer, { type: "buffer", sheetRows: MAX_SAMPLE_ROWS + 1 });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false });
    const [headerRow = [], ...dataRows] = raw;
    return {
      headers: headerRow,
      rows: dataRows.slice(0, MAX_SAMPLE_ROWS),
      totalRowsInSample: dataRows.length,
      fileType: ext === ".csv" ? "CSV" : "Excel (XLSX)"
    };
  }

  if (ext === ".parquet") {
    return {
      headers: ["[binary columnar format — schema not directly readable]"],
      rows: [],
      totalRowsInSample: 0,
      fileType: "Parquet"
    };
  }

  throw new Error(`Unsupported extension: ${ext}`);
};

// ---------------------------------------------------------------------------
// LOCAL TOOL IMPLEMENTATIONS
// These run synchronously on the in-memory parsed sample — no extra API calls.
// ---------------------------------------------------------------------------

const NULL_MARKERS = new Set(["", "null", "NULL", "N/A", "n/a", "NA", "nan", "NaN", "none", "None"]);

const colIndex = (sample: ParsedSample, name: string) => {
  const idx = sample.headers.indexOf(name);
  return idx;
};

type ToolArgs = Record<string, unknown>;
type ToolResult = Record<string, unknown>;
type ToolFn = (args: ToolArgs, sample: ParsedSample) => ToolResult;

const toolImplementations: Record<string, ToolFn> = {
  /**
   * inspect_column — core recon tool.
   * Returns null rate, unique %, inferred type, and sample values.
   */
  inspect_column: (args, sample) => {
    const name = String(args.column_name ?? "");
    const idx = colIndex(sample, name);
    if (idx === -1) return { error: `Column '${name}' not found. Available: ${sample.headers.join(", ")}` };

    const values = sample.rows.map((r) => r[idx] ?? "");
    const nulls = values.filter((v) => NULL_MARKERS.has(v));
    const nonNulls = values.filter((v) => !NULL_MARKERS.has(v));
    const uniq = new Set(nonNulls);

    // Type inference
    const isNum = (v: string) => v !== "" && !isNaN(Number(v));
    const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(v);
    const numericCount = nonNulls.filter(isNum).length;
    const dateCount = nonNulls.filter((v) => !isNum(v) && isDate(v)).length;
    const n = nonNulls.length || 1;
    const inferredType =
      numericCount / n > 0.85 ? "numeric"
        : dateCount / n > 0.85 ? "date"
          : numericCount / n > 0.3 ? "mixed (text + numeric)"
            : "text";

    return {
      column: name,
      totalRows: values.length,
      nullCount: nulls.length,
      nullPercent: Math.round((nulls.length / values.length) * 100),
      uniqueCount: uniq.size,
      uniquePercent: Math.round((uniq.size / Math.max(nonNulls.length, 1)) * 100),
      inferredType,
      sampleValues: [...uniq].slice(0, 6)
    };
  },

  /**
   * check_duplicates — detects identical rows in the sample.
   */
  check_duplicates: (_args, sample) => {
    const seen = new Map<string, number>();
    for (const row of sample.rows) {
      const key = row.join("\x00");
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const duplicateRows = [...seen.values()].filter((c) => c > 1).reduce((s, c) => s + c - 1, 0);
    return {
      totalRowsInSample: sample.rows.length,
      duplicateRows,
      duplicatePercent: Math.round((duplicateRows / Math.max(sample.rows.length, 1)) * 100),
      hasDuplicates: duplicateRows > 0
    };
  },

  /**
   * check_type_consistency — counts how many values in a column match each type.
   * Best called on columns where inspect_column showed "mixed" type.
   */
  check_type_consistency: (args, sample) => {
    const name = String(args.column_name ?? "");
    const idx = colIndex(sample, name);
    if (idx === -1) return { error: `Column '${name}' not found` };

    const values = sample.rows.map((r) => r[idx] ?? "").filter((v) => !NULL_MARKERS.has(v));
    const datePattern = /^\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
    const boolPattern = /^(true|false|yes|no|1|0)$/i;

    let numeric = 0, dates = 0, booleans = 0, text = 0;
    for (const v of values) {
      if (!isNaN(Number(v))) numeric++;
      else if (boolPattern.test(v)) booleans++;
      else if (datePattern.test(v)) dates++;
      else text++;
    }

    const total = values.length || 1;
    const dominant = Math.max(numeric, dates, booleans, text);
    const dominantType =
      dominant === numeric ? "numeric"
        : dominant === dates ? "date"
          : dominant === booleans ? "boolean"
            : "text";

    return {
      column: name,
      total: values.length,
      numericCount: numeric,
      dateCount: dates,
      booleanCount: booleans,
      textCount: text,
      dominantType,
      isMixed: (total - dominant) / total > 0.1,
      mixedPercent: Math.round(((total - dominant) / total) * 100)
    };
  },

  /**
   * find_outliers — IQR-based outlier detection for numeric columns.
   */
  find_outliers: (args, sample) => {
    const name = String(args.column_name ?? "");
    const idx = colIndex(sample, name);
    if (idx === -1) return { error: `Column '${name}' not found` };

    const nums = sample.rows
      .map((r) => r[idx] ?? "")
      .filter((v) => !NULL_MARKERS.has(v) && !isNaN(Number(v)))
      .map(Number);

    if (nums.length < 5) return { column: name, isNumeric: false, reason: "Too few numeric values" };

    const sorted = [...nums].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const outliers = nums.filter((v) => v < lower || v > upper);
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;

    return {
      column: name,
      isNumeric: true,
      count: nums.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: Math.round(mean * 100) / 100,
      q1,
      q3,
      iqrFenceMin: Math.round(lower * 100) / 100,
      iqrFenceMax: Math.round(upper * 100) / 100,
      outlierCount: outliers.length,
      outlierPercent: Math.round((outliers.length / nums.length) * 100),
      sampleOutliers: outliers.slice(0, 4).map(String)
    };
  }
};

// ---------------------------------------------------------------------------
// Deterministic assessment pipeline
// Runs every tool in sequence on the actual file data — no LLM required.
// Always produces file-specific scores and actionable cleaning recommendations.
// ---------------------------------------------------------------------------

type AgentFindings = {
  qualityPercent: number;
  complexityTag: PlaceholderComplexityTag;
  cleaningCostUsd: number;
  issues: string[];
  summary: string;
};

type InspectResult = ReturnType<typeof toolImplementations.inspect_column> & {
  column: string;
  nullPercent: number;
  inferredType: string;
};

type OutlierResult = {
  isNumeric: boolean;
  outlierCount: number;
  outlierPercent: number;
  iqrFenceMin: number;
  iqrFenceMax: number;
  count: number;
};

type TypeConsistencyResult = {
  isMixed: boolean;
  mixedPercent: number;
  dominantType: string;
};

type DupResult = {
  duplicateRows: number;
  duplicatePercent: number;
  hasDuplicates: boolean;
  totalRowsInSample: number;
};

const runDeterministicAssessment = (sample: ParsedSample, fileName: string): AgentFindings => {
  // Step 1 — Duplicates
  const dup = toolImplementations.check_duplicates({}, sample) as DupResult;

  // Step 2 — Inspect every column
  const columnReports = sample.headers.map(
    (col) => toolImplementations.inspect_column({ column_name: col }, sample) as InspectResult
  );

  // Step 3 — Type consistency for mixed columns
  const typeResults = columnReports
    .filter((r) => String(r.inferredType ?? "").includes("mixed"))
    .map((r) => ({
      column: r.column,
      result: toolImplementations.check_type_consistency({ column_name: r.column }, sample) as TypeConsistencyResult
    }));

  // Step 4 — Outliers for numeric columns
  const outlierResults = columnReports
    .filter((r) => r.inferredType === "numeric")
    .map((r) => ({
      column: r.column,
      result: toolImplementations.find_outliers({ column_name: r.column }, sample) as OutlierResult
    }))
    .filter((r) => r.result.isNumeric);

  // Step 5 — Score and recommendations
  let score = 100;
  const recommendations: string[] = [];

  // Empty file
  if (sample.rows.length === 0) {
    return {
      qualityPercent: 30,
      complexityTag: "D",
      cleaningCostUsd: 50,
      issues: ["File contains no data rows — nothing to assess"],
      summary: `${sample.fileType} file has no data rows.`
    };
  }

  // Duplicates
  if (dup.hasDuplicates && dup.duplicatePercent > 2) {
    score -= Math.min(15, Math.round(dup.duplicatePercent * 0.6));
    recommendations.push(
      `Remove ${dup.duplicateRows} duplicate rows (${dup.duplicatePercent}% of sample)`
    );
  }

  // Null rates per column
  for (const col of columnReports) {
    const nullPct = Number(col.nullPercent ?? 0);
    if (nullPct > 5) {
      score -= Math.min(12, Math.round(nullPct * 0.18));
      if (nullPct > 40) {
        recommendations.push(
          `Column '${col.column}': ${nullPct}% missing — consider dropping this column`
        );
      } else if (nullPct > 15) {
        recommendations.push(
          `Column '${col.column}': ${nullPct}% missing — impute with median/mode or flag as unknown`
        );
      } else {
        recommendations.push(
          `Column '${col.column}': ${nullPct}% missing values — fill or drop affected rows`
        );
      }
    }
  }

  // Mixed types
  for (const { column, result } of typeResults) {
    if (result.isMixed && result.mixedPercent > 5) {
      score -= 8;
      recommendations.push(
        `Column '${column}': mixed types — coerce all values to ${result.dominantType} (${result.mixedPercent}% are inconsistent)`
      );
    }
  }

  // Outliers
  for (const { column, result } of outlierResults) {
    if (result.outlierPercent > 5) {
      score -= Math.min(7, Math.round(result.outlierPercent * 0.2));
      recommendations.push(
        `Column '${column}': ${result.outlierCount} outliers (${result.outlierPercent}%) outside [${result.iqrFenceMin}, ${result.iqrFenceMax}] — cap or investigate`
      );
    }
  }

  // Low cardinality check — a column that is always the same value is suspicious
  for (const col of columnReports) {
    const uniqPct = Number(col.uniquePercent ?? 100);
    const nullPct = Number(col.nullPercent ?? 0);
    if (uniqPct === 0 && nullPct < 5 && sample.rows.length > 5) {
      score -= 3;
      recommendations.push(
        `Column '${col.column}': every non-null value is identical — may be a constant or import error`
      );
    }
  }

  const qualityPercent = Math.round(Math.min(95, Math.max(30, score)));

  const complexityTag: PlaceholderComplexityTag =
    qualityPercent >= 85 ? "A"
      : qualityPercent >= 70 ? "B"
        : qualityPercent >= 55 ? "C"
          : "D";

  // Cleaning cost scales with number and severity of recommendations
  const cleaningCostUsd = Math.round(
    Math.min(
      250,
      Math.max(
        50,
        50
        + recommendations.length * 15
        + columnReports.filter((c) => Number(c.nullPercent ?? 0) > 5).length * 20
        + (dup.hasDuplicates ? 25 : 0)
        + typeResults.filter((t) => t.result.isMixed).length * 20
      )
    )
  );

  const colCount = sample.headers.length;
  const rowCount = sample.totalRowsInSample;
  const summary =
    recommendations.length === 0
      ? `${sample.fileType} with ${colCount} columns and ${rowCount} rows — data looks clean, no significant issues found.`
      : qualityPercent >= 70
        ? `${sample.fileType} with ${colCount} columns and ${rowCount} rows — ${recommendations.length} issue${recommendations.length > 1 ? "s" : ""} found, standard cleaning recommended.`
        : `${sample.fileType} with ${colCount} columns and ${rowCount} rows — ${recommendations.length} issues found, significant cleaning needed before use.`;

  return {
    qualityPercent,
    complexityTag,
    cleaningCostUsd,
    issues: recommendations.slice(0, 6),
    summary
  };
};

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export const assessDatasetFile = async (input: DatasetAssessmentInput): Promise<DatasetAssessmentResult> => {
  const fileName = input.fileName ?? path.basename(input.fileUrl ?? "file.csv");
  const fileSize = input.fileSize ?? 0;

  const buffer = await readFileBytes(input);
  const sample = await parseFileSample(buffer, fileName);

  const findings = runDeterministicAssessment(sample, fileName);

  // The program should aim at cleaning it up to 80%, so if it's below 80, bump it to 80, otherwise let it reach higher.
  const improvedQuality = Math.max(
    80,
    Math.min(95, findings.qualityPercent + Math.round(8 + (100 - findings.qualityPercent) * 0.22))
  );

  console.log(
    `[assessment] ${fileName} — quality ${findings.qualityPercent}%, ` +
    `${findings.issues.length} issues, complexity ${findings.complexityTag}, ` +
    `cleaning cost $${findings.cleaningCostUsd}`
  );

  return {
    PLACEHOLDER_QUALITY_PERCENT: findings.qualityPercent,
    PLACEHOLDER_COMPLEXITY_TAG: findings.complexityTag,
    PLACEHOLDER_CLEANING_COST_USD: findings.cleaningCostUsd,
    PLACEHOLDER_IMPROVED_QUALITY_PERCENT: improvedQuality,
    issues: findings.issues,
    summary: findings.summary,
    agentAssessed: true
  };
};
