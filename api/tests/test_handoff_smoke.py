import sys
from pathlib import Path

import pytest

# Add project root to Python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from agent.math_agent import build_math_agent
from agent.triage_agent import build_triage_agent
from agent.writer_agent import build_writer_agent
from mcp_server.server_manager import build_stdio_mcp_server
from orchestrator.llm_router import run_with_handoffs


@pytest.mark.asyncio
async def test_handoff_smoke():
    async with build_stdio_mcp_server() as mcp_server:
        math_agent = build_math_agent(mcp_server)
        writer_agent = build_writer_agent()
        triage_agent = build_triage_agent(math_agent, writer_agent)

        result = await run_with_handoffs(triage_agent, "What is 2 + 3? Use tools.")
        assert "5" in str(result.final_output)
