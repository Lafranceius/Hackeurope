import sys
from pathlib import Path

import pandas as pd
from agents import Agent, Runner, function_tool
from agents.mcp import MCPServerStdio


# 1. Define local function tools for reading data
@function_tool
def read_column_sample(file_path: str, col_name: str, n: int = 10) -> str:
    """Read a sample of data from a specific column in an Excel or CSV file.

    Args:
        file_path: Path to the Excel or CSV file.
        col_name: Name of the column to sample.
        n: Number of rows to sample.
    """
    try:
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        if col_name not in df.columns:
            return f"Column '{col_name}' not found. Available columns: {list(df.columns)}"
        sample = df[col_name].dropna().head(n).tolist()
        return str(sample)
    except Exception as e:
        return f"Error reading sample: {e}"


@function_tool
def read_data_sample(file_path: str, n: int = 5) -> str:
    """Read a sample of the entire dataset from an Excel or CSV file.

    Args:
        file_path: Path to the Excel or CSV file.
        n: Number of rows to sample.
    """
    try:
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        sample = df.head(n).to_dict(orient="list")
        return str(sample)
    except Exception as e:
        return f"Error reading sample: {e}"


@function_tool
def get_columns(file_path: str) -> str:
    """Get the list of columns in an Excel or CSV file.

    Args:
        file_path: Path to the Excel or CSV file.
    """
    try:
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        return str(list(df.columns))
    except Exception as e:
        return f"Error reading columns: {e}"


# 2. Define the Agents

# --- HEADER DETECTION AGENT ---
header_agent = Agent(
    name="Header Detection Agent",
    instructions=(
        "You are a data parsing agent specialized in finding table structures.\n"
        "Real-world files often have titles, export dates, or blank rows at the very top. "
        "They also frequently have blank columns on the left.\n\n"
        "STEP 1: Use the `execute_header_detection` MCP tool to get a raw preview of the first 15 rows.\n"
        "STEP 2: Analyze the raw preview to identify the 2D starting coordinate of the ACTUAL data table:\n"
        "   - `header_row_index`: The 0-based index of the row containing the column headers (e.g., 'Txn ID', 'Date', 'Amount').\n"
        "   - `header_col_index`: The 0-based index of the column where the actual data starts (ignoring empty/blank columns to the left).\n"
        "STEP 3: Use the `apply_header_and_crop` MCP tool to re-read the file with the correct header and crop empty columns.\n\n"
        "Return a summary of what you found and applied."
    ),
    model="gpt-4o-2024-08-06",
)

# --- NA AGENT ---
na_agent = Agent(
    name="NA Agent",
    instructions=(
        "You are a data cleaning agent focused on missing values.\n"
        "Pandas has already handled standard 'NaN' and 'N/A' automatically.\n\n"
        "STEP 1: Use the `detect_potential_na_strings` MCP tool to scan for punctuation-only strings "
        "that might be NA placeholders, and to get a sample of the data.\n"
        "STEP 2: Evaluate if any of these strings (like '-', '.') are being used as placeholders for missing data.\n"
        "STEP 3: Use the `execute_na_cleaning` MCP tool with your decisions:\n"
        "   - `custom_na_strings_to_wipe`: list of strings to treat as NA\n"
        "   - `remove_completely_empty_rows`: True for standard tables\n"
        "   - `remove_completely_empty_columns`: True for standard tables\n\n"
        "Return a summary of what was cleaned."
    ),
    model="gpt-4o-2024-08-06",
)

