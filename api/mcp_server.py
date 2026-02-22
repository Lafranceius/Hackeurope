import json
import re
import string
from typing import Literal

import dateparser
import pandas as pd
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("data-formatting-tools")


def _read_file(file_path: str, header: int = 0) -> pd.DataFrame:
    """Helper to read both CSV and Excel files."""
    if file_path.endswith(".csv"):
        return pd.read_csv(file_path, header=header)
    else:
        return pd.read_excel(file_path, header=header)


def _save_file(df: pd.DataFrame, file_path: str, index: bool = False):
    """Helper to save both CSV and Excel files."""
    if file_path.endswith(".csv"):
        df.to_csv(file_path, index=index)
    else:
        df.to_excel(file_path, index=index)


@mcp.tool()
def execute_header_detection(file_path: str) -> str:
    """Detect the true header row and starting column of a data table in a file.
    Returns a raw preview of the first 15 rows for context.

    Args:
        file_path: Path to the Excel or CSV file.
    """
    try:
        if file_path.endswith(".csv"):
            df_raw = pd.read_csv(file_path, header=None, nrows=15)
        else:
            df_raw = pd.read_excel(file_path, header=None, nrows=15)
        df_raw = df_raw.fillna("")
        raw_sample = df_raw.to_dict(orient="records")
        return f"RAW_PREVIEW: {raw_sample}"
    except Exception as e:
        return f"Error reading file for header detection: {e}"


@mcp.tool()
def apply_header_and_crop(
    file_path: str, header_row_index: int, header_col_index: int
) -> str:
    """Re-read the file with the correct header row and crop empty columns from the left.
    Overwrites the file with the properly loaded and cropped data.

    Args:
        file_path: Path to the Excel or CSV file.
        header_row_index: The 0-based row index of the true header.
        header_col_index: The 0-based column index where data starts.
    """
    try:
        df = _read_file(file_path, header=header_row_index)
        if header_col_index > 0:
            df = df.iloc[:, header_col_index:]
        _save_file(df, file_path)
        return (
            f"Successfully applied header at row {header_row_index}, "
            f"cropped {header_col_index} columns. Shape: {df.shape}. "
            f"Columns: {list(df.columns)}"
        )
    except Exception as e:
        return f"Error applying header/crop: {e}"


@mcp.tool()
def detect_potential_na_strings(file_path: str) -> str:
    """Pre-scan the dataset for short punctuation-only strings that might be NA placeholders.
    Also returns a sample of the first 10 rows for context.

    Args:
        file_path: Path to the Excel or CSV file.
    """
    try:
        df = _read_file(file_path)
        potential_nas = set()
        for col in df.columns:
            str_vals = df[col].dropna().astype(str)
            for val in str_vals:
                val = val.strip()
                if 0 < len(val) <= 2 and all(c in string.punctuation for c in val):
                    potential_nas.add(val)

        sample_data = df.head(10).to_dict(orient="records")
        return f"POTENTIAL_NAS: {list(potential_nas)}\nSAMPLE: {sample_data}"
    except Exception as e:
        return f"Error detecting NAs: {e}"


@mcp.tool()
def execute_na_cleaning(
    file_path: str,
    custom_na_strings_to_wipe: list[str],
    remove_completely_empty_rows: bool,
    remove_completely_empty_columns: bool,
) -> str:
    """Clean missing data: wipe custom NA placeholder strings, remove empty rows/columns.

    Args:
        file_path: Path to the Excel or CSV file.
        custom_na_strings_to_wipe: List of strings to treat as NA (e.g., ["-", ".", "?"]).
        remove_completely_empty_rows: Whether to drop rows where all values are missing.
        remove_completely_empty_columns: Whether to drop columns where all values are missing.
    """
    try:
        df = _read_file(file_path)
        messages = []

        if custom_na_strings_to_wipe:

            def wipe_custom_na(val):
                if isinstance(val, str) and val.strip() in custom_na_strings_to_wipe:
                    return pd.NA
                return val

            df = df.map(wipe_custom_na)
            messages.append(f"Wiped custom NA strings: {custom_na_strings_to_wipe}")

        if remove_completely_empty_rows:
            initial_rows = len(df)
            df = df.dropna(axis=0, how="all")
            rows_removed = initial_rows - len(df)
            if rows_removed > 0:
                messages.append(f"Dropped {rows_removed} completely empty rows.")

        if remove_completely_empty_columns:
            initial_cols = len(df.columns)
            df = df.dropna(axis=1, how="all")
            cols_removed = initial_cols - len(df.columns)
            if cols_removed > 0:
                messages.append(f"Dropped {cols_removed} completely empty columns.")

        _save_file(df, file_path)
        return f"NA cleaning complete. {'; '.join(messages)}. Shape: {df.shape}"
    except Exception as e:
        return f"Error cleaning NAs: {e}"


