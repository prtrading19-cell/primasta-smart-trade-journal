"""PrimaSta Smart Trade Journal — MT5 Gateway service.

A localhost-only HTTP gateway between the Next.js application and the
MetaTrader 5 terminal. Uses the official `MetaTrader5` python package.

Run (from this directory):
    pip install -r requirements.txt
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8765

Endpoints:
    GET  /health             Service + package availability
    POST /connect            Open an MT5 session (saved account or credentials)
    POST /disconnect         Close the MT5 session
    GET  /account            Current account snapshot
    GET  /positions          Open positions
    GET  /orders             Active (pending) orders
    GET  /history            Recent history orders + deals
    POST /send-order         Market / pending order entry
    POST /modify-order       Modify SL/TP (position or pending order)
    POST /close-order        Close (or partially close) a position
    POST /cancel-order       Cancel a pending order
    GET  /terminal           Terminal state + version
    GET  /heartbeat          Connection probe used by the Next.js transport

Phase 25A — MT5 Account Connection Manager:
    POST /test-connection    Probe login credentials (no sync, safe restore)
    GET  /accounts           List saved accounts (redacted, no passwords)
    POST /save-account       Create/update a saved account (encrypted password)
    PATCH /account/{id}      Rename / favorite / default / auto-connect / edit
    DELETE /account/{id}     Delete a saved account
    POST /switch-account     Connect to a saved account by id
    POST /auto-connect       Auto-connect default/autoConnect accounts
    GET  /connection-status  Active session + account + permission details
    GET  /terminal-info      Terminal metadata (version, build, path)
    GET  /broker-info        Broker + terminal display metadata
    GET  /account-export     Export account configuration (never passwords)
    POST /account-import     Import account configuration (no passwords)

Security: credentials are accepted only over the localhost interface and are
never included in any response. Saved passwords are encrypted at rest with
AES-256-GCM (see app/crypto.py). No credentials are ever logged.
"""

from __future__ import annotations

import time as _time
from typing import Any, Optional, Tuple

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    AccountPatchRequest,
    AutoConnectRequest,
    CancelOrderRequest,
    CloseOrderRequest,
    ConnectRequest,
    GatewayResponse,
    ModifyOrderRequest,
    PlaceOrderRequest,
    SaveAccountRequest,
    SwitchAccountRequest,
    TestConnectionRequest,
)
from .mt5_client import Mt5Client
from . import account_store
from . import crypto as _crypto

