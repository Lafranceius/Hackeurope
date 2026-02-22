from mcp.server.fastmcp import FastMCP
from tools.math_tools import add, multiply

# Create MCP server
mcp = FastMCP("ServerManager", json_response=True)


@mcp.tool()
def add_numbers(a: int, b: int) -> int:
    """Adds two numbers."""
    return add(a, b)


@mcp.tool()
def multiply_numbers(a: int, b: int) -> int:
    """Multiplies two numbers."""
    return multiply(a, b)


if __name__ == "__main__":
    mcp.run(transport="stdio")
