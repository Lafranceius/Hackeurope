from agents import Agent
from agents.mcp import MCPServerStdio


def build_math_agent(mcp_server: MCPServerStdio) -> Agent:
    return Agent(
        name="Math Agent",
        instructions=(
            "You are a math specialist. Use MCP tools for arithmetic whenever possible."
        ),
        model="gpt-5-nano",
        mcp_servers=[mcp_server],
    )
