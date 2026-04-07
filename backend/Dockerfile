FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files first for layer caching
# Build context is repo root, so reference backend/ explicitly
COPY backend/pyproject.toml backend/uv.lock ./

# Install dependencies (no dev deps, frozen lockfile)
RUN uv sync --frozen --no-dev

# Copy application code
COPY backend/ .

# Railway injects PORT at runtime; default to 8000 locally
EXPOSE 8000

CMD uv run uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
