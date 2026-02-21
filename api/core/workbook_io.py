import hashlib
import os
from typing import Any, Dict

import pandas as pd


def get_file_hash(file_path: str) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()


def read_workbook_metadata(file_path: str) -> Dict[str, Any]:
    file_size = os.path.getsize(file_path)
    file_hash = get_file_hash(file_path)
    xl = pd.ExcelFile(file_path)
    sheet_names = xl.sheet_names

    return {
        "filename": os.path.basename(file_path),
        "file_path": file_path,
        "file_size": file_size,
        "extension": os.path.splitext(file_path)[1],
        "file_hash": file_hash,
        "sheet_names": sheet_names,
        "hidden_sheets": [],
        "total_merged_cells": 0,
        "total_formulas": 0,
    }


def read_sheet_data(file_path: str, sheet_name: str) -> pd.DataFrame:
    return pd.read_excel(file_path, sheet_name=sheet_name)


def write_processed_workbook(output_path: str, sheets_data: Dict[str, pd.DataFrame]):
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        for sheet_name, df in sheets_data.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)
