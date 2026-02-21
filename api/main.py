import argparse

from api.core.enums import RiskMode
from api.processing.runner import run_processing
from api.screening.runner import run_screening


def main():
    parser = argparse.ArgumentParser(description="Excel Agentic Processing System")
    subparsers = parser.add_subparsers(dest="command")

    screen_parser = subparsers.add_parser(
        "screen", help="Run screening on an Excel file"
    )
    screen_parser.add_argument("file", help="Path to the Excel file")
    screen_parser.add_argument(
        "--risk-mode", type=str, default="medium", choices=["low", "medium", "high"]
    )

    process_parser = subparsers.add_parser(
        "process", help="Run processing on an Excel file"
    )
    process_parser.add_argument("file", help="Path to the Excel file")
    process_parser.add_argument("report", help="Path to the screening report JSON")
    process_parser.add_argument(
        "--allow-d-override", action="store_true", help="Override Category D block"
    )
    process_parser.add_argument(
        "--user-inputs",
        type=str,
        help="JSON string of user inputs for Category B files",
    )

    args = parser.parse_args()

    if args.command == "screen":
        risk_mode = RiskMode(args.risk_mode)
        report = run_screening(args.file, risk_mode)
        print(f"Screening completed. Category: {report.category.value}")

    elif args.command == "process":
        import json

        user_inputs = json.loads(args.user_inputs) if args.user_inputs else None
        report = run_processing(
            args.file,
            args.report,
            user_inputs=user_inputs,
            allow_d_override=args.allow_d_override,
        )
        print(f"Processing completed. Status: {report.status.value}")
        if report.output_file:
            print(f"Output saved to: {report.output_file}")


if __name__ == "__main__":
    main()
