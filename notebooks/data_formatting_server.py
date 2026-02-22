
import pandas as pd
import dateparser
import re
from typing import Literal
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("data-formatting-tools")

@mcp.tool()
def execute_time_formatting(
    file_path: str, 
    col_name: str, 
    target_format: Literal["%H:%M", "%H:%M:%S", "%S", "%d/%m/%Y", "%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S", "%m/%Y", "%Y"]
) -> str:
    '''Format a time/date column in an Excel file to a specific target format.

    Args:
        file_path: Path to the Excel file.
        col_name: Name of the column to format.
        target_format: The target strftime format.
    '''
    print(f"       [Tool Executing] Formatting '{col_name}' to '{target_format}'...")
    try:
        df = pd.read_excel(file_path)

        def parse_natural_language(date_str):
            if pd.isna(date_str):
                return pd.NaT

            clean_str = str(date_str).lower()
            replacements = {
                "first": "1st", "second": "2nd", "third": "3rd", 
                "fourth": "4th", "fifth": "5th", "sixth": "6th", 
                "seventh": "7th", "eighth": "8th", "ninth": "9th", 
                "tenth": "10th", "eleventh": "11th", "twelfth": "12th", 
                "thirteenth": "13th", "fourteenth": "14th", "fifteenth": "15th", 
                "sixteenth": "16th", "seventeenth": "17th", "eighteenth": "18th", 
                "nineteenth": "19th", "twentieth": "20th",
                "twenty-first": "21st", "twenty first": "21st",
                "twenty-second": "22nd", "twenty second": "22nd",
                "twenty-third": "23rd", "twenty third": "23rd",
                "twenty-fourth": "24th", "twenty fourth": "24th",
                "twenty-fifth": "25th", "twenty fifth": "25th",
                "twenty-sixth": "26th", "twenty sixth": "26th",
                "twenty-seventh": "27th", "twenty seventh": "27th",
                "twenty-eighth": "28th", "twenty eighth": "28th",
                "twenty-ninth": "29th", "twenty ninth": "29th",
                "thirtieth": "30th", 
                "thirty-first": "31st", "thirty first": "31st",
                "last": "last"
            }
            for word, num in replacements.items():
                clean_str = clean_str.replace(word, num)

            parsed = dateparser.parse(clean_str)
            return parsed if parsed else pd.NaT

        df[col_name] = df[col_name].apply(parse_natural_language)
        df[col_name] = df[col_name].dt.strftime(target_format)
        df.to_excel(file_path, index=False)
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
    decimal_separator: Literal[".", ","]
) -> str:
    '''Format a money/financial column in an Excel file.

    Args:
        file_path: Path to the Excel file.
        col_name: Name of the column to format.
        is_mixed_currency: True if multiple currencies are present.
        detected_currency: The primary currency detected (e.g., 'USD', 'EUR').
        scale_decision: The scale to apply.
        decimal_separator: The decimal separator used in the raw data.
    '''
    print(f"       [Tool Executing] Scale: {scale_decision}, Mixed Currency: {is_mixed_currency}...")
    try:
        df = pd.read_excel(file_path)

        def parse_money_string(val):
            if pd.isna(val):
                return pd.NA, ""

            val_str = str(val).lower().strip()
            original_str = str(val).strip() 

            symbol_match = re.search(r'([\$€£¥]|(?:usd|eur|gbp|jpy|dollars?|euros?|pounds?|yen))', original_str, re.IGNORECASE)
            raw_symbol = symbol_match.group(1).lower() if symbol_match else ""

            currency_map = {
                "dollar": "USD", "dollars": "USD", "$": "USD", "usd": "USD",
                "euro": "EUR", "euros": "EUR", "eur": "EUR", "€": "EUR",
                "pound": "GBP", "pounds": "GBP", "gbp": "GBP", "£": "GBP",
                "yen": "JPY", "jpy": "JPY", "¥": "JPY"
            }
            symbol = currency_map.get(raw_symbol, raw_symbol.upper())

            if decimal_separator == ",":
                val_str = val_str.replace('.', '').replace(',', '.')
            else:
                val_str = val_str.replace(',', '')

            if val_str.count('.') > 1:
                parts = val_str.rsplit('.', 1)
                val_str = parts[0].replace('.', '') + '.' + parts[1]

            match = re.search(r'[\d\.]+', val_str)
            if not match:
                return pd.NA, symbol
            try:
                num = float(match.group())
            except ValueError:
                return pd.NA, symbol

            isolated_words = re.sub(r'[\d\.\,€\$£¥]', ' ', val_str).split()

            if any(w in isolated_words for w in ['billion', 'billions', 'bill', 'bil', 'b']):
                num *= 1_000_000_000
            elif any(w in isolated_words for w in ['million', 'millions', 'mill', 'mil', 'm']):
                num *= 1_000_000
            elif any(w in isolated_words for w in ['thousand', 'thousands', 'k']):
                num *= 1_000
            elif any(w in isolated_words for w in ['cent', 'cents']):
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
            def reattach(row_num, row_sym):
                if pd.isna(row_num):
                    return pd.NA
                return f"{row_sym} {row_num}".strip()

            df[col_name] = [reattach(n, s) for n, s in zip(df[col_name], symbols)]

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

        df.to_excel(file_path, index=False)
        return f"Successfully formatted money column '{col_name}'."
    except Exception as e:
        return f"Error formatting money: {e}"

