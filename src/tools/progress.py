class FakeProgress:
    def __init__(
        self,
        *args,
        **kwargs,
    ):
        pass

    async def __aenter__(self):
        return self

    def __enter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def add_task(
        self,
        *args,
        **kwargs,
    ):
        pass

    def update(
        self,
        *args,
        **kwargs,
    ):
        pass

    def remove_task(
        self,
        *args,
        **kwargs,
    ):
        pass


class EventProgress:
    def __init__(
        self,
        emit,
        throttle_ms: int = 200,
        id_prefix: str | None = None,
    ):
        self._emit = emit
        self._throttle_s = max(throttle_ms, 0) / 1000
        self._id_prefix = id_prefix or ""
        self._next_id = 1
        self._tasks: dict[str | int, dict] = {}
        self._last_emit: dict[str | int, float] = {}

    async def __aenter__(self):
        return self

    def __enter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return None

    def __exit__(self, exc_type, exc_val, exc_tb):
        return None

    def add_task(
        self,
        description: str,
        *args,
        total: int | None = None,
        completed: int = 0,
        **kwargs,
    ) -> str | int:
        from time import monotonic

        raw_id = self._next_id
        self._next_id += 1
        task_id = f"{self._id_prefix}{raw_id}" if self._id_prefix else raw_id
        self._tasks[task_id] = {
            "description": description or "",
            "total": total,
            "completed": completed or 0,
        }
        self._last_emit[task_id] = monotonic()
        self._emit(
            {
                "type": "progress.add",
                "task_id": task_id,
                **self._tasks[task_id],
            }
        )
        return task_id

    def update(
        self,
        task_id: str | int,
        *args,
        advance: int | None = None,
        completed: int | None = None,
        total: int | None = None,
        description: str | None = None,
        **kwargs,
    ) -> None:
        from time import monotonic

        task = self._tasks.get(task_id)
        if not task:
            return
        if description is not None:
            task["description"] = description
        if total is not None:
            task["total"] = total
        if completed is not None:
            task["completed"] = completed
        elif advance:
            task["completed"] += advance

        now = monotonic()
        last = self._last_emit.get(task_id, 0.0)
        done = task["total"] is not None and task["completed"] >= task["total"]
        if done or self._throttle_s == 0 or (now - last) >= self._throttle_s:
            self._last_emit[task_id] = now
            self._emit(
                {
                    "type": "progress.update",
                    "task_id": task_id,
                    **task,
                }
            )

    def remove_task(
        self,
        task_id: str | int,
        *args,
        **kwargs,
    ) -> None:
        task = self._tasks.pop(task_id, None)
        if not task:
            return
        self._last_emit.pop(task_id, None)
        self._emit(
            {
                "type": "progress.remove",
                "task_id": task_id,
            }
        )
