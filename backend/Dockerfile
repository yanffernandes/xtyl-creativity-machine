FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for WeasyPrint (PDF generation) and pdf2image (poppler)
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libgobject-2.0-0 \
    libgirepository-1.0-1 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Feature 025: Create non-root user for security
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 --gid 1001 appuser

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Feature 025: Set correct permissions
RUN chown -R appuser:appuser /app

# Feature 025: Switch to non-root user
USER appuser

# Development mode with hot reload (--reload flag allowed for development only)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