# --- READER AGENT ---
reader_agent = Agent(
    name="Reader Agent",
    instructions=(
        "You are a precise data analysis agent. Your job is to classify columns in a dataset.\n"
        "Use the `read_data_sample` tool to get a sample of the data (first 5 rows).\n"
        "For each column, determine its data type based on the values.\n"
        "You are ONLY allowed to use these exact categories: 'time', 'money', 'int', 'string', 'float', 'name', 'unknown'.\n\n"
        "CRITICAL DEFINITIONS:\n"
        "- 'time': Includes standard formats (2023-01-01, 14:30), timestamps, AND natural language dates (e.g., 'first of january 2016', 'Q1 2024', 'yesterday'). If the core meaning represents a date or time, it is 'time', NEVER 'string'.\n"
        "- 'money': Includes currency symbols ($100, \u20ac50), accounting formats, or financial abbreviations (100 USD) and natural language money expressions ('100 dollars', 'fifty euros'). If the core meaning represents a monetary value, it is 'money', NEVER 'string'.\n"
        "- 'int': Whole numbers without decimals.\n"
        "- 'float': Numbers containing decimals.\n"
        "- 'name': Proper nouns. This includes human names (John Smith, Smith, John), cities, states (Alabama), or company names.\n"
        "- 'string': General text, sentences, descriptions, or specific codes (e.g., ID-4552) that have no mathematical or temporal value.\n"
        "- 'unknown': Use this ONLY if the column is complete gibberish or you cannot confidently assign it to any other category.\n\n"
        "IMPORTANT: You MUST return your result as a JSON object mapping each column name to its classified type.\n"
        'Example format: {"Column A": "time", "Column B": "money", "Column C": "int"}\n'
        "The order must match the columns from left to right. Return ONLY this JSON mapping, nothing else."
    ),
    tools=[read_data_sample, get_columns],
    model="gpt-4o-2024-08-06",
)

# --- TIME AGENT ---
time_agent = Agent(
    name="Time Agent",
    instructions=(
        "You are an expert data formatting agent specializing in time and dates.\n"
        "When given a file and a column name, first use `read_column_sample` to look at the data.\n"
        "Determine the appropriate standardized format for this data based on its granularity:\n"
        "- Hours and minutes: '%H:%M'\n"
        "- Hours, minutes, and seconds: '%H:%M:%S'\n"
        "- Just seconds: '%S'\n"
        "- Specific dates: '%d/%m/%Y'\n"
        "- Date and time: '%d/%m/%Y %H:%M'\n"
        "- Date and exact time: '%d/%m/%Y %H:%M:%S'\n"
        "- Month and year: '%m/%Y'\n"
        "- Year only: '%Y'\n"
        "Then use the `execute_time_formatting` MCP tool to apply the format.\n"
        "You MUST pass the file_path, col_name, and target_format to the tool."
    ),
    model="gpt-4o-2024-08-06",
)

# --- MONEY AGENT ---
money_agent = Agent(
    name="Money Agent",
    instructions=(
        "You are a precise financial data standardization agent.\n"
        "When given a file and a column name, first use `read_column_sample` to look at the data (request at least 10 rows).\n"
        "Your task:\n"
        "1. Identify the primary currency being used (e.g., $, USD, \u20ac, Yen, 'dollars', 'euros').\n"
        "   - CRITICAL RULE: If a currency is specified even just once in the sample, and NO OTHER currencies are mentioned, assume that single currency applies to the entire column.\n"
        "2. Set `is_mixed_currency` to True ONLY if you see multiple DIFFERENT currencies (e.g., 'dollars' in one row and 'eur' in another).\n"
        "3. Determine the best scale ('None', 'Thousands', 'Millions', 'Billions').\n"
        "   - Evaluate the TRUE underlying numerical value. '100 million' means 100,000,000.\n"
        "   - If the true values are predominantly in the millions, you MUST choose 'Millions'.\n"
        "4. Identify the decimal separator used in the numbers ('.' or ',').\n"
        "   - WARNING: Commas that group thousands (like '200,000,000') are NOT decimal separators. If a comma groups thousands, the decimal separator is '.'.\n"
        "   - Only choose ',' if the comma specifically separates fractional cents at the very end of the number (e.g., '1.500,00').\n"
        "Then use the `execute_money_formatting` MCP tool to apply the formatting.\n"
        "You MUST pass all required parameters: file_path, col_name, is_mixed_currency, detected_currency, scale_decision, and decimal_separator."
    ),
    model="gpt-4o-2024-08-06",
)

