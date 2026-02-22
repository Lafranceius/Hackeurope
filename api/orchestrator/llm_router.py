from agents import Agent, Runner


async def run_with_handoffs(triage_agent: Agent, user_prompt: str):
    result = await Runner.run(triage_agent, user_prompt)
    return result
