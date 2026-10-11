"""WebSocket connection registry + event bus for the marketplace.

Every connection carries an identity (user id + role), resolved from the JWT at
handshake time. That identity is what makes targeted delivery possible:
`schedule:broadcast` only reaches available drivers, `schedule:stop_added` only
reaches the claiming driver and the owning fleet manager, and so on.

Unlike the previous flat broadcast-everything hub, nothing is sent to a socket
that has not authenticated.
"""

import asyncio
import logging
from typing import Any, Dict, Iterable, List, Optional

from fastapi import WebSocket

logger = logging.getLogger("logisync.events")


class Connection:
    __slots__ = ("websocket", "user_id", "role", "assigned_port_id")

    def __init__(self, websocket: WebSocket, user_id: str, role: str,
                 assigned_port_id: Optional[str] = None):
        self.websocket = websocket
        self.user_id = user_id
        self.role = role
        self.assigned_port_id = assigned_port_id

    def matches_user(self, user_id: str) -> bool:
        return self.user_id == user_id

    def matches_role(self, role: str) -> bool:
        return self.role == role


class EventHub:
    def __init__(self) -> None:
        self._connections: Dict[WebSocket, Connection] = {}

    # ── Registry ─────────────────────────────────────────────────────────────
    def add(self, conn: Connection) -> None:
        self._connections[conn.websocket] = conn

    def remove(self, websocket: WebSocket) -> None:
        self._connections.pop(websocket, None)

    def count(self) -> int:
        return len(self._connections)

    def by_role(self, role: str) -> List[Connection]:
        return [c for c in self._connections.values() if c.matches_role(role)]

    def by_user(self, user_id: str) -> List[Connection]:
        return [c for c in self._connections.values() if c.matches_user(user_id)]

    def all(self) -> List[Connection]:
        return list(self._connections.values())

    # ── Sends ────────────────────────────────────────────────────────────────
    async def _send(self, conn: Connection, message: Dict[str, Any]) -> None:
        try:
            await conn.websocket.send_json(message)
        except Exception:
            self.remove(conn.websocket)

    async def _send_many(self, conns: Iterable[Connection], message: Dict[str, Any]) -> None:
        # Snapshot first: _send may prune the registry mid-iteration.
        await asyncio.gather(
            *(self._send(c, message) for c in list(conns)),
            return_exceptions=True,
        )

    async def to_role(self, role: str, event_type: str, data: Any) -> None:
        await self._send_many(self.by_role(role), {"type": event_type, "data": data})

    async def to_user(self, user_id: str, event_type: str, data: Any) -> None:
        await self._send_many(self.by_user(user_id), {"type": event_type, "data": data})

    async def to_users(self, user_ids: Iterable[str], event_type: str, data: Any) -> None:
        targets = [c for uid in set(user_ids) for c in self.by_user(uid)]
        await self._send_many(targets, {"type": event_type, "data": data})

    async def broadcast(self, event_type: str, data: Any) -> None:
        await self._send_many(self.all(), {"type": event_type, "data": data})

    async def to_roles(self, roles: Iterable[str], event_type: str, data: Any) -> None:
        targets = [c for r in roles for c in self.by_role(r)]
        await self._send_many(targets, {"type": event_type, "data": data})


hub = EventHub()

# ── Loop bridge ──────────────────────────────────────────────────────────────
# Route handlers here are synchronous (`def`, so FastAPI runs them in a thread
# pool). asyncio.get_event_loop() in a worker thread has no running loop, which
# is why the previous implementation's status pushes silently never fired. We
# capture the server's real loop once at startup and hand coroutines to it.

_LOOP: Optional[asyncio.AbstractEventLoop] = None


def set_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _LOOP
    _LOOP = loop


def get_loop() -> Optional[asyncio.AbstractEventLoop]:
    return _LOOP


