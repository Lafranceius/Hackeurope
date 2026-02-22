from pathlib import Path

import pytest
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
from dotenv import load_dotenv

load_dotenv()

# Path to our MCP server
server_path = str(Path("mcp_server/mcp_server.py").resolve())


@pytest.mark.asyncio
async def test_agent_mcp_stdio_smoke():
    async with MCPServerStdio(
        name="Test MCP",
        params={"command": "python", "args": [server_path]},
        cache_tools_list=True,
    ) as mcp_server:
        agent = Agent(
            name="Assistant",
            instructions="Use MCP tools for math.",
            mcp_servers=[mcp_server],
        )

        result = await Runner.run(agent, "What is 2 + 3? Use tools.")
        text = str(result.final_output).lower()

        # Keep assertion flexible (LLM wording can vary)
        assert "5" in text
