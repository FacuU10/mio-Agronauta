FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY apps/workflow-runtime-python/pyproject.toml ./pyproject.toml
COPY apps/workflow-runtime-python/README.md ./README.md
COPY apps/workflow-runtime-python/src ./src

RUN pip install --no-cache-dir .

CMD ["python", "-m", "worker.queue.consumer"]
