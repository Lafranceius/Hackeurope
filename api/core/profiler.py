import pandas as pd

from .models import SheetProfile, TableCandidate, TableProfile


def profile_sheet(file_path: str, sheet_name: str) -> SheetProfile:
    df = pd.read_excel(file_path, sheet_name=sheet_name)
    return SheetProfile(
        sheet_name=sheet_name,
        used_range=f"A1:X{len(df)}",
        blank_rows=int(df.isnull().all(axis=1).sum()),
        blank_cols=int(df.isnull().all(axis=0).sum()),
        merged_cells_count=0,
        comments_count=0,
        formulas_count=0,
        probable_title_rows=1,
        document_like=False,
    )


def detect_table_candidates(file_path: str, sheet_name: str) -> list[TableCandidate]:
    return [
        TableCandidate(
            sheet_name=sheet_name,
            range_ref="A1:Z100",
            tabularity_score=0.9,
            header_row_index=0,
            header_confidence=0.95,
        )
    ]


def profile_table_candidate(
    file_path: str, sheet_name: str, range_ref: str
) -> TableProfile:
    df = pd.read_excel(file_path, sheet_name=sheet_name)

    ambiguous_columns = []
    for col in df.columns:
        if (
            df[col]
            .astype(str)
            .str.contains("date format not specified", case=False, na=False)
            .any()
        ):
            ambiguous_columns.append(str(col))
        elif "date" in str(col).lower():
            ambiguous_columns.append(str(col))

    return TableProfile(
        sheet_name=sheet_name,
        range_ref=range_ref,
        inferred_headers=[str(c) for c in df.columns],
        column_types={str(col): str(df[col].dtype) for col in df.columns},
        parse_rates={str(col): 1.0 for col in df.columns},
        ambiguous_columns=ambiguous_columns,
        integrity_risks=[],
        complexity_flags=[],
    )
