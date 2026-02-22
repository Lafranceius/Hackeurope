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
time_agent = Agent(
    name="Time Agent",
    instructions=(
        "You are an expert data formatting agent specializing in time and dates. "
        "When given a file and a column name, first use `read_column_sample` to look at the data. "
        "Then, determine the appropriate standardized format based on its granularity: "
        "'%H:%M', '%H:%M:%S', '%S', '%d/%m/%Y', '%d/%m/%Y %H:%M', '%d/%m/%Y %H:%M:%S', '%m/%Y', or '%Y'. "
        "Finally, use the `execute_time_formatting` tool to apply the format."
    ),
    model="gpt-4o-mini",
)

money_agent = Agent(
    name="Money Agent",
    instructions=(
        "You are a precise financial data standardization agent. "
        "When given a file and a column name, first use `read_column_sample` to look at the data. "
        "Determine: "
        "1. The primary currency (e.g., 'USD', 'EUR'). "
        "2. If it's mixed currency (True/False). "
        "3. The best scale ('None', 'Thousands', 'Millions', 'Billions'). "
        "4. The decimal separator ('.' or ','). "
        "Finally, use the `execute_money_formatting` tool to apply the formatting."
    ),
    model="gpt-4o-mini",
)

int_agent = Agent(
    name="Int Agent",
    instructions=(
        "You are an integer formatting agent. "
        "When given a file and a column name, simply use the `execute_int_formatting` tool to clean and truncate the column to integers."
    ),
    model="gpt-4o-mini",
)

name_agent = Agent(
    name="Name Agent",
    instructions=(
        "You are a precise text standardization agent specializing in proper nouns. "
        "When given a file and a column name, first use `read_column_sample` to look at the data. "
        "Determine if it's 'Human Names' or 'Locations/Other'. "
        "If 'Human Names', deduce the dominant format ('First Last' or 'Last First'). "
        "If 'Locations/Other', use 'N/A' for format. "
        "Finally, use the `execute_name_formatting` tool to apply the formatting."
    ),
    model="gpt-4o-mini",
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
                "You are the orchestrator of a data cleaning pipeline. "
                "Follow these steps EXACTLY:\n"
                "1. Use `get_columns` to get the list of columns in the file.\n"
                "2. Use `read_data_sample` to look at a sample of the data.\n"
                "3. For EACH column, determine its data type based on the sample. "
                "   Categories: 'time', 'money', 'int', 'string', 'float', 'name', 'unknown'.\n"
                "   - 'time': dates, times, natural language dates.\n"
                "   - 'money': currency symbols, financial abbreviations.\n"
                "   - 'int': whole numbers.\n"
                "   - 'name': proper nouns, human names, locations.\n"
                "   - 'string'/'float'/'unknown': ignore these.\n"
                "4. For each column that needs formatting, delegate to the appropriate agent tool:\n"
                "   - 'time' -> time_agent\n"
                "   - 'money' -> money_agent\n"
                "   - 'int' -> int_agent\n"
                "   - 'name' -> name_agent\n"
                "   Pass the file_path and col_name to the agent.\n"
                "5. Summarize the actions taken."
            ),
            tools=[
                get_columns,
                read_data_sample,
                time_agent.as_tool(
                    tool_name="time_agent",
                    tool_description="Format time/date columns. Pass file_path and col_name.",
                ),
                money_agent.as_tool(
                    tool_name="money_agent",
                    tool_description="Format money/financial columns. Pass file_path and col_name.",
                ),
                int_agent.as_tool(
                    tool_name="int_agent",
                    tool_description="Format integer columns. Pass file_path and col_name.",
                ),
                name_agent.as_tool(
                    tool_name="name_agent",
                    tool_description="Format name/proper noun columns. Pass file_path and col_name.",
                ),
            ],
            mcp_servers=[server],
            model="gpt-4o-mini",
        )

        time_agent.mcp_servers = [server]
        time_agent.tools = [read_column_sample]

        money_agent.mcp_servers = [server]
        money_agent.tools = [read_column_sample]

        int_agent.mcp_servers = [server]

        name_agent.mcp_servers = [server]
        name_agent.tools = [read_column_sample]

        print(f"--- STARTING AGENTIC PIPELINE (MCP + SDK) for {file_path} ---")
        result = await Runner.run(
            orchestrator, f"Please analyze and format the data in '{file_path}'."
        )
        print("\n[Orchestrator Summary]:")
        print(result.final_output)