def emit_sync(coro_factory) -> None:
    """Fire-and-forget a coroutine from sync code.

    `coro_factory` must be a zero-arg callable returning a coroutine, so the
    coroutine is only created when we know a loop exists to run it on.
    """
    loop = _LOOP
    if loop is None or loop.is_closed():
        return
    try:
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(coro_factory(), loop)
        else:
            loop.create_task(coro_factory())
    except Exception as exc:
        logger.warning("emit_sync failed: %s", exc)


# ── Convenience emitters ─────────────────────────────────────────────────────
# Routers call these so the event names live in exactly one place.

def emit_schedule_broadcast_sync(schedule_payload: Dict[str, Any],
                                 available_driver_ids: Iterable[str]) -> None:
    ids = list(available_driver_ids)
    emit_sync(lambda: emit_schedule_broadcast(schedule_payload, ids))


def emit_schedule_claimed_sync(schedule_id: str, driver_id: str,
                               schedule_payload: Dict[str, Any]) -> None:
    emit_sync(lambda: emit_schedule_claimed(schedule_id, driver_id, schedule_payload))


def emit_stop_added_sync(schedule_id: str, request_payload: Dict[str, Any],
                         driver_id: Optional[str], fleet_manager_id: Optional[str]) -> None:
    emit_sync(lambda: emit_stop_added(schedule_id, request_payload, driver_id, fleet_manager_id))


def emit_status_changed_sync(request_payload: Dict[str, Any], schedule_id: Optional[str],
                             audience: Iterable[str]) -> None:
    who = list(audience)
    emit_sync(lambda: emit_status_changed(request_payload, schedule_id, who))


def emit_driver_position_sync(schedule_id: str, lat: float, lng: float,
                              heading: Optional[float], fleet_manager_id: Optional[str],
                              consumer_ids: Optional[Iterable[str]] = None) -> None:
    emit_sync(lambda: emit_driver_position(schedule_id, lat, lng, heading, fleet_manager_id,
                                          consumer_ids))

async def emit_schedule_broadcast(schedule_payload: Dict[str, Any],
                                  available_driver_ids: Iterable[str]) -> None:
    """Push a new open batch to every currently-available driver."""
    await hub.to_users(available_driver_ids, "schedule:broadcast", schedule_payload)


async def emit_schedule_claimed(schedule_id: str, driver_id: str,
                                schedule_payload: Dict[str, Any]) -> None:
    """Tell every driver's feed to drop this job; tell the winner it landed."""
    await hub.to_role("driver", "schedule:claimed", {
        "schedule_id": schedule_id,
        "claimed_by_driver_id": driver_id,
        "schedule": schedule_payload,
    })


async def emit_stop_added(schedule_id: str, request_payload: Dict[str, Any],
                          driver_id: Optional[str], fleet_manager_id: Optional[str]) -> None:
    audience = [uid for uid in (driver_id, fleet_manager_id) if uid]
    await hub.to_users(audience, "schedule:stop_added", {
        "schedule_id": schedule_id,
        "request": request_payload,
    })


async def emit_status_changed(request_payload: Dict[str, Any], schedule_id: Optional[str],
                              audience: Iterable[str]) -> None:
    await hub.to_users(audience, "delivery:status_changed", {
        "schedule_id": schedule_id,
        "request": request_payload,
    })


async def emit_driver_position(schedule_id: str, lat: float, lng: float,
                               heading: Optional[float], fleet_manager_id: Optional[str],
                               consumer_ids: Optional[Iterable[str]] = None) -> None:
    """Push the driver's live position to the owning fleet manager and to every
    customer with a stop on this batch — that second audience is what drives the
    consumer-facing live map."""
    audience = [uid for uid in ([fleet_manager_id] + list(consumer_ids or [])) if uid]
    if not audience:
        return
    await hub.to_users(audience, "schedule:driver_position", {
        "schedule_id": schedule_id,
        "latitude": lat,
        "longitude": lng,
        "heading": heading,
    })


async def emit(event_type: str, data: Any) -> None:
    await hub.broadcast(event_type, data)