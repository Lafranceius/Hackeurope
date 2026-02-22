import sys
from pathlib import Path

import pandas as pd
from agents import Agent, Runner, function_tool
from agents.mcp import MCPServerStdio


# 1. Define local function tools for reading data
@function_tool
def read_column_sample(file_path: str, col_name: str, n: int = 10) -> str:
    """Read a sample of data from a specific column in an Excel file.

    Args:
        file_path: Path to the Excel file.
        col_name: Name of the column to sample.
        n: Number of rows to sample.
    """
    try:
        df = pd.read_excel(file_path)
        if col_name not in df.columns:
            return f"Column '{col_name}' not found."
        sample = df[col_name].dropna().head(n).tolist()
        return str(sample)
    except Exception as e:
        return f"Error reading sample: {e}"


@function_tool
def read_data_sample(file_path: str, n: int = 5) -> str:
    """Read a sample of the entire dataset from an Excel file.

    Args:
        file_path: Path to the Excel file.
        n: Number of rows to sample.
    """
    try:
        df = pd.read_excel(file_path)
        sample = df.head(n).to_dict(orient="list")
        return str(sample)
    except Exception as e:
        return f"Error reading sample: {e}"


@function_tool
def get_columns(file_path: str) -> str:
    """Get the list of columns in an Excel file.

    Args:
        file_path: Path to the Excel file.
    """
    try:
        df = pd.read_excel(file_path)
        return str(list(df.columns))
    except Exception as e:
        return f"Error reading columns: {e}"


# 2. Define the Agents
reader_agent = Agent(
    name="Reader Agent",
    instructions=(
        "You are a precise data analysis agent. Your job is to classify columns in a dataset.\n"
        "Use the `read_data_sample` tool to get a sample of the data.\n"
        "For each column, determine its data type based on the values.\n"
        "You are ONLY allowed to use these exact categories: 'time', 'money', 'int', 'string', 'float', 'name', 'unknown'.\n\n"
        "CRITICAL DEFINITIONS:\n"
        "- 'time': Includes standard formats (2023-01-01, 14:30), timestamps, AND natural language dates (e.g., 'first of january 2016', 'Q1 2024', 'yesterday'). If the core meaning represents a date or time, it is 'time', NEVER 'string'.\n"
        "- 'money': Includes currency symbols ($100, €50), accounting formats, or financial abbreviations (100 USD) and natural language money expressions ('100 dollars', 'fifty euros'). If the core meaning represents a monetary value, it is 'money', NEVER 'string'.\n"
        "- 'int': Whole numbers without decimals.\n"
        "- 'float': Numbers containing decimals.\n"
        "- 'name': Proper nouns. This includes human names (John Smith, Smith, John), cities, states (Alabama), or company names.\n"
        "- 'string': General text, sentences, descriptions, or specific codes (e.g., ID-4552) that have no mathematical or temporal value.\n"
        "- 'unknown': Use this ONLY if the column is complete gibberish or you cannot confidently assign it to any other category.\n\n"
        "Return a clear mapping of column names to their classified types."
    ),
    tools=[read_data_sample],
    model="gpt-4o-2024-08-06",
)

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
        "Finally, use the `execute_time_formatting` tool to apply the format."
    ),
    model="gpt-4o-2024-08-06",
)

money_agent = Agent(
    name="Money Agent",
    instructions=(
        "You are a precise financial data standardization agent.\n"
        "When given a file and a column name, first use `read_column_sample` to look at the data.\n"
        "Your task:\n"
        "1. Identify the primary currency being used (e.g., $, USD, €, Yen, 'dollars', 'euros').\n"
        "   - CRITICAL RULE: If a currency is specified even just once in the sample, and NO OTHER currencies are mentioned, assume that single currency applies to the entire column.\n"
        "2. Set `is_mixed_currency` to True ONLY if you see multiple DIFFERENT currencies (e.g., 'dollars' in one row and 'eur' in another).\n"
        "3. Determine the best scale ('None', 'Thousands', 'Millions', 'Billions').\n"
        "   - Evaluate the TRUE underlying numerical value. '100 million' means 100,000,000.\n"
        "   - If the true values are predominantly in the millions, you MUST choose 'Millions'.\n"
        "4. Identify the decimal separator used in the numbers ('.' or ',').\n"
        "   - WARNING: Commas that group thousands (like '200,000,000') are NOT decimal separators. If a comma groups thousands, the decimal separator is '.'.\n"
        "   - Only choose ',' if the comma specifically separates fractional cents at the very end of the number (e.g., '1.500,00').\n"
        "Finally, use the `execute_money_formatting` tool to apply the formatting."
    ),
    model="gpt-4o-2024-08-06",
)

name_agent = Agent(
    name="Name Agent",
    instructions=(
        "You are a precise text standardization agent specializing in proper nouns.\n"
        "When given a file and a column name, first use `read_column_sample` to look at the data.\n"
        "Your task:\n"
        "1. Determine if this column primarily contains 'Human Names' or 'Locations/Other' (like cities, states, companies).\n"
        "2. If it is 'Human Names', deduce the dominant structural format.\n"
        "   - Are they mostly 'First Last' (e.g., John Smith)?\n"
        "   - Are they mostly 'Last First' (e.g., Smith John)?\n"
        "   - NOTE: If you see ambiguous names (like 'Harper Taylor'), look at the other names in the sample to deduce the pattern.\n"
        "3. If it is 'Locations/Other', select 'N/A' for the format.\n"
        "Finally, use the `execute_name_formatting` tool to apply the formatting."
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
                "You are the orchestrator of a data cleaning pipeline. Follow these steps EXACTLY:\n"
                "1. Use the `reader_agent` to classify the columns in the file.\n"
                "2. For each column, based on its classified type, take the following action:\n"
                "   - 'time': Delegate to `time_agent`.\n"
                "   - 'money': Delegate to `money_agent`.\n"
                "   - 'name': Delegate to `name_agent`.\n"
                "   - 'int': Directly use the `execute_int_formatting` tool (do not use an agent).\n"
                "   - 'float': Directly use the `execute_float_formatting` tool (do not use an agent).\n"
                "   - 'string' or 'unknown': Bypass and do nothing.\n"
                "   CRITICAL: For 'time', 'money', and 'name', you MUST delegate to the respective agents and NOT call the formatting tools directly.\n"
                "3. Summarize the actions taken for each column."
            ),
            tools=[
                get_columns,
                reader_agent.as_tool(
                    tool_name="reader_agent",
                    tool_description="Classify the data types of columns in the file.",
                ),
                time_agent.as_tool(
                    tool_name="time_agent",
                    tool_description="Format time/date columns. Pass file_path and col_name.",
                ),
                money_agent.as_tool(
                    tool_name="money_agent",
                    tool_description="Format money/financial columns. Pass file_path and col_name.",
                ),
                name_agent.as_tool(
                    tool_name="name_agent",
                    tool_description="Format name/proper noun columns. Pass file_path and col_name.",
                ),
            ],
            mcp_servers=[server],
            model="gpt-4o-2024-08-06",
        )

        time_agent.mcp_servers = [server]
        time_agent.tools = [read_column_sample]

        money_agent.mcp_servers = [server]
        money_agent.tools = [read_column_sample]

        name_agent.mcp_servers = [server]
        name_agent.tools = [read_column_sample]

        print(f"--- STARTING AGENTIC PIPELINE (MCP + SDK) for {file_path} ---")
        result = await Runner.run(
            orchestrator, f"Please analyze and format the data in '{file_path}'."
        )
        print("\n[Orchestrator Summary]:")
        print(result.final_output)
