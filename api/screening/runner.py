import os

from api.core.enums import RiskMode, ScreenCategory
from api.core.models import ScreeningReport, UploaderQuestion, WorkbookSummary
from api.core.profiler import (
    detect_table_candidates,
    profile_sheet,
    profile_table_candidate,
)
from api.core.workbook_io import read_workbook_metadata
from api.screening.rules_engine import evaluate_screening_rules


def run_screening(
    file_path: str, risk_mode: RiskMode = RiskMode.MEDIUM
) -> ScreeningReport:
    metadata = read_workbook_metadata(file_path)
    workbook_summary = WorkbookSummary(**metadata)

    sheet_profiles = []
    table_candidates = []
    table_profiles = []

    for sheet_name in workbook_summary.sheet_names:
        sp = profile_sheet(file_path, sheet_name)
        sheet_profiles.append(sp)

        tcs = detect_table_candidates(file_path, sheet_name)
        table_candidates.extend(tcs)

        for tc in tcs:
            tp = profile_table_candidate(file_path, sheet_name, tc.range_ref)
            table_profiles.append(tp)

    category, hard_gate_triggers, issues = evaluate_screening_rules(
        workbook_summary, sheet_profiles, table_profiles, risk_mode
    )

    questions = []
    if category == ScreenCategory.B:
        questions.append(
            UploaderQuestion(
                question_text="Please clarify the date format used in the document.",
                why_it_matters="Ambiguous dates can lead to incorrect data processing.",
                example_choices=["MM/DD/YYYY", "DD/MM/YYYY"],
            )
        )

    report = ScreeningReport(
        file_path=file_path,
        file_hash=workbook_summary.file_hash,
        risk_mode=risk_mode,
        workbook_summary=workbook_summary,
        sheet_summaries=sheet_profiles,
        detected_tables=table_candidates,
        issues=issues,
        hard_gate_triggers=hard_gate_triggers,
        category=category,
        overall_confidence=0.85,
        requires_uploader_input=questions,
        review_requirements=["Review row counts"]
        if category in [ScreenCategory.C, ScreenCategory.D]
        else [],
        recommended_processing_route="normalizer"
        if category == ScreenCategory.A
        else "hybrid",
        safe_actions_possible=["extract_tables", "normalize_headers"],
        screening_notes="Automated screening completed.",
    )

    report_dir = os.path.dirname(file_path)
    base_name = os.path.splitext(os.path.basename(file_path))[0]

    json_path = os.path.join(report_dir, f"{base_name}_screening_report.json")
    with open(json_path, "w") as f:
        f.write(report.model_dump_json(indent=2))

    md_path = os.path.join(report_dir, f"{base_name}_screening_report.md")
    with open(md_path, "w") as f:
        f.write(f"# Screening Report for {workbook_summary.filename}\n\n")
        f.write(f"**Category:** {category.value}\n")
        f.write(f"**Risk Mode:** {risk_mode.value}\n")
        f.write(f"**Confidence:** {report.overall_confidence}\n\n")
        f.write("## Issues\n")
        for issue in issues:
            f.write(f"- {issue.severity.value.upper()}: {issue.description}\n")

    return report
