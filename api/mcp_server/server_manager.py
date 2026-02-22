from pathlib import Path

from agents.mcp import MCPServerStdio
from dotenv import load_dotenv

load_dotenv()

# Path to our MCP server
server_path = str(Path("mcp_server/mcp_server.py").resolve())


def build_stdio_mcp_server() -> MCPServerStdio:
    return MCPServerStdio(
        name="Local Demo MCP",
        params={
            "command": "python",
            "args": [server_path],
        },
        cache_tools_list=True,
        max_retry_attempts=2,
    )