# --- NAME AGENT ---
name_agent = Agent(
    name="Name Agent",
    instructions=(
        "You are a precise text standardization agent specializing in proper nouns.\n"
        "When given a file and a column name, first use `read_column_sample` to look at the data (request at least 10 rows).\n"
        "Your task:\n"
        "1. Determine if this column primarily contains 'Human Names' or 'Locations/Other' (like cities, states, companies).\n"
        "2. If it is 'Human Names', deduce the dominant structural format.\n"
        "   - Are they mostly 'First Last' (e.g., John Smith)?\n"
        "   - Are they mostly 'Last First' (e.g., Smith John)?\n"
        "   - NOTE: If you see ambiguous names (like 'Harper Taylor'), look at the other names in the sample to deduce the pattern.\n"
        "3. If it is 'Locations/Other', select 'N/A' for the format.\n"
        "Then use the `execute_name_formatting` MCP tool to apply the formatting.\n"
        "You MUST pass all required parameters: file_path, col_name, entity_type, and dominant_format."
    ),
    model="gpt-4o-2024-08-06",
)

# --- DESCRIPTION AGENT ---
description_agent = Agent(
    name="Description Agent",
    instructions=(
        "You are an expert data analyst and documentation agent.\n"
        "When given a file path, use `read_data_sample` to get a sample of the cleaned data.\n"
        "Then use `get_columns` to get all column names.\n\n"
        "Your task is to generate a comprehensive data dictionary:\n"
        "1. Write a 1-2 sentence `general_summary` of what this dataset represents.\n"
        "2. For every single column in the dataset, create an entry with:\n"
        "   - 'Feature Name': The exact column name.\n"
        "   - 'Conceptual Data Type': e.g., Categorical, Datetime, Continuous Numeric, Text.\n"
        "   - 'Description': A clear, concise description of what the data represents.\n\n"
        "Then use the `execute_dataset_description` MCP tool to save the description as a second sheet.\n"
        "You MUST pass:\n"
        "   - file_path: the path to the file\n"
        "   - general_summary: your 1-2 sentence summary\n"
        "   - features_json: a JSON string representing a list of objects with keys 'Feature Name', 'Conceptual Data Type', 'Description'\n\n"
        "Example features_json: '[{\"Feature Name\": \"Age\", \"Conceptual Data Type\": \"Continuous Numeric\", \"Description\": \"The age of the person in years.\"}]'"
    ),
    model="gpt-4o-2024-08-06",
)


