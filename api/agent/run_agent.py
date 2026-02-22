import asyncio
import os
from pathlib import Path
from pprint import pprint

from agents import Agent, Runner, trace
from agents.items import ToolCallItem, ToolCallOutputItem
from agents.mcp import MCPServerStdio
from dotenv import load_dotenv

load_dotenv()

# Path to our MCP server
server_path = str(Path("mcp_server/mcp_server.py").resolve())


def get_math_agent(math_mcp_server: MCPServerStdio) -> Agent:
    return Agent(
        name="Math Agent",
        instructions="Use the tools from the MCP server to answer math questions. Only use the tools, do not perform any calculations yourself.",
        model="gpt-5-nano",
        mcp_servers=[math_mcp_server],
    )


async def main():
    async with MCPServerStdio(
        name="Test MCP Server",
        params={
            "command": "python",
            "args": [server_path],
        },
        cache_tools_list=True,
    ) as math_mcp_server:
        math_agent = get_math_agent(math_mcp_server)

        with trace("Math workflow"):
            r1 = await Runner.run(math_agent, "What is 12 * 7?")
            r2 = await Runner.run(math_agent, f"Now add 5 to {r1.final_output}")
            print(r1.final_output)
            print(r2.final_output)


if __name__ == "__main__":
    asyncio.run(main())
