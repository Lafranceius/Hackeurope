import asyncio
import sys

from agent.math_agent import build_math_agent
from agent.triage_agent import build_triage_agent
from agent.writer_agent import build_writer_agent
from mcp_server.server_manager import build_stdio_mcp_server
from orchestrator.deterministic_flow import run_math_then_writer
from orchestrator.llm_router import run_with_handoffs
from tracing.tracing import workflow_trace


async def main():
    mode = "handoff"
    print(sys.argv)
    if len(sys.argv) > 1 and sys.argv[1] in {"handoff", "flow"}:
        mode = sys.argv[1]
        prompt = " ".join(sys.argv[2:]) or "What is 17 * 23 + 5?"
    else:
        prompt = " ".join(sys.argv[1:]) or "What is 17 * 23 + 5?"

    async with build_stdio_mcp_server() as mcp_server:
        math_agent = build_math_agent(mcp_server)
        writer_agent = build_writer_agent()
        triage_agent = build_triage_agent(math_agent, writer_agent)

        with workflow_trace(f"orchestrator:{mode}"):
            if mode == "handoff":
                result = await run_with_handoffs(triage_agent, prompt)
                print(result.final_output)
            else:
                flow = await run_math_then_writer(math_agent, writer_agent, prompt)
                print(flow["final_output"])


if __name__ == "__main__":
    asyncio.run(main())
