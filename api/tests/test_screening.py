from api.core.enums import RiskMode, ScreenCategory
from api.core.models import SheetProfile, TableProfile, WorkbookSummary
from api.screening.rules_engine import evaluate_screening_rules


def test_evaluate_screening_rules_category_a():
    summary = WorkbookSummary(
        filename="test.xlsx",
        file_path="test.xlsx",
        file_size=1000,
        extension=".xlsx",
        file_hash="hash",
        sheet_names=["Sheet1"],
        hidden_sheets=[],
        total_merged_cells=0,
        total_formulas=0,
    )

    sheet_profiles = [
        SheetProfile(
            sheet_name="Sheet1",
            used_range="A1:B10",
            blank_rows=0,
            blank_cols=0,
            merged_cells_count=0,
            comments_count=0,
            formulas_count=0,
            probable_title_rows=1,
            document_like=False,
        )
    ]

    table_profiles = [
        TableProfile(
            sheet_name="Sheet1",
            range_ref="A1:B10",
            inferred_headers=["Col1", "Col2"],
            column_types={"Col1": "int", "Col2": "str"},
            parse_rates={"Col1": 1.0, "Col2": 1.0},
            ambiguous_columns=[],
            integrity_risks=[],
            complexity_flags=[],
        )
    ]

    category, triggers, issues = evaluate_screening_rules(
        summary, sheet_profiles, table_profiles, RiskMode.MEDIUM
    )

    assert category == ScreenCategory.A
    assert len(triggers) == 0
    assert len(issues) == 0


def test_evaluate_screening_rules_category_b():
    summary = WorkbookSummary(
        filename="test.xlsx",
        file_path="test.xlsx",
        file_size=1000,
        extension=".xlsx",
        file_hash="hash",
        sheet_names=["Sheet1"],
        hidden_sheets=[],
        total_merged_cells=0,
        total_formulas=0,
    )

    sheet_profiles = [
        SheetProfile(
            sheet_name="Sheet1",
            used_range="A1:B10",
            blank_rows=0,
            blank_cols=0,
            merged_cells_count=0,
            comments_count=0,
            formulas_count=0,
            probable_title_rows=1,
            document_like=False,
        )
    ]

    table_profiles = [
        TableProfile(
            sheet_name="Sheet1",
            range_ref="A1:B10",
            inferred_headers=["Date", "Amount"],
            column_types={"Date": "str", "Amount": "float"},
            parse_rates={"Date": 1.0, "Amount": 1.0},
            ambiguous_columns=["Date"],
            integrity_risks=[],
            complexity_flags=[],
        )
    ]

    category, triggers, issues = evaluate_screening_rules(
        summary, sheet_profiles, table_profiles, RiskMode.MEDIUM
    )

    assert category == ScreenCategory.B
    assert "Ambiguous columns detected" in triggers
    assert len(issues) == 1
    assert issues[0].column_name == "Date"
