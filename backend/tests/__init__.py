"""
__init__.py — makes the tests/ folder a Python package.

This is required so that pytest can resolve imports like ``from app.schemas``
correctly when running from the ``backend/`` directory.
"""
