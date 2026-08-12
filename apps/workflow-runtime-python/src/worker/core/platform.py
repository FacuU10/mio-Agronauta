from __future__ import annotations

import asyncio
import sys


def configure_worker_event_loop(platform_name: str | None = None) -> None:
    """Use the Windows selector loop required by psycopg's async connection."""

    if (platform_name or sys.platform) != "win32":
        return

    selector_policy = getattr(asyncio, "WindowsSelectorEventLoopPolicy", None)
    if selector_policy is None:  # pragma: no cover - only possible on a non-Windows runtime
        raise RuntimeError("WindowsSelectorEventLoopPolicy is unavailable on the Windows worker runtime")

    if not isinstance(asyncio.get_event_loop_policy(), selector_policy):
        asyncio.set_event_loop_policy(selector_policy())


def worker_event_loop_factory(platform_name: str | None = None) -> asyncio.AbstractEventLoop:
    """Create the loop psycopg requires without changing error propagation."""

    if (platform_name or sys.platform) != "win32":
        return asyncio.new_event_loop()

    selector_loop = getattr(asyncio, "WindowsSelectorEventLoop", None)
    if selector_loop is not None:
        return selector_loop()

    selector_policy = getattr(asyncio, "WindowsSelectorEventLoopPolicy", None)
    if selector_policy is None:  # pragma: no cover - only possible on non-Windows runtimes
        raise RuntimeError("WindowsSelectorEventLoopPolicy is unavailable on the Windows worker runtime")
    return selector_policy().new_event_loop()


def run_worker(awaitable: object) -> object:
    """Run the worker with an explicit Windows selector loop when required by psycopg."""

    configure_worker_event_loop()
    if sys.platform != "win32":
        return asyncio.run(awaitable)

    with asyncio.Runner(loop_factory=worker_event_loop_factory) as runner:
        return runner.run(awaitable)