@mcp.tool()
def execute_time_formatting(
    file_path: str,
    col_name: str,
    target_format: Literal[
        "%H:%M",
        "%H:%M:%S",
        "%S",
        "%d/%m/%Y",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y %H:%M:%S",
        "%m/%Y",
        "%Y",
    ],
) -> str:
    """Format a time/date column in a file to a specific target format.

    Args:
        file_path: Path to the Excel or CSV file.
        col_name: Name of the column to format.
        target_format: The target strftime format (e.g., '%H:%M', '%d/%m/%Y').
    """
    try:
        df = _read_file(file_path)

        def parse_natural_language(date_str):
            if pd.isna(date_str):
                return pd.NaT

            clean_str = str(date_str).lower()
            replacements = {
                "first": "1st",
                "second": "2nd",
                "third": "3rd",
                "fourth": "4th",
                "fifth": "5th",
                "sixth": "6th",
                "seventh": "7th",
                "eighth": "8th",
                "ninth": "9th",
                "tenth": "10th",
                "eleventh": "11th",
                "twelfth": "12th",
                "thirteenth": "13th",
                "fourteenth": "14th",
                "fifteenth": "15th",
                "sixteenth": "16th",
                "seventeenth": "17th",
                "eighteenth": "18th",
                "nineteenth": "19th",
                "twentieth": "20th",
                "twenty-first": "21st",
                "twenty first": "21st",
                "twenty-second": "22nd",
                "twenty second": "22nd",
                "twenty-third": "23rd",
                "twenty third": "23rd",
                "twenty-fourth": "24th",
                "twenty fourth": "24th",
                "twenty-fifth": "25th",
                "twenty fifth": "25th",
                "twenty-sixth": "26th",
                "twenty sixth": "26th",
                "twenty-seventh": "27th",
                "twenty seventh": "27th",
                "twenty-eighth": "28th",
                "twenty eighth": "28th",
                "twenty-ninth": "29th",
                "twenty ninth": "29th",
                "thirtieth": "30th",
                "thirty-first": "31st",
                "thirty first": "31st",
                "last": "last",
            }
            for word, num in replacements.items():
                clean_str = clean_str.replace(word, num)

            parsed = dateparser.parse(clean_str)
            return parsed if parsed else pd.NaT

        df[col_name] = df[col_name].apply(parse_natural_language)
        df[col_name] = df[col_name].dt.strftime(target_format)
        _save_file(df, file_path)
        return f"Successfully formatted column '{col_name}' to '{target_format}'."
    except Exception as e:
        return f"Error formatting time: {e}"


