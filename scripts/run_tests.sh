#!/usr/bin/env bash

flake8 \
    --ignore=W503,W504,F723 \
    --exclude scripts/tests/ \
    scripts && \
mypy \
    scripts/ \
    --disallow-untyped-defs \
    --strict-equality \
    --show-error-codes \
    --warn-return-any \
    --ignore-missing-imports
