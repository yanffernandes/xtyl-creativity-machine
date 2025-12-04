#!/bin/bash
# Script to seed default templates in production
# Usage: Run this inside the backend container in Easypanel

cd /app
python migrations/seed_default_templates.py