@mcp.tool()
def execute_money_formatting(
    file_path: str,
    col_name: str,
    is_mixed_currency: bool,
    detected_currency: str,
    scale_decision: Literal["None", "Thousands", "Millions", "Billions"],
    decimal_separator: Literal[".", ","],
) -> str:
    """Format a money/financial column in a file. For mixed currencies, a separate
    currency column is inserted to the right. For single currencies, the currency
    code is added to the column header.

    Args:
        file_path: Path to the Excel or CSV file.
        col_name: Name of the column to format.
        is_mixed_currency: True if multiple currencies are present.
        detected_currency: The primary currency detected (e.g., 'USD', 'EUR').
        scale_decision: The scale to apply.
        decimal_separator: The decimal separator used in the raw data.
    """
    try:
        df = _read_file(file_path)

        def parse_money_string(val):
            if pd.isna(val):
                return pd.NA, ""

            val_str = str(val).lower().strip()
            original_str = str(val).strip()

            symbol_match = re.search(
                r"([\$\u20ac\u00a3\u00a5]|(?:usd|eur|gbp|jpy|dollars?|euros?|pounds?|yen))",
                original_str,
                re.IGNORECASE,
            )
            raw_symbol = symbol_match.group(1).lower() if symbol_match else ""

            currency_map = {
                "dollar": "USD",
                "dollars": "USD",
                "$": "USD",
                "usd": "USD",
                "euro": "EUR",
                "euros": "EUR",
                "eur": "EUR",
                "\u20ac": "EUR",
                "pound": "GBP",
                "pounds": "GBP",
                "gbp": "GBP",
                "\u00a3": "GBP",
                "yen": "JPY",
                "jpy": "JPY",
                "\u00a5": "JPY",
            }
            symbol = currency_map.get(raw_symbol, raw_symbol.upper())

            if decimal_separator == ",":
                val_str = val_str.replace(".", "").replace(",", ".")
            else:
                val_str = val_str.replace(",", "")

            if val_str.count(".") > 1:
                parts = val_str.rsplit(".", 1)
                val_str = parts[0].replace(".", "") + "." + parts[1]

            match = re.search(r"[\d\.]+", val_str)
            if not match:
                return pd.NA, symbol
            try:
                num = float(match.group())
            except ValueError:
                return pd.NA, symbol

            isolated_words = re.sub(
                r"[\d\.\,\u20ac\$\u00a3\u00a5]", " ", val_str
            ).split()

            if any(
                w in isolated_words for w in ["billion", "billions", "bill", "bil", "b"]
            ):
                num *= 1_000_000_000
            elif any(
                w in isolated_words for w in ["million", "millions", "mill", "mil", "m"]
            ):
                num *= 1_000_000
            elif any(w in isolated_words for w in ["thousand", "thousands", "k"]):
                num *= 1_000
            elif any(w in isolated_words for w in ["cent", "cents"]):
                num /= 100

            return num, symbol

        parsed_data = df[col_name].apply(parse_money_string)
        nums = [x[0] if isinstance(x, tuple) else pd.NA for x in parsed_data]
        symbols = [x[1] if isinstance(x, tuple) else "" for x in parsed_data]

        df[col_name] = nums

        scale_suffix = ""
        if scale_decision == "Billions":
            df[col_name] = df[col_name] / 1_000_000_000
            scale_suffix = "in billions"
        elif scale_decision == "Millions":
            df[col_name] = df[col_name] / 1_000_000
            scale_suffix = "in millions"
        elif scale_decision == "Thousands":
            df[col_name] = df[col_name] / 1_000
            scale_suffix = "in thousands"

        if is_mixed_currency:
            # Insert a separate currency column to the right
            col_idx = df.columns.get_loc(col_name)
            new_currency_col = f"{col_name}_currency"
            df.insert(loc=col_idx + 1, column=new_currency_col, value=symbols)

            if scale_suffix:
                new_col_name = f"{col_name} ({scale_suffix})"
                df.rename(columns={col_name: new_col_name}, inplace=True)
        else:
            parts = []
            if detected_currency and detected_currency != "Unknown":
                parts.append(detected_currency)
            if scale_suffix:
                parts.append(scale_suffix)

            if parts:
                header_addition = " ".join(parts)
                new_col_name = f"{col_name} ({header_addition})"
                df.rename(columns={col_name: new_col_name}, inplace=True)

        _save_file(df, file_path)
        return f"Successfully formatted money column '{col_name}'."
    except Exception as e:
        return f"Error formatting money: {e}"


@mcp.tool()
def execute_int_formatting(file_path: str, col_name: str) -> str:
    """Clean and truncate a column to integers.

    Args:
        file_path: Path to the Excel or CSV file.
        col_name: Name of the column to format.
    """
    try:
        df = _read_file(file_path)

        def parse_int(val):
            if pd.isna(val):
                return pd.NA
            val_str = str(val).lower().replace(",", "").strip()
            try:
                num = float(val_str)
                return int(num)
            except ValueError:
                return pd.NA

        df[col_name] = df[col_name].apply(parse_int)
        df[col_name] = df[col_name].astype("Int64")
        _save_file(df, file_path)
        return f"Successfully formatted integer column '{col_name}'."
    except Exception as e:
        return f"Error formatting integers: {e}"


