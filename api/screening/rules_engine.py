from typing import List, Tuple

from api.core.enums import IssueType, RiskMode, ScreenCategory, Severity
from api.core.models import Issue, SheetProfile, TableProfile, WorkbookSummary


def evaluate_screening_rules(
    workbook_summary: WorkbookSummary,
    sheet_profiles: List[SheetProfile],
    table_profiles: List[TableProfile],
    risk_mode: RiskMode,
) -> Tuple[ScreenCategory, List[str], List[Issue]]:

    hard_gate_triggers = []
    issues = []

    category = ScreenCategory.A

    for tp in table_profiles:
        if tp.ambiguous_columns:
            category = max(category, ScreenCategory.B)
            hard_gate_triggers.append("Ambiguous columns detected")
            for col in tp.ambiguous_columns:
                issues.append(
                    Issue(
                        issue_type=IssueType.AMBIGUITY,
                        severity=Severity.HIGH,
                        description=f"Ambiguous column: {col}",
                        sheet_name=tp.sheet_name,
                        column_name=col,
                    )
                )

        if tp.complexity_flags:
            category = max(category, ScreenCategory.C)
            hard_gate_triggers.append("Complex table structure")

    if workbook_summary.total_merged_cells > 100:
        category = max(category, ScreenCategory.C)
        hard_gate_triggers.append("High number of merged cells")

    return category, hard_gate_triggers, issues
