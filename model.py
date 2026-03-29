"""
ET AI Concierge — one-shot launcher for the full concierge stack.

Usage (from repo root):
  python model.py                  # full concierge (entire stack)
  python -m model                  # same as ``python model.py``

The ``model/`` package is imported by name; this file does not replace it.
"""

from __future__ import annotations

from model.launcher import main

if __name__ == "__main__":
    main()
