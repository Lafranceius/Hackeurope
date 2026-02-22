import asyncio

import pandas as pd
from agents_pipeline import run_agentic_pipeline
from dotenv import load_dotenv

load_dotenv()


def get_test_file(test_file_mcp: str = "cleaned_test_pipeline_mcp.xlsx") -> str:
    pd.DataFrame(
        {
            "Event Date": ["first of january 2016", "january second 2016", "yesterday"],
            "Revenue": ["100 million dollars", "200000000", "300 mil eur"],
            "entities": [5, 10, 15.0],
            "Customer": ["Alice", "Bob", "Charlie SMITH"],
        }
    ).to_excel(test_file_mcp, index=False)
    return test_file_mcp


async def main(file_path: str):
    test_file_path = get_test_file(file_path)
    # Run your pipeline on the uploaded file
    await run_agentic_pipeline(test_file_path)


if __name__ == "__main__":
    asyncio.run(main("cleaned_test_pipeline_mcp.xlsx"))