@mcp.tool()
def execute_float_formatting(file_path: str, col_name: str) -> str:
    """Standardize floats for a column.

    Args:
        file_path: Path to the Excel or CSV file.
        col_name: Name of the column to format.
    """
    try:
        df = _read_file(file_path)

        def extract_float(val):
            if pd.isna(val):
                return pd.NA
            val_str = str(val).lower().replace(",", "").strip()
            try:
                return float(val_str)
            except ValueError:
                return pd.NA

        raw_floats = df[col_name].apply(extract_float)

        max_decimals = 0
        for val in raw_floats.dropna():
            parts = str(val).split(".")
            if len(parts) == 2:
                decimals = len(parts[1])
                if max_decimals < decimals:
                    max_decimals = decimals

        def pad_float(val):
            if pd.isna(val):
                return pd.NA
            return f"{val:.{max_decimals}f}"

        df[col_name] = raw_floats.apply(pad_float)
        _save_file(df, file_path)
        return f"Successfully formatted float column '{col_name}' to {max_decimals} decimal places."
    except Exception as e:
        return f"Error formatting floats: {e}"


@mcp.tool()
def execute_name_formatting(
    file_path: str,
    col_name: str,
    entity_type: Literal["Human Names", "Locations/Other"],
    dominant_format: Literal["First Last", "Last First", "N/A"],
) -> str:
    """Standardize proper nouns/names in a column.

    Args:
        file_path: Path to the Excel or CSV file.
        col_name: Name of the column to format.
        entity_type: 'Human Names' or 'Locations/Other'.
        dominant_format: 'First Last', 'Last First', or 'N/A'.
    """
    try:
        df = _read_file(file_path)

        def parse_name(val):
            if pd.isna(val):
                return pd.NA
            clean_name = str(val).strip().title()
            if entity_type == "Locations/Other":
                return clean_name
            if "," in clean_name:
                parts = [p.strip() for p in clean_name.split(",")]
                if len(parts) == 2:
                    return f"{parts[1]} {parts[0]}"
            if dominant_format == "Last First":
                parts = clean_name.split()
                if len(parts) == 2:
                    return f"{parts[1]} {parts[0]}"
            return clean_name

        df[col_name] = df[col_name].apply(parse_name)
        _save_file(df, file_path)
        return f"Successfully formatted name column '{col_name}'."
    except Exception as e:
        return f"Error formatting names: {e}"


@mcp.tool()
def execute_dataset_description(
    file_path: str, general_summary: str, features_json: str
) -> str:
    """Save a dataset description as a second sheet in the Excel file.
    The cleaned data goes to "Cleaned_Data" sheet and the description goes to
    "dataset_description" sheet.

    Args:
        file_path: Path to the Excel file.
        general_summary: A 1-2 sentence summary of the dataset.
        features_json: A JSON string representing a list of objects with keys
            "Feature Name", "Conceptual Data Type", "Description".
    """
    try:
        df = _read_file(file_path)
        features = json.loads(features_json)
        desc_df = pd.DataFrame(features)

        if file_path.endswith(".csv"):
            desc_path = file_path.replace(".csv", "_description.csv")
            df.to_csv(file_path, index=False)
            desc_df.to_csv(desc_path, index=False)
            return (
                f"Saved cleaned data to '{file_path}' and description to '{desc_path}'."
            )
        else:
            with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
                df.to_excel(writer, sheet_name="Cleaned_Data", index=False)
                desc_df.to_excel(writer, sheet_name="dataset_description", index=False)
            return (
                f"Saved multi-sheet file to '{file_path}' with "
                f"Cleaned_Data and dataset_description sheets."
            )
    except Exception as e:
        return f"Error saving description: {e}"


if __name__ == "__main__":
    mcp.run(transport="stdio")
