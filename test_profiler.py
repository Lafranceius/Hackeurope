import pandas as pd
import re

def detect_table_candidates(file_path: str):
    df = pd.read_excel(file_path, sheet_name=0, header=None)
    # Find the row with the most non-null values
    non_null_counts = df.notnull().sum(axis=1)
    header_row_index = non_null_counts.idxmax()
    
    return header_row_index

print(detect_table_candidates('data/A/case_A1_sales_light_dirty_input.xlsx'))
print(detect_table_candidates('data/B/case_B1_transactions_ambiguous_dates_input.xlsx'))
