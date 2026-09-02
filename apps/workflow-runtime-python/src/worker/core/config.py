from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

from worker.contracts import resolve_contracts_root


WORKER_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"
DEFAULT_WORKER_HEARTBEAT_MAX_AGE_SECONDS = 180
DEFAULT_WORKER_HEARTBEAT_INTERVAL_SECONDS = 30
DEFAULT_WORKER_JOB_TIMEOUT_SECONDS = 120
DEFAULT_WORKER_MAX_JOB_ATTEMPTS = 3


class RuntimeSettings(BaseSettings):
    """Central runtime configuration for worker, graph, storage and telemetry."""

    model_config = SettingsConfigDict(
        env_file=WORKER_ENV_FILE,
        env_prefix="WORKER_",
        extra="ignore",
        case_sensitive=False,
    )

    environment: str = Field(default="development")
    service_name: str = Field(default="workflow-runtime-python")
    log_level: str = Field(default="INFO")

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    langsmith_api_key: str | None = Field(default=None, alias="LANGSMITH_API_KEY")
    langsmith_endpoint: HttpUrl | str = Field(default="https://api.smith.langchain.com")
    langsmith_project: str = Field(default="golden-boilerplate")

    redis_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias=AliasChoices("WORKER_REDIS_URL", "REDIS_URL"),
    )
    postgres_dsn: str = Field(
        default="",
        validation_alias=AliasChoices("WORKER_POSTGRES_DSN", "POSTGRES_DSN"),
    )
    postgres_required: bool = Field(
        default=True,
        validation_alias=AliasChoices("WORKER_POSTGRES_REQUIRED", "POSTGRES_REQUIRED"),
    )
    redis_required: bool = Field(
        default=True,
        validation_alias=AliasChoices("WORKER_REDIS_REQUIRED", "REDIS_REQUIRED"),
    )
    worker_heartbeat_max_age_seconds: int = Field(
        default=DEFAULT_WORKER_HEARTBEAT_MAX_AGE_SECONDS,
        ge=1,
        le=3600,
        validation_alias=AliasChoices(
            "WORKER_HEARTBEAT_MAX_AGE_SECONDS",
            "WORKER_WORKER_HEARTBEAT_MAX_AGE_SECONDS",
        ),
    )
    worker_heartbeat_interval_seconds: int = Field(
        default=DEFAULT_WORKER_HEARTBEAT_INTERVAL_SECONDS,
        ge=1,
        le=900,
        validation_alias=AliasChoices(
            "WORKER_HEARTBEAT_INTERVAL_SECONDS",
            "WORKER_WORKER_HEARTBEAT_INTERVAL_SECONDS",
        ),
    )
    job_timeout_seconds: int = Field(
        default=DEFAULT_WORKER_JOB_TIMEOUT_SECONDS,
        ge=1,
        le=3600,
        validation_alias=AliasChoices("WORKER_JOB_TIMEOUT_SECONDS", "JOB_TIMEOUT_SECONDS"),
    )
    retry_backoff_base_seconds: int = Field(
        default=2,
        ge=1,
        le=60,
        validation_alias=AliasChoices(
            "WORKER_RETRY_BACKOFF_BASE_SECONDS",
            "RETRY_BACKOFF_BASE_SECONDS",
        ),
    )
    max_job_attempts: int = Field(
        default=DEFAULT_WORKER_MAX_JOB_ATTEMPTS,
        ge=1,
        le=10,
        validation_alias=AliasChoices("WORKER_MAX_JOB_ATTEMPTS", "MAX_JOB_ATTEMPTS"),
    )
    vector_store_backend: str = Field(default="pgvector")
    vector_collection: str = Field(default="workflow_documents")
    checkpoint_backend: str = Field(default="postgres")

    aws_region: str = Field(default="us-east-1")
    asset_bucket: str = Field(default="workflow-assets")
    asset_prefix: str = Field(default="tenants")
    local_asset_root: Path = Field(default=Path("./.runtime/assets"))
    contracts_root: Path = Field(default=Path("packages/contracts/schemas"))

    embeddings_model: str = Field(default="text-embedding-3-large")
    chat_model: str = Field(default="gpt-4o-mini")
    ingestion_chunk_size: int = Field(default=1200, ge=200, le=8000)
    ingestion_chunk_overlap: int = Field(default=200, ge=0, le=1000)
    max_job_concurrency: int = Field(default=10, ge=1, le=100)

    @property
    def resolved_contracts_root(self) -> Path:
        return resolve_contracts_root(self.contracts_root)

    @property
    def resolved_asset_root(self) -> Path:
        root = Path(__file__).resolve().parents[4]
        return self.local_asset_root if self.local_asset_root.is_absolute() else (root / self.local_asset_root).resolve()

    def require_llm_credentials(self) -> None:
        if not self.openai_api_key and not self.anthropic_api_key:
            raise RuntimeError("Set OPENAI_API_KEY or ANTHROPIC_API_KEY before invoking graph nodes.")


@lru_cache(maxsize=1)
def get_settings() -> RuntimeSettings:
    settings = RuntimeSettings()
    settings.resolved_asset_root.mkdir(parents=True, exist_ok=True)
    return settings
