import sys
from pathlib import Path

import pytest

# Add project root to Python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from agent.math_agent import build_math_agent
from agent.writer_agent import build_writer_agent
from mcp_server.server_manager import build_stdio_mcp_server
from orchestrator.deterministic_flow import run_math_then_writer


@pytest.mark.asyncio
async def test_deterministic_flow_smoke():
    async with build_stdio_mcp_server() as mcp_server:
        math_agent = build_math_agent(mcp_server)
        writer_agent = build_writer_agent()

        flow = await run_math_then_writer(math_agent, writer_agent, "What is 4 * 6?")
        assert "24" in str(flow["final_output"]) or "24" in str(
            flow["math_result"].final_output
        )
