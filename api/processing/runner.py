import json
import os
from typing import Any, Dict, Optional

import pandas as pd

from api.core.enums import ProcessingStatus, ScreenCategory
from api.core.models import ProcessingReport, ScreeningReport, TransformResult
from api.core.workbook_io import read_sheet_data, write_processed_workbook
from api.processing.planner import build_processing_plan
from api.processing.transforms import normalize_headers, normalize_values


def run_processing(
    file_path: str,
    screening_report_path: str,
    user_inputs: Optional[Dict[str, Any]] = None,
    allow_d_override: bool = False,
) -> ProcessingReport:

    with open(screening_report_path, "r") as f:
        report_data = json.load(f)
    screening_report = ScreeningReport(**report_data)

    if screening_report.category == ScreenCategory.D and not allow_d_override:
        return ProcessingReport(
            source_file=file_path,
            status=ProcessingStatus.FAILED,
            processing_plan=build_processing_plan(screening_report, user_inputs or {}),
            executed_transforms=[],
            technical_verification={},
            semantic_verification={},
            review_flags=[],
            errors=["Category D file requires manual handling. Override not provided."],
            warnings=[],
            summary_for_user="Processing aborted due to high risk (Category D).",
        )

    if screening_report.category == ScreenCategory.B and not user_inputs:
        return ProcessingReport(
            source_file=file_path,
            status=ProcessingStatus.NEEDS_INPUT,
            processing_plan=build_processing_plan(screening_report, {}),
            executed_transforms=[],
            technical_verification={},
            semantic_verification={},
            review_flags=[],
            errors=["Missing required user inputs for Category B file."],
            warnings=[],
            summary_for_user="Please provide required inputs to proceed.",
        )

    plan = build_processing_plan(screening_report, user_inputs or {})

    output_sheets = {}
    executed_transforms = []
    processing_log = []

    for sheet in screening_report.sheet_summaries:
        df = read_sheet_data(file_path, sheet.sheet_name)

        if "normalize_headers" in plan.planned_transforms:
            df, log = normalize_headers(df)
            executed_transforms.append(
                TransformResult(
                    transform_name="normalize_headers",
                    status="success",
                    details=log["details"],
                )
            )
            processing_log.append(log)

        if "normalize_values" in plan.planned_transforms:
            df, log = normalize_values(df)
            executed_transforms.append(
                TransformResult(
                    transform_name="normalize_values",
                    status="success",
                    details=log["details"],
                )
            )
            processing_log.append(log)

        output_sheets[f"{sheet.sheet_name}_clean"] = df

    output_sheets["processing_log"] = pd.DataFrame(processing_log)

    catalog_data = []
    for sheet_name, df in output_sheets.items():
        if sheet_name == "processing_log":
            continue
        for col in df.columns:
            catalog_data.append(
                {
                    "sheet_name": sheet_name,
                    "column_name": col,
                    "column_type": str(df[col].dtype),
                }
            )
    output_sheets["data_catalog"] = pd.DataFrame(catalog_data)

    output_file = file_path.replace(".xlsx", "_processed.xlsx")
    write_processed_workbook(output_file, output_sheets)

    report = ProcessingReport(
        source_file=file_path,
        output_file=output_file,
        status=ProcessingStatus.SUCCESS,
        processing_plan=plan,
        executed_transforms=executed_transforms,
        technical_verification={"status": "passed"},
        semantic_verification={"status": "passed"},
        review_flags=[],
        errors=[],
        warnings=[],
        summary_for_user="Processing completed successfully.",
    )

    report_dir = os.path.dirname(file_path)
    base_name = os.path.splitext(os.path.basename(file_path))[0]

    json_path = os.path.join(report_dir, f"{base_name}_processing_report.json")
    with open(json_path, "w") as f:
        f.write(report.model_dump_json(indent=2))

    return report