@mcp.tool()
def execute_int_formatting(file_path: str, col_name: str) -> str:
    '''Clean and truncate a column to integers.

    Args:
        file_path: Path to the Excel file.
        col_name: Name of the column to format.
    '''
    print(f"       [Tool Executing] Cleaning and truncating '{col_name}' to integers...")
    try:
        df = pd.read_excel(file_path)
        def parse_int(val):
            if pd.isna(val):
                return pd.NA
            val_str = str(val).lower().replace(',', '').strip()
            try:
                num = float(val_str)
                return int(num)
            except ValueError:
                return pd.NA

        df[col_name] = df[col_name].apply(parse_int)
        df[col_name] = df[col_name].astype('Int64')
        df.to_excel(file_path, index=False)
        return f"Successfully formatted integer column '{col_name}'."
    except Exception as e:
        return f"Error formatting integers: {e}"

@mcp.tool()
def execute_float_formatting(file_path: str, col_name: str) -> str:
    '''Standardize floats for a column.

    Args:
        file_path: Path to the Excel file.
        col_name: Name of the column to format.
    '''
    print(f"       [Tool Executing] Standardizing floats for '{col_name}'...")
    try:
        df = pd.read_excel(file_path)
        def extract_float(val):
            if pd.isna(val):
                return pd.NA
            val_str = str(val).lower().replace(',', '').strip()
            try:
                return float(val_str)
            except ValueError:
                return pd.NA

        raw_floats = df[col_name].apply(extract_float)

        max_decimals = 0
        for val in raw_floats.dropna():
            parts = str(val).split('.')
            if len(parts) == 2:
                decimals = len(parts[1])
                if max_decimals < decimals:
                    max_decimals = decimals

        def pad_float(val):
            if pd.isna(val):
                return pd.NA
            return f"{val:.{max_decimals}f}"

        df[col_name] = raw_floats.apply(pad_float)
        df.to_excel(file_path, index=False)
        return f"Successfully formatted float column '{col_name}' to {max_decimals} decimal places."
    except Exception as e:
        return f"Error formatting floats: {e}"

@mcp.tool()
def execute_name_formatting(
    file_path: str, 
    col_name: str, 
    entity_type: Literal["Human Names", "Locations/Other"], 
    dominant_format: Literal["First Last", "Last First", "N/A"]
) -> str:
    '''Standardize proper nouns/names in a column.

    Args:
        file_path: Path to the Excel file.
        col_name: Name of the column to format.
        entity_type: 'Human Names' or 'Locations/Other'.
        dominant_format: 'First Last', 'Last First', or 'N/A'.
    '''
    print(f"       [Tool Executing] Cleaning names. Type: {entity_type}, Format: {dominant_format}...")
    try:
        df = pd.read_excel(file_path)
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
        df.to_excel(file_path, index=False)
        return f"Successfully formatted name column '{col_name}'."
    except Exception as e:
        return f"Error formatting names: {e}"

if __name__ == "__main__":
    mcp.run(transport="stdio")