# 3. Define the Orchestrator
async def run_agentic_pipeline(file_path: str):
    server_path = str(Path(__file__).parent / "mcp_server.py")
    python_executable = sys.executable

    async with MCPServerStdio(
        name="Data Formatting Tools",
        params={
            "command": python_executable,
            "args": [server_path],
        },
    ) as server:
        orchestrator = Agent(
            name="Data Pipeline Orchestrator",
            instructions=(
                "You are the orchestrator of a data cleaning pipeline. Follow these steps EXACTLY in order:\n\n"
                "STEP 1 - SCOUT: Use the `header_agent` to detect and apply the correct header row and crop empty columns.\n"
                "   Pass a message like: 'Detect the header and crop the file \"<file_path>\"'.\n\n"
                "STEP 2 - SWEEP: Use the `na_agent` to scan for and clean custom NA placeholders, empty rows, and empty columns.\n"
                "   Pass a message like: 'Clean missing data in the file \"<file_path>\"'.\n\n"
                "STEP 3 - READ: Use the `reader_agent` to classify ALL columns in the file. Pass the file_path to it.\n"
                "   The reader_agent will return a JSON mapping of column names to types.\n\n"
                "STEP 4 - ROUTE: Process EACH column one by one in order, based on its classified type:\n"
                "   - 'time': Delegate to `time_agent`. Pass a message like: 'Format the time column \"<col_name>\" in file \"<file_path>\"'.\n"
                "   - 'money': Delegate to `money_agent`. Pass a message like: 'Format the money column \"<col_name>\" in file \"<file_path>\"'.\n"
                "   - 'name': Delegate to `name_agent`. Pass a message like: 'Format the name column \"<col_name>\" in file \"<file_path>\"'.\n"
                "   - 'int': Directly use the `execute_int_formatting` MCP tool with file_path and col_name. Do NOT use an agent.\n"
                "   - 'float': Directly use the `execute_float_formatting` MCP tool with file_path and col_name. Do NOT use an agent.\n"
                "   - 'string' or 'unknown': Bypass - do nothing, these require no formatting.\n\n"
                "STEP 5 - DESCRIBE: Use the `description_agent` to generate a data dictionary and save it as a second sheet.\n"
                "   Pass a message like: 'Generate a dataset description for the file \"<file_path>\"'.\n\n"
                "CRITICAL RULES:\n"
                "   - You MUST execute ALL 5 steps in the exact order above.\n"
                "   - For 'time', 'money', and 'name', you MUST delegate to the respective agents and NOT call the MCP formatting tools directly.\n"
                "   - For 'int' and 'float', you MUST call the MCP tools directly and NOT delegate to agents.\n"
                "   - Always pass BOTH file_path AND col_name when delegating or calling tools.\n"
                "   - Process columns in order from left to right.\n\n"
                "STEP 6: After all steps are complete, summarize the actions taken."
            ),
            tools=[
                get_columns,
                read_data_sample,
                header_agent.as_tool(
                    tool_name="header_agent",
                    tool_description="Detect the true header row and starting column, then re-read and crop the file accordingly. Pass the file_path.",
                ),
                na_agent.as_tool(
                    tool_name="na_agent",
                    tool_description="Scan for custom NA placeholder strings and clean empty rows/columns. Pass the file_path.",
                ),
                reader_agent.as_tool(
                    tool_name="reader_agent",
                    tool_description="Classify the data types of ALL columns in the file. Pass the file_path. Returns a JSON mapping of column_name -> type.",
                ),
                time_agent.as_tool(
                    tool_name="time_agent",
                    tool_description="Format a time/date column. You MUST include both the file_path and col_name in your message to this agent.",
                ),
                money_agent.as_tool(
                    tool_name="money_agent",
                    tool_description="Format a money/financial column. You MUST include both the file_path and col_name in your message to this agent.",
                ),
                name_agent.as_tool(
                    tool_name="name_agent",
                    tool_description="Format a name/proper noun column. You MUST include both the file_path and col_name in your message to this agent.",
                ),
                description_agent.as_tool(
                    tool_name="description_agent",
                    tool_description="Generate a data dictionary for the cleaned dataset and save it as a second sheet. Pass the file_path.",
                ),
            ],
            mcp_servers=[server],
            model="gpt-4o-2024-08-06",
        )

        # Give sub-agents access to MCP server and local tools
        header_agent.mcp_servers = [server]
        header_agent.tools = []

        na_agent.mcp_servers = [server]
        na_agent.tools = []

        time_agent.mcp_servers = [server]
        time_agent.tools = [read_column_sample]

        money_agent.mcp_servers = [server]
        money_agent.tools = [read_column_sample]

        name_agent.mcp_servers = [server]
        name_agent.tools = [read_column_sample]

        description_agent.mcp_servers = [server]
        description_agent.tools = [read_data_sample, get_columns]

        print(f"--- STARTING AGENTIC PIPELINE (MCP + SDK) for {file_path} ---")
        result = await Runner.run(
            orchestrator,
            f"Please analyze and format the data in '{file_path}'. Process every column.",
        )
        print("\n[Orchestrator Summary]:")
        print(result.final_output)
