# Execution Directory

This directory contains deterministic Python scripts that perform the actual work (Layer 3).

## Operating Principles
- Scripts should be reliable, testable, and fast
- Do not store environment variables here (use `.env` in the parent directory)
- API calls, data processing, file operations, and database interactions happen here
- Ensure scripts are well commented