app = FastAPI(
    title="PrimaSta MT5 Gateway",
    description="Localhost bridge between PrimaSta Smart Trade Journal and MetaTrader 5.",
    version="1.1.0",
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
_store = account_store.AccountStore()
_started_at = _time.time()
_active_account_id: Optional[str] = None


def _error(message: str) -> GatewayResponse:
    return GatewayResponse(ok=False, data=None, error=message, message=message)


def _ok(data: Any = None, message: Optional[str] = None) -> GatewayResponse:
    return GatewayResponse(ok=True, data=data, error=None, message=message)


def _creds_from_account(account: dict) -> dict:
    password, investor = _store.decrypt_credentials(account)
    return {
        "login": account.get("login"),
        "password": password,
        "investor_password": investor,
        "server": account.get("server"),
        "terminal_path": account.get("terminalPath"),
        "magic": account.get("magic"),
        "deviation": account.get("deviation"),
    }


def _camelize(d: dict) -> dict:
    """Convert snake_case dict keys to the account store's camelCase."""

    def camel(key: str) -> str:
        parts = key.split("_")
        return parts[0] + "".join(p.capitalize() for p in parts[1:])

    return {camel(k): v for k, v in d.items()}


def _connect_account(account: dict) -> Tuple[bool, Optional[str]]:
    # Fast-fail: an account with no stored credentials must not attempt a
    # terminal login (it would hang against an unreachable broker). The
    # operator must re-enter the password from the connection form.
    if not account.get("credentialRef"):
        return (
            False,
            "No credentials saved for this account. Re-enter the password before connecting.",
        )
    ok, error = _client.connect(**_creds_from_account(account))
    return ok, error


# ── Health / heartbeat ──


@app.get("/health", response_model=GatewayResponse)
def health() -> GatewayResponse:
    return _ok(
        {
            "status": "ok",
            "transport": "python",
            "packageAvailable": _client.package_available,
            "packageError": _client.package_error,
            "cryptoAvailable": _crypto.crypto_available(),
            "cryptoError": _crypto.crypto_error(),
            "accountsStored": len(_store.list_all()),
            "terminalConnected": _client.is_connected,
            "version": _client.version,
            "build": _client.build,
            "uptimeSeconds": int(_time.time() - _started_at),
            "timestamp": _now(),
        }
    )


@app.get("/heartbeat", response_model=GatewayResponse)
def heartbeat() -> GatewayResponse:
    info = _client.heartbeat()
    info["ok"] = bool(info.get("connected"))
    info["latencyMs"] = None
    info["activeAccountId"] = _active_account_id
    return _ok(info)


# ── Connection lifecycle ──


@app.post("/connect", response_model=GatewayResponse)
def connect(body: ConnectRequest) -> GatewayResponse:
    if not _client.package_available:
        return _error(_client.package_error or "MetaTrader5 package is not available")

    # Saved-account connect path — credentials stay inside the gateway.
    if body.account_id:
        account = _store.get(body.account_id)
        if account is None:
            return _error("Saved MT5 account not found")
        try:
            ok, error = _connect_account(account)
        except Exception as exc:
            return _error(f"Connect failed: {exc}")
        if not ok:
            return _error(error or "MetaTrader5 connect failed")
        _set_active(body.account_id)
        return _connect_ok()

    # Direct-credentials connect path (env config or connection form).
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

    if body.remember:
        account = _store.save(
            {
                "name": body.name,
                "broker": "MetaTrader 5",
                "login": body.login,
                "password": body.password,
                "investorPassword": body.investor_password,
                "server": body.server,
                "terminalPath": body.terminal_path,
                "remember": True,
                "autoConnect": body.auto_connect,
                "readOnly": body.read_only,
                "demo": body.demo,
                "tradeMode": body.trade_mode,
                "magic": body.magic,
                "deviation": body.deviation,
            }
        )
        _set_active(account["id"])
    else:
        _set_active(None)

    return _connect_ok()


def _connect_ok() -> GatewayResponse:
    return _ok(
        {
            "connected": True,
            "activeAccountId": _active_account_id,
            "login": _client.login,
            "server": _client.server,
            "version": _client.version,
            "build": _client.build,
        },
        "MetaTrader5 connected",
    )


def _set_active(account_id: Optional[str]) -> None:
    global _active_account_id
    _active_account_id = account_id
    if account_id:
        _store.record_connection(account_id)


@app.post("/disconnect", response_model=GatewayResponse)
def disconnect() -> GatewayResponse:
    try:
        _client.disconnect()
    except Exception as exc:
        return _error(f"Disconnect failed: {exc}")
    global _active_account_id
    _active_account_id = None
    return _ok({"connected": False}, "MetaTrader5 disconnected")


@app.post("/test-connection", response_model=GatewayResponse)
def test_connection(body: TestConnectionRequest) -> GatewayResponse:
    global _active_account_id
    if not _client.package_available:
        return _error(_client.package_error or "MetaTrader5 package is not available")

    previous_active = _active_account_id
    was_connected = _client.is_connected

    # Release any existing session so the probe can attach cleanly.
    if was_connected:
        _client.disconnect()

    try:
        info = _client.probe_login(
            login=body.login,
            password=body.password,
            investor_password=body.investor_password,
            server=body.server,
            terminal_path=body.terminal_path,
        )
    except Exception as exc:
        return _error(f"Test connection failed: {exc}")
    finally:
        # Always detach the probe session, then restore the previous one.
        _client.disconnect()
        if was_connected and previous_active:
            account = _store.get(previous_active)
            if account is not None:
                try:
                    _connect_account(account)
                except Exception:
                    _client.disconnect()
                    _active_account_id = None

    if not info.get("connected"):
        return _error(info.get("error") or "Test connection failed")
    return _ok(info, "Test connection succeeded")


# ── Account registry (Phase 25A) ──


@app.get("/accounts", response_model=GatewayResponse)
def accounts() -> GatewayResponse:
    return _ok({"accounts": _store.list_redacted()})


@app.post("/save-account", response_model=GatewayResponse)
def save_account(body: SaveAccountRequest) -> GatewayResponse:
    if not _crypto.crypto_available():
        return _error(_crypto.crypto_error() or "Encryption is unavailable")
    if body.login is None:
        return _error("Account number (login) is required")
    payload = _camelize(body.model_dump(exclude_none=False))
    try:
        account = _store.save(payload)
    except Exception as exc:
        return _error(f"Save account failed: {exc}")
    return _ok({"account": _store.redact(account)}, "MT5 account saved")


@app.patch("/account/{account_id}", response_model=GatewayResponse)
def patch_account(account_id: str, body: AccountPatchRequest) -> GatewayResponse:
    account = _store.get(account_id)
    if account is None:
        return _error("MT5 account not found")
    updates = _camelize(body.model_dump(exclude_none=True))
    try:
        updated = _store.patch(account_id, updates)
    except Exception as exc:
        return _error(f"Update account failed: {exc}")
    return _ok({"account": _store.redact(updated)}, "MT5 account updated")


@app.delete("/account/{account_id}", response_model=GatewayResponse)
def delete_account(account_id: str) -> GatewayResponse:
    global _active_account_id
    if _active_account_id == account_id:
        _client.disconnect()
        _active_account_id = None
    deleted = _store.delete(account_id)
    if not deleted:
        return _error("MT5 account not found")
    return _ok({"deleted": True}, "MT5 account deleted")


@app.post("/switch-account", response_model=GatewayResponse)
def switch_account(body: SwitchAccountRequest) -> GatewayResponse:
    account = _store.get(body.account_id)
    if account is None:
        return _error("Saved MT5 account not found")
    try:
        ok, error = _connect_account(account)
    except Exception as exc:
        return _error(f"Switch failed: {exc}")
    if not ok:
        return _error(error or "MetaTrader5 connect failed")
    _set_active(account["id"])
    return _connect_ok()


@app.post("/auto-connect", response_model=GatewayResponse)
def auto_connect(body: AutoConnectRequest) -> GatewayResponse:
    if _client.is_connected and _active_account_id:
        account = _store.get(_active_account_id)
        if account is not None:
            return _ok(
                {
                    "connected": True,
                    "activeAccountId": _active_account_id,
                    "login": _client.login,
                    "server": _client.server,
                    "restored": True,
                },
                "MT5 session already active",
            )
    accounts = _store.resolve_auto_connect_order()
    if body.auto_only:
        accounts = [a for a in accounts if a.get("autoConnect")]
    errors: list[str] = []
    for account in accounts:
        if account.get("autoConnect") is False and not account.get("isDefault"):
            continue
        try:
            ok, error = _connect_account(account)
        except Exception as exc:
            ok, error = False, str(exc)
        if ok:
            _set_active(account["id"])
            return _ok(
                {
                    "connected": True,
                    "activeAccountId": _active_account_id,
                    "login": _client.login,
                    "server": _client.server,
                },
                "Auto-connected to saved MT5 account",
            )
        errors.append(error or "Unknown error")
    if not accounts:
        return _error("No saved MT5 accounts to auto-connect")
    return _error(f"Auto-connect failed: {'; '.join(errors[:3])}")


# ── Connection / terminal / broker info ──


@app.get("/connection-status", response_model=GatewayResponse)
def connection_status() -> GatewayResponse:
    status = _client.connection_status()
    account = _store.get(_active_account_id) if _active_account_id else None
    status.update(
        {
            "activeAccountId": _active_account_id,
            "activeAccountName": account.get("name") if account else None,
            "readOnly": bool(account.get("readOnly")) if account else None,
            "autoConnect": bool(account.get("autoConnect")) if account else None,
            "demoOverride": account.get("demo") if account else None,
            "tradeMode": account.get("tradeMode") if account else None,
            "lastConnectedAt": account.get("lastConnectedAt") if account else None,
            "lastLoginAt": account.get("lastLoginAt") if account else None,
            "lastSyncAt": account.get("lastSyncAt") if account else None,
        }
    )
    return _ok(status)


@app.get("/terminal-info", response_model=GatewayResponse)
def terminal_info() -> GatewayResponse:
    terminal = _client.terminal()
    terminal["activeAccountId"] = _active_account_id
    terminal["login"] = _client.login
    terminal["server"] = _client.server
    return _ok(terminal)


@app.get("/broker-info", response_model=GatewayResponse)
def broker_info() -> GatewayResponse:
    info = _client.broker_info()
    account = _store.get(_active_account_id) if _active_account_id else None
    if account:
        info["activeAccountId"] = _active_account_id
        info["activeAccountName"] = account.get("name")
        info["readOnly"] = bool(account.get("readOnly"))
    return _ok(info)


@app.get("/account-export", response_model=GatewayResponse)
def account_export() -> GatewayResponse:
    return _ok(_store.export(), "MT5 account configuration exported (no passwords)")


@app.post("/account-import", response_model=GatewayResponse)
def account_import(payload: dict) -> GatewayResponse:
    try:
        imported = _store.import_redacted(payload)
    except Exception as exc:
        return _error(f"Import failed: {exc}")
    return _ok({"imported": imported}, f"{imported} MT5 account(s) imported")


# ── Read / write endpoints (Phase 24, unchanged behavior) ──


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


def _now() -> str:
    from datetime import datetime, timezone

    return datetime.now(tz=timezone.utc).isoformat()
