from typing import Any, Dict

from api.core.models import ProcessingPlan, ScreeningReport


def build_processing_plan(
    screening_report: ScreeningReport, user_inputs: Dict[str, Any]
) -> ProcessingPlan:
    route = screening_report.recommended_processing_route

    transforms = ["extract_tables", "normalize_headers", "normalize_values"]
    if screening_report.category in ["C", "D"]:
        transforms.append("flag_review_rows")

    return ProcessingPlan(
        source_file=screening_report.file_path,
        screening_report_ref=screening_report.file_hash,
        selected_route=route,
        assumptions=["Headers are in the first row"],
        user_inputs_used=user_inputs or {},
        target_output_sheets=[
            f"{s.sheet_name}_clean" for s in screening_report.sheet_summaries
        ],
        planned_transforms=transforms,
        planned_validations=["row_count_check", "type_check"],
        review_policy="strict"
        if screening_report.category in ["C", "D"]
        else "standard",
        stop_conditions=["critical_parse_error"],
        rollback_strategy="abort_and_keep_original",
    )
