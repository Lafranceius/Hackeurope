from agents import Agent


def build_writer_agent() -> Agent:
    return Agent(
        name="Writer Agent",
        instructions=(
            "You are a writing specialist. "
            "Rewrite or present results clearly and concisely."
        ),
        model="gpt-5-nano",
    )
