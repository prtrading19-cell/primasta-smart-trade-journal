"""PrimaSta Smart Trade Journal — MT5 Gateway service.

A localhost-only HTTP gateway between the Next.js application and the
MetaTrader 5 terminal. Uses the official `MetaTrader5` python package.

Run (from this directory):
    pip install -r requirements.txt
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8765

Endpoints:
    GET  /health        Service + package availability
    POST /connect       Open an MT5 session (credentials never returned)
    POST /disconnect    Close the MT5 session
    GET  /account       Current account snapshot
    GET  /positions     Open positions
    GET  /orders        Active (pending) orders
    GET  /history       Recent history orders + deals
    POST /send-order    Market / pending order entry
    POST /modify-order  Modify SL/TP (position or pending order)
    POST /close-order   Close (or partially close) a position
    POST /cancel-order  Cancel a pending order
    GET  /terminal      Terminal state + version
    GET  /heartbeat     Connection probe used by the Next.js transport

Security: credentials are accepted only over the localhost interface and
are never included in any response. No credentials are written to disk.
"""

from __future__ import annotations

import time as _time
from typing import Any, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    CancelOrderRequest,
    CloseOrderRequest,
    ConnectRequest,
    GatewayResponse,
    ModifyOrderRequest,
    PlaceOrderRequest,
)
from .mt5_client import Mt5Client

app = FastAPI(
    title="PrimaSta MT5 Gateway",
    description="Localhost bridge between PrimaSta Smart Trade Journal and MetaTrader 5.",
    version="1.0.0",
)

# Localhost only — the Next.js server talks to this service on the same host.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1", "http://localhost"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_client = Mt5Client()
_started_at = _time.time()


def _error(message: str) -> GatewayResponse:
    return GatewayResponse(ok=False, data=None, error=message, message=message)


def _ok(data: Any = None, message: Optional[str] = None) -> GatewayResponse:
    return GatewayResponse(ok=True, data=data, error=None, message=message)


@app.get("/health", response_model=GatewayResponse)
def health() -> GatewayResponse:
    return _ok(
        {
            "status": "ok",
            "transport": "python",
            "packageAvailable": _client.package_available,
            "packageError": _client.package_error,
            "terminalConnected": _client.is_connected,
            "version": _client.version,
            "build": _client.build,
            "uptimeSeconds": int(_time.time() - _started_at),
            "timestamp": _now(),
        }
    )


@app.post("/connect", response_model=GatewayResponse)
def connect(body: ConnectRequest) -> GatewayResponse:
    if not _client.package_available:
        return _error(_client.package_error or "MetaTrader5 package is not available")
    try:
        ok, error = _client.connect(
            login=body.login,
            password=body.password,
            investor_password=body.investor_password,
            server=body.server,
            terminal_path=body.terminal_path,
            magic=body.magic,
            deviation=body.deviation,
        )
    except Exception as exc:
        return _error(f"Connect failed: {exc}")
    if not ok:
        return _error(error or "MetaTrader5 connect failed")
    return _ok(
        {
            "connected": True,
            "login": _client.login,
            "server": _client.server,
            "version": _client.version,
            "build": _client.build,
        },
        "MetaTrader5 connected",
    )


@app.post("/disconnect", response_model=GatewayResponse)
def disconnect() -> GatewayResponse:
    try:
        _client.disconnect()
    except Exception as exc:
        return _error(f"Disconnect failed: {exc}")
    return _ok({"connected": False}, "MetaTrader5 disconnected")


@app.get("/account", response_model=GatewayResponse)
def account() -> GatewayResponse:
    if not _client.is_connected:
        return _error("MT5 terminal is not connected")
    acc = _client.account()
    if acc is None:
        return _error("No account information available")
    return _ok({"account": acc})


@app.get("/positions", response_model=GatewayResponse)
def positions() -> GatewayResponse:
    if not _client.is_connected:
        return _error("MT5 terminal is not connected")
    return _ok({"positions": _client.positions()})


@app.get("/orders", response_model=GatewayResponse)
def orders() -> GatewayResponse:
    if not _client.is_connected:
        return _error("MT5 terminal is not connected")
    return _ok({"orders": _client.orders()})


@app.get("/history", response_model=GatewayResponse)
def history() -> GatewayResponse:
    if not _client.is_connected:
        return _error("MT5 terminal is not connected")
    return _ok(_client.history(days=7))


@app.post("/send-order", response_model=GatewayResponse)
def send_order(body: PlaceOrderRequest) -> GatewayResponse:
    if not _client.is_connected:
        return _error("MT5 terminal is not connected")
    result = _client.place_order(body.model_dump())
    if result.get("error"):
        return _error(result["error"])
    return _ok(result, result.get("message"))


@app.post("/modify-order", response_model=GatewayResponse)
def modify_order(body: ModifyOrderRequest) -> GatewayResponse:
    if not _client.is_connected:
        return _error("MT5 terminal is not connected")
    result = _client.modify_order(body.model_dump())
    if result.get("error"):
        return _error(result["error"])
    return _ok(result, result.get("message"))


@app.post("/close-order", response_model=GatewayResponse)
def close_order(body: CloseOrderRequest) -> GatewayResponse:
    if not _client.is_connected:
        return _error("MT5 terminal is not connected")
    result = _client.close_position(body.model_dump())
    if result.get("error"):
        return _error(result["error"])
    return _ok(result, result.get("message"))


@app.post("/cancel-order", response_model=GatewayResponse)
def cancel_order(body: CancelOrderRequest) -> GatewayResponse:
    if not _client.is_connected:
        return _error("MT5 terminal is not connected")
    result = _client.cancel_order(body.ticket)
    if result.get("error"):
        return _error(result["error"])
    return _ok(result, result.get("message"))


@app.get("/terminal", response_model=GatewayResponse)
def terminal() -> GatewayResponse:
    info = _client.terminal()
    return _ok(info)


@app.get("/heartbeat", response_model=GatewayResponse)
def heartbeat() -> GatewayResponse:
    info = _client.heartbeat()
    info["ok"] = bool(info.get("connected"))
    info["latencyMs"] = None
    return _ok(info)


def _now() -> str:
    from datetime import datetime, timezone

    return datetime.now(tz=timezone.utc).isoformat()
