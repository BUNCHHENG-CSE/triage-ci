@echo off
echo ===================================================
echo Running TriageCI Benchmark Validation (20 Logs)
echo ===================================================
python -m pytest backend/tests/test_benchmark.py -v -s
pause
