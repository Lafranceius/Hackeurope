from agents import Runner


async def run_math_then_writer(math_agent, writer_agent, user_prompt: str):
    # Step 1: Math specialist solves/calculates using MCP tools
    math_result = await Runner.run(math_agent, user_prompt)

    # Step 2: Writer specialist reformats/explains the answer
    writer_prompt = (
        "Rewrite the following result in a clean, user-friendly way:\n\n"
        f"{math_result.final_output}"
    )
    writer_result = await Runner.run(writer_agent, writer_prompt)

    return {
        "math_result": math_result,
        "writer_result": writer_result,
        "final_output": writer_result.final_output,
    }
