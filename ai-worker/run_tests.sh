#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Yaarlore AI worker test runner
#
# Usage:
#   ./run_tests.sh           # fast deterministic tests only
#   ./run_tests.sh --all     # all tests including LLM evaluator
#   ./run_tests.sh --schema  # schema + validator tests only
#   ./run_tests.sh --safety  # safety/toxicity/PII tests only
#   ./run_tests.sh --quality # narrative quality tests (LLM)
#   ./run_tests.sh --signals # signal faithfulness tests (LLM)
#   ./run_tests.sh --verbose # verbose output
# ─────────────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

# Install test deps if needed
pip install -e ".[test]" --quiet

case "$1" in
  --all)
    echo "Running ALL tests (including LLM evaluator)..."
    python -m pytest tests/ -v --tb=short 2>&1 | tee test_results.txt
    ;;
  --schema)
    echo "Running schema tests..."
    python -m pytest tests/test_schema.py -v --tb=short
    ;;
  --safety)
    echo "Running safety tests..."
    python -m pytest tests/test_safety.py -v --tb=short
    ;;
  --quality)
    echo "Running quality tests (LLM evaluator — costs tokens)..."
    python -m pytest tests/test_lore_quality.py -v --tb=short
    ;;
  --signals)
    echo "Running signal faithfulness tests (LLM evaluator)..."
    python -m pytest tests/test_signals.py -v --tb=short
    ;;
  --fast)
    echo "Running fast deterministic tests only..."
    python -m pytest tests/test_schema.py tests/test_safety.py \
      tests/test_chaos_calibration.py tests/test_pipeline_integration.py \
      -v --tb=short -k "not llm"
    ;;
  --verbose)
    python -m pytest tests/ -v --tb=long -s 2>&1 | tee test_results_verbose.txt
    ;;
  *)
    echo "Running fast deterministic tests (use --all for LLM evaluation)..."
    python -m pytest tests/test_schema.py tests/test_safety.py \
      tests/test_chaos_calibration.py \
      -v --tb=short
    ;;
esac
