
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = PROJECT_ROOT / "tests" / "test_inventory.json"


def main() -> int:
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/",
            "--collect-only",
            "-q",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        print("Pytest collection failed; JSON was not generated.")
        return result.returncode

    test_cases = []

    for line in result.stdout.splitlines():
        nodeid = line.strip()

        # Pytest node IDs contain :: separating file, class, and test.
        if "::" not in nodeid or nodeid.startswith("<"):
            continue

        parts = nodeid.split("::")
        relative_file = parts[0].replace("\\", "/")

        test_cases.append(
            {
                "id": nodeid,
                "file": relative_file,
                "test_name": parts[-1],
                "class_name": (
                    parts[-2]
                    if len(parts) > 2
                    and not parts[-2].startswith("test_")
                    else None
                ),
            }
        )

    inventory = {
        "project": "CyberCup 6.0 - AegisGate",
        "format_version": 1,
        "source": "pytest --collect-only",
        "test_count": len(test_cases),
        "test_cases": test_cases,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(inventory, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"JSON created: {OUTPUT_FILE}")
    print(f"Collected test cases: {len(test_cases)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
