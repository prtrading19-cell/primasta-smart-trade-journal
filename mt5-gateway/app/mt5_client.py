"""MetaTrader5 terminal wrapper for the Python gateway service.

All MetaTrader5 interactions are isolated here. The module is import-safe:
if the `MetaTrader5` package (or a terminal) is unavailable the service
still boots and reports a clear error through every endpoint.

Credentials are accepted via `connect()` arguments only and are never
logged, returned, or stored on disk.
"""

from __future__ import annotations

import datetime as _dt
import os
import time as _time
from typing import Any, Dict, List, Optional, Tuple

try:  # pragma: no cover - environment dependent
    import MetaTrader5 as mt5  # type: ignore

    _MT5_IMPORT_ERROR: Optional[str] = None
except Exception as exc:  # pragma: no cover - environment dependent
    mt5 = None  # type: ignore
    _MT5_IMPORT_ERROR = f"MetaTrader5 package is not available: {exc}"

# Order state / type / deal type / deal entry constants used below.
ORDER_TYPE_BUY = 0
ORDER_TYPE_SELL = 1
ORDER_TYPE_BUY_LIMIT = 2
ORDER_TYPE_SELL_LIMIT = 3
ORDER_TYPE_BUY_STOP = 4
ORDER_TYPE_SELL_STOP = 5

ORDER_STATE_STARTED = 0
ORDER_STATE_PLACED = 1
ORDER_STATE_PARTIAL = 2
ORDER_STATE_FILLED = 3
ORDER_STATE_CANCELED = 4
ORDER_STATE_EXPIRED = 5
ORDER_STATE_REJECTED = 6

POSITION_TYPE_BUY = 0
POSITION_TYPE_SELL = 1

DEAL_TYPE_BUY = 0
DEAL_TYPE_SELL = 1
DEAL_TYPE_BALANCE = 2
DEAL_TYPE_CREDIT = 3
DEAL_ENTRY_IN = 0

TRADE_ACTION_DEAL = 1
TRADE_ACTION_MODIFY = 2
TRADE_ACTION_REMOVE = 3
TRADE_ACTION_SLTP = 5
TRADE_ACTION_PENDING = 6

ORDER_TIME_GTC = 0
ORDER_FILLING_RETURN = 2

TRADE_RETCODE_DONE = 10009
TRADE_RETCODE_PLACED = 10008

ORDER_TYPE_NAMES = {
    "buy": ORDER_TYPE_BUY,
    "sell": ORDER_TYPE_SELL,
    "buy-limit": ORDER_TYPE_BUY_LIMIT,
    "sell-limit": ORDER_TYPE_SELL_LIMIT,
    "buy-stop": ORDER_TYPE_BUY_STOP,
    "sell-stop": ORDER_TYPE_SELL_STOP,
}

ORDER_STATE_NAMES = {
    ORDER_STATE_FILLED: "filled",
    ORDER_STATE_CANCELED: "cancelled",
    ORDER_STATE_EXPIRED: "expired",
    ORDER_STATE_REJECTED: "cancelled",
}

DEAL_TYPE_NAMES = {
    DEAL_TYPE_BUY: "buy",
    DEAL_TYPE_SELL: "sell",
    DEAL_TYPE_BALANCE: "balance",
    DEAL_TYPE_CREDIT: "credit",
}


def _iso(ts: Optional[float]) -> str:
    if not ts:
        return ""
    try:
        return _dt.datetime.fromtimestamp(ts, tz=_dt.timezone.utc).isoformat()
    except (ValueError, OSError, OverflowError):
        return ""


def _now_iso() -> str:
    return _dt.datetime.now(tz=_dt.timezone.utc).isoformat()


