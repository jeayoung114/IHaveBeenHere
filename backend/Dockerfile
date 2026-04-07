FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies (no dev deps, frozen lockfile)
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Railway injects PORT at runtime; default to 8000 locally
EXPOSE 8000

CMD uv run uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
