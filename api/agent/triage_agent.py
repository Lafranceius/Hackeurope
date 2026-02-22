from agents import Agent


def build_triage_agent(math_agent: Agent, writer_agent: Agent) -> Agent:
    return Agent(
        name="Triage Agent",
        instructions=(
            "Route math/calculation requests to Math Agent. "
            "Route writing/rephrasing/formatting requests to Writer Agent. "
            "If unclear, ask a short clarifying question."
        ),
        model="gpt-5-nano",
        handoffs=[math_agent, writer_agent],
    )