class Mt5Client:
    """Thin, defensive wrapper around the MetaTrader5 python package."""

    def __init__(self) -> None:
        self._connected = False
        self._last_error: Optional[str] = None
        self._login: Optional[int] = None
        self._server: Optional[str] = None
        self._terminal_path: Optional[str] = None
        self._magic: Optional[int] = None
        self._deviation: int = 20
        self._version: Optional[str] = None
        self._build: Optional[int] = None

    @property
    def package_available(self) -> bool:
        return mt5 is not None

    @property
    def package_error(self) -> Optional[str]:
        return _MT5_IMPORT_ERROR

    @property
    def is_connected(self) -> bool:
        return self._connected and self.package_available

    @property
    def version(self) -> Optional[str]:
        return self._version

    @property
    def build(self) -> Optional[int]:
        return self._build

    @property
    def login(self) -> Optional[int]:
        return self._login

    @property
    def server(self) -> Optional[str]:
        return self._server

    def last_error(self) -> Optional[str]:
        return self._last_error

    # ── Connection lifecycle ──

    def connect(
        self,
        login: Optional[int] = None,
        password: Optional[str] = None,
        investor_password: Optional[str] = None,
        server: Optional[str] = None,
        terminal_path: Optional[str] = None,
        magic: Optional[int] = None,
        deviation: Optional[int] = None,
    ) -> Tuple[bool, Optional[str]]:
        if not self.package_available:
            self._connected = False
            self._last_error = self.package_error
            return False, self._last_error

        effective_login = login if login is not None else self._env_int("MT5_LOGIN")
        effective_password = (
            password
            if password is not None
            else os.environ.get("MT5_PASSWORD")
        )
        effective_investor = (
            investor_password
            if investor_password is not None
            else os.environ.get("MT5_INVESTOR_PASSWORD")
        )
        effective_server = server if server is not None else (os.environ.get("MT5_SERVER") or None)
        effective_path = terminal_path if terminal_path is not None else (os.environ.get("MT5_TERMINAL_PATH") or None)
        effective_magic = magic if magic is not None else self._env_int("MT5_MAGIC")
        if deviation is not None:
            self._deviation = deviation
        elif self._deviation is None:
            self._deviation = self._env_int("MT5_DEVIATION") or 20

        self._shutdown_quietly()

        kwargs: Dict[str, Any] = {"timeout": 30000}
        if effective_path:
            kwargs["path"] = effective_path
        if effective_login:
            kwargs["login"] = effective_login
        if effective_password or effective_investor:
            kwargs["password"] = effective_password or effective_investor
        if effective_server:
            kwargs["server"] = effective_server

        try:
            ok = mt5.initialize(**kwargs)
        except Exception as exc:  # pragma: no cover - defensive
            self._connected = False
            self._last_error = f"initialize failed: {exc}"
            return False, self._last_error

        if not ok:
            code, message = self._last_mt5_error()
            self._connected = False
            self._last_error = message or "MetaTrader5 initialize failed"
            return False, self._last_error

        self._connected = True
        self._login = effective_login
        self._server = effective_server
        self._terminal_path = effective_path
        if effective_magic is not None:
            self._magic = effective_magic
        self._capture_terminal_version()
        return True, None

    def disconnect(self) -> bool:
        if self.package_available:
            self._shutdown_quietly()
        self._connected = False
        return True

    def _shutdown_quietly(self) -> None:
        try:
            mt5.shutdown()
        except Exception:
            pass

    def _capture_terminal_version(self) -> None:
        try:
            info = mt5.terminal_info()
            if info is not None:
                self._version = getattr(info, "version", None)
                self._build = getattr(info, "build", None)
        except Exception:
            pass

    def _last_mt5_error(self) -> Tuple[Optional[int], Optional[str]]:
        try:
            return mt5.last_error()
        except Exception:
            return None, None

    @staticmethod
    def _env_int(key: str) -> Optional[int]:
        raw = os.environ.get(key, "").strip()
        if not raw:
            return None
        try:
            return int(raw)
        except ValueError:
            return None

    # ── Introspection ──

    def terminal(self) -> Dict[str, Any]:
        if not self.package_available:
            return {
                "packageAvailable": False,
                "packageError": self.package_error,
                "connected": False,
                "terminalConnected": False,
            }
        try:
            info = mt5.terminal_info()
        except Exception as exc:
            return {"connected": False, "terminalConnected": False, "error": str(exc)}
        if info is None:
            return {"connected": False, "terminalConnected": False}
        terminal_connected = bool(getattr(info, "connected", False))
        self._connected = terminal_connected and self.package_available
        return {
            "packageAvailable": True,
            "terminalConnected": terminal_connected,
            "connected": terminal_connected,
            "name": getattr(info, "name", None),
            "company": getattr(info, "company", None),
            "version": getattr(info, "version", None),
            "build": getattr(info, "build", None),
            "path": getattr(info, "path", None),
            "tradeAllowed": bool(getattr(info, "trade_allowed", False)),
            "tradeDisabled": bool(getattr(info, "trade_disabled", False)),
            "tradeApiDisabled": bool(getattr(info, "trade_api_disabled", False)),
            "autoTrading": bool(getattr(info, "auto_trading", False)),
            "accountLogin": getattr(info, "login", None),
        }

    def heartbeat(self) -> Dict[str, Any]:
        terminal = self.terminal()
        return {
            "connected": terminal.get("terminalConnected", False),
            "login": self._login,
            "server": self._server,
            "version": self._version,
            "build": self._build,
            "timestamp": _now_iso(),
        }

    def account(self) -> Optional[Dict[str, Any]]:
        if not self.is_connected:
            return None
        try:
            acc = mt5.account_info()
        except Exception as exc:
            self._last_error = str(exc)
            return None
        if acc is None:
            return None
        terminal = self.terminal()
        return {
            "login": getattr(acc, "login", None),
            "name": getattr(acc, "name", ""),
            "server": getattr(acc, "server", ""),
            "currency": getattr(acc, "currency", ""),
            "leverage": getattr(acc, "leverage", 0),
            "balance": getattr(acc, "balance", 0.0),
            "equity": getattr(acc, "equity", 0.0),
            "margin": getattr(acc, "margin", 0.0),
            "marginFree": getattr(acc, "margin_free", 0.0),
            "marginLevel": getattr(acc, "margin_level", None),
            "profit": getattr(acc, "profit", 0.0),
            "credit": getattr(acc, "credit", 0.0),
            "brokerName": getattr(acc, "company", "") or "",
            "terminalVersion": terminal.get("version"),
            "terminalBuild": terminal.get("build"),
            "terminalPath": terminal.get("path"),
            "updatedAt": _now_iso(),
        }

    # ── Read models ──

    def positions(self) -> List[Dict[str, Any]]:
        if not self.is_connected:
            return []
        try:
            raw = mt5.positions_get()
        except Exception:
            return []
        if raw is None:
            return []
        result = []
        for p in raw:
            try:
                result.append(
                    {
                        "ticket": getattr(p, "ticket", 0),
                        "symbol": getattr(p, "symbol", ""),
                        "type": "buy" if int(getattr(p, "type", 0)) == POSITION_TYPE_BUY else "sell",
                        "magic": getattr(p, "magic", 0),
                        "volume": float(getattr(p, "volume", 0.0)),
                        "priceOpen": float(getattr(p, "price_open", 0.0)),
                        "priceCurrent": float(getattr(p, "price_current", 0.0)),
                        "sl": float(getattr(p, "sl", 0.0) or 0.0),
                        "tp": float(getattr(p, "tp", 0.0) or 0.0),
                        "profit": float(getattr(p, "profit", 0.0)),
                        "swap": float(getattr(p, "swap", 0.0)),
                        "commission": 0.0,
                        "comment": getattr(p, "comment", "") or "",
                        "openTime": _iso(getattr(p, "time", None)),
                        "openTimeRaw": int(getattr(p, "time", 0) or 0),
                    }
                )
            except Exception:
                continue
        return result

    def orders(self) -> List[Dict[str, Any]]:
        if not self.is_connected:
            return []
        try:
            raw = mt5.orders_get()
        except Exception:
            return []
        if raw is None:
            return []
        result = []
        for o in raw:
            try:
                result.append(self._order_to_dict(o))
            except Exception:
                continue
        return result

    def history(self, days: int = 7) -> Dict[str, Any]:
        now = int(_time.time())
        start = now - int(days * 86400)
        orders: List[Dict[str, Any]] = []
        deals: List[Dict[str, Any]] = []
        if not self.is_connected:
            return {"orders": orders, "deals": deals}
        try:
            raw_orders = mt5.history_orders_get(start, now)
        except Exception:
            raw_orders = None
        if raw_orders:
            for o in raw_orders:
                try:
                    orders.append(self._order_to_dict(o))
                except Exception:
                    continue
        try:
            raw_deals = mt5.history_deals_get(start, now)
        except Exception:
            raw_deals = None
        if raw_deals:
            for d in raw_deals:
                try:
                    deals.append(self._deal_to_dict(d))
                except Exception:
                    continue
        return {"orders": orders, "deals": deals}

    @staticmethod
    def _order_to_dict(o: Any) -> Dict[str, Any]:
        state_raw = int(getattr(o, "state", 0))
        state = ORDER_STATE_NAMES.get(state_raw, "pending")
        type_raw = int(getattr(o, "type", 0))
        order_type = "unknown"
        for name, value in ORDER_TYPE_NAMES.items():
            if value == type_raw:
                order_type = name
                break
        volume_initial = float(getattr(o, "volume_initial", 0.0) or 0.0)
        volume_current = float(getattr(o, "volume_current", 0.0) or 0.0)
        volume = volume_current if volume_current > 0 else volume_initial
        return {
            "ticket": getattr(o, "ticket", 0),
            "symbol": getattr(o, "symbol", ""),
            "type": order_type,
            "state": state,
            "magic": getattr(o, "magic", 0),
            "volume": volume,
            "priceOpen": float(getattr(o, "price_open", 0.0) or 0.0),
            "priceCurrent": float(getattr(o, "price_current", 0.0) or 0.0),
            "sl": float(getattr(o, "sl", 0.0) or 0.0),
            "tp": float(getattr(o, "tp", 0.0) or 0.0),
            "profit": float(getattr(o, "profit", 0.0) or 0.0),
            "swap": float(getattr(o, "swap", 0.0) or 0.0),
            "comment": getattr(o, "comment", "") or "",
            "openTime": _iso(getattr(o, "time_setup", None)),
            "closeTime": _iso(getattr(o, "time_done", None)) or None,
            "reason": str(getattr(o, "reason", "")) or None,
        }

    @staticmethod
    def _deal_to_dict(d: Any) -> Dict[str, Any]:
        type_raw = int(getattr(d, "type", 0))
        entry_raw = int(getattr(d, "entry", 1))
        return {
            "ticket": getattr(d, "ticket", 0),
            "orderTicket": getattr(d, "order", 0),
            "symbol": getattr(d, "symbol", ""),
            "type": DEAL_TYPE_NAMES.get(type_raw, "credit"),
            "direction": "in" if entry_raw == DEAL_ENTRY_IN else "out",
            "volume": float(getattr(d, "volume", 0.0) or 0.0),
            "price": float(getattr(d, "price", 0.0) or 0.0),
            "profit": float(getattr(d, "profit", 0.0) or 0.0),
            "commission": float(getattr(d, "commission", 0.0) or 0.0),
            "swap": float(getattr(d, "swap", 0.0) or 0.0),
            "fee": float(getattr(d, "fee", 0.0) or 0.0),
            "comment": getattr(d, "comment", "") or "",
            "time": _iso(getattr(d, "time", None)),
            "timeRaw": int(getattr(d, "time", 0) or 0),
        }

    # ── Write models ──

    def _market_price(self, symbol: str, direction: str) -> Optional[float]:
        try:
            tick = mt5.symbol_info_tick(symbol)
        except Exception:
            return None
        if tick is None:
            return None
        if direction == "buy":
            return float(tick.ask)
        return float(tick.bid)

    def place_order(
        self,
        request: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not self.is_connected:
            return {"ticket": None, "price": None, "message": "Not connected", "error": "MT5 terminal is not connected"}
        symbol = request.get("symbol", "")
        order_type = request.get("type", "buy")
        volume = float(request.get("volume", 0.0))
        price = request.get("price")
        sl = request.get("sl")
        tp = request.get("tp")
        magic = request.get("magic", self._magic or 0)
        deviation = request.get("deviation", self._deviation)
        comment = request.get("comment", "PRIMASTA") or "PRIMASTA"

        if order_type not in ORDER_TYPE_NAMES:
            return {"ticket": None, "price": None, "message": "Unsupported order type", "error": f"Unsupported order type: {order_type}"}

        is_pending = order_type in ("buy-limit", "sell-limit", "buy-stop", "sell-stop")
        action = TRADE_ACTION_PENDING if is_pending else TRADE_ACTION_DEAL
        mt5_type = ORDER_TYPE_NAMES[order_type]

        if is_pending:
            if not price:
                return {"ticket": None, "price": None, "message": "Price required for pending order", "error": "Pending orders require an explicit price"}
        else:
            if not price:
                price = self._market_price(symbol, "buy" if mt5_type == ORDER_TYPE_BUY else "sell")

        if not price:
            return {"ticket": None, "price": None, "message": "No market price available", "error": "No market price available"}

        request_payload = {
            "action": action,
            "symbol": symbol,
            "volume": volume,
            "type": mt5_type,
            "price": float(price),
            "sl": float(sl) if sl else 0.0,
            "tp": float(tp) if tp else 0.0,
            "deviation": int(deviation or 20),
            "magic": int(magic or 0),
            "comment": comment,
            "type_time": ORDER_TIME_GTC,
            "type_filling": ORDER_FILLING_RETURN,
        }
        if is_pending:
            request_payload["type_filling"] = ORDER_FILLING_RETURN

        try:
            result = mt5.order_send(request_payload)
        except Exception as exc:
            return {"ticket": None, "price": None, "message": "order_send raised", "error": str(exc)}

        if result is None:
            code, message = self._last_mt5_error()
            return {"ticket": None, "price": None, "message": message or "Order send returned no result", "error": message or "Order send returned no result"}

        retcode = int(getattr(result, "retcode", -1))
        ticket = getattr(result, "order", 0) or 0
        deal = getattr(result, "deal", 0) or 0
        fill_price = getattr(result, "price", None)
        comment_out = getattr(result, "comment", "") or ""

        if retcode in (TRADE_RETCODE_DONE, TRADE_RETCODE_PLACED):
            final_ticket = ticket if ticket else deal
            return {
                "ticket": int(final_ticket) or None,
                "price": float(fill_price) if fill_price else (price or None),
                "message": f"Order sent (retcode {retcode}){(' ' + comment_out) if comment_out else ''}",
                "error": None,
            }

        message = f"Broker retcode {retcode}{(' ' + comment_out) if comment_out else ''}"
        return {"ticket": None, "price": None, "message": message, "error": message}

    def _resolve_ticket(self, ticket: int) -> str:
        """Return 'position' if the ticket is an open position else 'order'."""
        try:
            pos = mt5.positions_get(ticket=ticket)
        except Exception:
            pos = None
        if pos:
            return "position"
        return "order"

    def modify_order(self, request: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_connected:
            return {"ticket": None, "price": None, "message": "Not connected", "error": "MT5 terminal is not connected"}
        ticket = int(request.get("ticket", 0))
        sl = request.get("sl")
        tp = request.get("tp")
        price = request.get("price")
        comment = request.get("comment")

        kind = self._resolve_ticket(ticket)
        try:
            if kind == "position":
                payload = {
                    "action": TRADE_ACTION_SLTP,
                    "symbol": getattr(mt5.positions_get(ticket=ticket)[0], "symbol", ""),
                    "position": ticket,
                    "sl": float(sl) if sl else 0.0,
                    "tp": float(tp) if tp else 0.0,
                }
            else:
                payload = {
                    "action": TRADE_ACTION_MODIFY,
                    "order": ticket,
                    "price": float(price) if price else 0.0,
                    "sl": float(sl) if sl else 0.0,
                    "tp": float(tp) if tp else 0.0,
                }
            result = mt5.order_send(payload)
        except Exception as exc:
            return {"ticket": None, "price": None, "message": "modify raised", "error": str(exc)}

        if result is None:
            code, message = self._last_mt5_error()
            return {"ticket": None, "price": None, "message": message or "Modify returned no result", "error": message or "Modify returned no result"}

        retcode = int(getattr(result, "retcode", -1))
        if retcode in (TRADE_RETCODE_DONE, TRADE_RETCODE_PLACED):
            return {"ticket": ticket, "price": getattr(result, "price", None), "message": f"Modified (retcode {retcode})", "error": None}
        message = f"Broker retcode {retcode}"
        return {"ticket": ticket, "price": None, "message": message, "error": message}

    def close_position(self, request: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_connected:
            return {"ticket": None, "price": None, "message": "Not connected", "error": "MT5 terminal is not connected"}
        ticket = int(request.get("ticket", 0))
        volume = request.get("volume")

        try:
            positions = mt5.positions_get(ticket=ticket)
        except Exception:
            positions = None
        if not positions:
            return {"ticket": None, "price": None, "message": "Position not found", "error": f"Position {ticket} not found"}
        pos = positions[0]
        position_type = int(getattr(pos, "type", POSITION_TYPE_BUY))
        symbol = getattr(pos, "symbol", "")
        close_volume = float(volume) if volume else float(getattr(pos, "volume", 0.0))
        direction = "sell" if position_type == POSITION_TYPE_BUY else "buy"
        price = self._market_price(symbol, direction)
        if not price:
            return {"ticket": None, "price": None, "message": "No market price available", "error": "No market price available"}
        reverse_type = ORDER_TYPE_SELL if position_type == POSITION_TYPE_BUY else ORDER_TYPE_BUY

        payload = {
            "action": TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": close_volume,
            "type": reverse_type,
            "position": ticket,
            "price": float(price),
            "deviation": int(self._deviation),
            "magic": int(getattr(pos, "magic", 0) or 0),
            "comment": "PRIMASTA close",
            "type_filling": ORDER_FILLING_RETURN,
        }
        try:
            result = mt5.order_send(payload)
        except Exception as exc:
            return {"ticket": None, "price": None, "message": "close raised", "error": str(exc)}

        if result is None:
            code, message = self._last_mt5_error()
            return {"ticket": None, "price": None, "message": message or "Close returned no result", "error": message or "Close returned no result"}

        retcode = int(getattr(result, "retcode", -1))
        deal = getattr(result, "deal", 0) or 0
        if retcode in (TRADE_RETCODE_DONE, TRADE_RETCODE_PLACED):
            return {
                "ticket": int(deal) or ticket,
                "price": getattr(result, "price", None),
                "message": f"Closed (retcode {retcode})",
                "error": None,
            }
        message = f"Broker retcode {retcode}"
        return {"ticket": None, "price": None, "message": message, "error": message}

    def cancel_order(self, ticket: int) -> Dict[str, Any]:
        if not self.is_connected:
            return {"ticket": None, "price": None, "message": "Not connected", "error": "MT5 terminal is not connected"}
        payload = {"action": TRADE_ACTION_REMOVE, "order": int(ticket)}
        try:
            result = mt5.order_send(payload)
        except Exception as exc:
            return {"ticket": None, "price": None, "message": "cancel raised", "error": str(exc)}

        if result is None:
            code, message = self._last_mt5_error()
            return {"ticket": None, "price": None, "message": message or "Cancel returned no result", "error": message or "Cancel returned no result"}

        retcode = int(getattr(result, "retcode", -1))
        if retcode in (TRADE_RETCODE_DONE, TRADE_RETCODE_PLACED):
            return {"ticket": int(ticket), "price": None, "message": f"Cancelled (retcode {retcode})", "error": None}
        message = f"Broker retcode {retcode}"
        return {"ticket": None, "price": None, "message": message, "error": message}
