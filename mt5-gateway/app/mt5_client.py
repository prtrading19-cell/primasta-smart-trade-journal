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
import queue as _queue
import threading as _threading
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
ORDER_TYPE_BUY_STOP_LIMIT = 6
ORDER_TYPE_SELL_STOP_LIMIT = 7

ORDER_STATE_STARTED = 0
ORDER_STATE_PLACED = 1
ORDER_STATE_PARTIAL = 2
ORDER_STATE_FILLED = 3
ORDER_STATE_CANCELED = 4
ORDER_STATE_EXPIRED = 5
ORDER_STATE_REJECTED = 6

# Account trade mode (from account_info().trade_mode)
ACCOUNT_TRADE_MODE_DEMO = 0
ACCOUNT_TRADE_MODE_CONTEST = 1
ACCOUNT_TRADE_MODE_REAL = 2

TRADE_MODE_NAMES = {
    ACCOUNT_TRADE_MODE_DEMO: "demo",
    ACCOUNT_TRADE_MODE_CONTEST: "contest",
    ACCOUNT_TRADE_MODE_REAL: "live",
}

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
    "buy-stop-limit": ORDER_TYPE_BUY_STOP_LIMIT,
    "sell-stop-limit": ORDER_TYPE_SELL_STOP_LIMIT,
}

# Filling policies (request.type_filling)
ORDER_FILLING_FOK = 0
ORDER_FILLING_IOC = 1
ORDER_FILLING_RETURN = 2

FILL_POLICY_NAMES = {
    "fok": ORDER_FILLING_FOK,
    "ioc": ORDER_FILLING_IOC,
    "return": ORDER_FILLING_RETURN,
}

# Order time in force policies (request.type_time)
ORDER_TIME_GTC = 0
ORDER_TIME_DAY = 1
ORDER_TIME_SPECIFIED = 2
ORDER_TIME_SPECIFIED_DAY = 3

TIME_POLICY_NAMES = {
    "gtc": ORDER_TIME_GTC,
    "day": ORDER_TIME_DAY,
    "specified": ORDER_TIME_SPECIFIED,
    "specified-day": ORDER_TIME_SPECIFIED_DAY,
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


def _parse_expiration(value: Any) -> Optional[int]:
    """Parse an ISO-8601 string or unix epoch (s or ms) into unix seconds."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value) if value < 10_000_000_000 else int(value / 1000)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text.isdigit():
            number = int(text)
            return number if number < 10_000_000_000 else int(number / 1000)
        try:
            parsed = _dt.datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=_dt.timezone.utc)
        return int(parsed.timestamp())
    return None


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
        self._stuck = False
        self._mt5_lock = _threading.RLock()

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
            ok = self._initialize_bounded(kwargs)
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

    def _initialize_bounded(self, kwargs: Dict[str, Any]) -> bool:
        """Run `mt5.initialize()` under the bounded runner so an unreachable
        broker cannot hang the gateway. Returns False with a recorded error on
        timeout; the stuck worker is left to die as a daemon and the client is
        marked unresponsive so later calls short-circuit cleanly."""
        target = kwargs.get("timeout", 30000)
        value = self._bounded(lambda: bool(mt5.initialize(**kwargs)), timeout_ms=target + 5000)
        if value is None:
            return False
        return bool(value)

    def _bounded(self, fn: Any, timeout_ms: int = 10000) -> Any:
        """Run a MetaTrader5 call on a watchdog thread.

        Returns the call's return value, or None if the call raised or did not
        finish within `timeout_ms`. On timeout the client is marked stuck:
        the wedged worker keeps holding the MT5 lock forever, so every later
        call short-circuits to a clean error instead of hanging the gateway.
        """
        if self._stuck:
            self._last_error = "Terminal is unresponsive. Restart the gateway to recover."
            return None

        result: _queue.Queue = _queue.Queue(maxsize=1)

        def runner() -> None:
            with self._mt5_lock:
                try:
                    result.put(("ok", fn()))
                except Exception as exc:  # pragma: no cover - defensive
                    result.put(("error", str(exc)))

        worker = _threading.Thread(target=runner, daemon=True, name="mt5-call")
        worker.start()
        worker.join(timeout=timeout_ms / 1000.0)
        if worker.is_alive():
            self._stuck = True
            self._last_error = "Terminal is unresponsive. Restart the gateway to recover."
            return None
        state, value = result.get_nowait()
        if state == "error":
            self._last_error = f"Terminal call failed: {value}"
            return None
        return value

    def disconnect(self) -> bool:
        if self.package_available:
            self._shutdown_quietly()
        self._connected = False
        return True

    def _shutdown_quietly(self) -> None:
        self._bounded(mt5.shutdown, timeout_ms=5000)

    def _capture_terminal_version(self) -> None:
        info = self._bounded(mt5.terminal_info, timeout_ms=5000)
        if info is not None:
            self._version = getattr(info, "version", None)
            self._build = getattr(info, "build", None)

    def _last_mt5_error(self) -> Tuple[Optional[int], Optional[str]]:
        if self._stuck:
            return None, "Terminal is unresponsive. Restart the gateway to recover."
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
            info = self._bounded(mt5.terminal_info, timeout_ms=5000)
        except Exception as exc:
            return {"connected": False, "terminalConnected": False, "error": str(exc)}
        if info is None:
            return {
                "connected": False,
                "terminalConnected": False,
                "error": self._last_error or "Terminal not reachable",
            }
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

    def connection_status(self) -> Dict[str, Any]:
        """Rich connection snapshot used by the account manager."""
        heartbeat = self.heartbeat()
        terminal = self.terminal()
        acc = self.account()
        return {
            **heartbeat,
            "login": heartbeat.get("login") or (acc.get("login") if acc else None),
            "server": heartbeat.get("server") or (acc.get("server") if acc else None),
            "brokerName": acc.get("brokerName") if acc else terminal.get("company"),
            "company": terminal.get("company"),
            "terminalVersion": terminal.get("version"),
            "terminalBuild": terminal.get("build"),
            "accountType": acc.get("accountType") if acc else None,
            "demo": (acc.get("accountType") == "demo") if acc else None,
            "accountName": acc.get("name") if acc else None,
            "currency": acc.get("currency") if acc else None,
            "leverage": acc.get("leverage") if acc else None,
            "balance": acc.get("balance") if acc else None,
            "equity": acc.get("equity") if acc else None,
            "tradeAllowed": terminal.get("tradeAllowed"),
            "tradeDisabled": terminal.get("tradeDisabled"),
            "tradeApiDisabled": terminal.get("tradeApiDisabled"),
            "autoTrading": terminal.get("autoTrading"),
        }

    def broker_info(self) -> Dict[str, Any]:
        """Broker + terminal metadata (display only)."""
        terminal = self.terminal()
        acc = self.account()
        return {
            "brokerName": acc.get("brokerName") if acc else terminal.get("company"),
            "company": terminal.get("company"),
            "server": acc.get("server") if acc else self._server,
            "accountType": acc.get("accountType") if acc else None,
            "demo": (acc.get("accountType") == "demo") if acc else None,
            "terminalVersion": terminal.get("version"),
            "terminalBuild": terminal.get("build"),
            "tradeAllowed": terminal.get("tradeAllowed"),
            "tradeDisabled": terminal.get("tradeDisabled"),
            "autoTrading": terminal.get("autoTrading"),
            "login": acc.get("login") if acc else self._login,
            "accountName": acc.get("name") if acc else None,
            "currency": acc.get("currency") if acc else None,
            "leverage": acc.get("leverage") if acc else None,
        }

    def probe_login(
        self,
        login: Optional[int] = None,
        password: Optional[str] = None,
        investor_password: Optional[str] = None,
        server: Optional[str] = None,
        terminal_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Connect + measure latency + report broker metadata, then disconnect.

        Used by /test-connection. Never synchronizes account state.
        """
        started = _time.perf_counter()
        ok, error = self.connect(
            login=login,
            password=password,
            investor_password=investor_password,
            server=server,
            terminal_path=terminal_path,
        )
        latency_ms = int((_time.perf_counter() - started) * 1000)
        info: Dict[str, Any] = {
            "connected": ok,
            "latencyMs": latency_ms,
            "error": error,
        }
        if ok:
            acc = self.account()
            terminal = self.terminal()
            info.update(
                {
                    "broker": (acc.get("brokerName") if acc else None) or terminal.get("company"),
                    "server": (acc.get("server") if acc else None) or server,
                    "build": self._build,
                    "company": terminal.get("company"),
                    "terminalVersion": self._version,
                    "accountType": acc.get("accountType") if acc else None,
                    "demo": (acc.get("accountType") == "demo") if acc else None,
                    "login": acc.get("login") if acc else login,
                }
            )
        return info

    # ── Symbols & market data ──

    @staticmethod
    def _symbol_point(info: Any) -> float:
        digits = int(getattr(info, "digits", 0) or 0)
        return 10.0 ** (-digits)

    @staticmethod
    def _session_state(info: Any) -> Dict[str, Any]:
        mode = int(getattr(info, "trade_mode", 0) or 0)
        return {
            "tradeMode": mode,
            "enabled": mode != 0,
            "longAllowed": mode == 3 or mode == 1,
            "shortAllowed": mode == 3 or mode == 2,
        }

    def symbol_spec(self, symbol: str) -> Dict[str, Any]:
        """Live contract specification for a symbol (digits, sizes, levels,
        margins, swap, session). All values come from MT5 `symbol_info`."""
        if not self.is_connected or self._stuck:
            return {"symbol": symbol, "available": False, "error": self._last_error or "Not connected"}
        info = self._bounded(lambda: mt5.symbol_info(symbol), timeout_ms=5000)
        if info is None:
            return {"symbol": symbol, "available": False, "error": "Symbol not found"}
        point = self._symbol_point(info)
        return {
            "symbol": symbol,
            "available": True,
            "digits": int(getattr(info, "digits", 0) or 0),
            "point": point,
            "contractSize": float(getattr(info, "trade_contract_size", 0.0) or 0.0),
            "tickSize": float(getattr(info, "trade_tick_size", 0.0) or 0.0),
            "tickValue": float(getattr(info, "trade_tick_value", 0.0) or 0.0),
            "tickValueProfit": float(getattr(info, "trade_tick_value_profit", 0.0) or 0.0),
            "tickValueLoss": float(getattr(info, "trade_tick_value_loss", 0.0) or 0.0),
            "volumeMin": float(getattr(info, "volume_min", 0.0) or 0.0),
            "volumeMax": float(getattr(info, "volume_max", 0.0) or 0.0),
            "volumeStep": float(getattr(info, "volume_step", 0.0) or 0.0),
            "stopsLevelPoints": int(getattr(info, "stops_level", 0) or 0),
            "freezeLevelPoints": int(getattr(info, "freeze_level", 0) or 0),
            "stopsLevel": float((getattr(info, "stops_level", 0) or 0) * point),
            "freezeLevel": float((getattr(info, "freeze_level", 0) or 0) * point),
            "spreadPoints": float(getattr(info, "spread", 0) or 0),
            "spread": float((getattr(info, "spread", 0) or 0) * point),
            "swapLong": float(getattr(info, "swap_long", 0.0) or 0.0),
            "swapShort": float(getattr(info, "swap_short", 0.0) or 0.0),
            "tradeCalcMode": int(getattr(info, "trade_calc_mode", 0) or 0),
            "tradeMode": int(getattr(info, "trade_mode", 0) or 0),
            "tradeModeFlags": int(getattr(info, "trade_mode_flags", 0) or 0),
            "marginInitial": float(getattr(info, "margin_initial", 0.0) or 0.0),
            "marginMaintenance": float(getattr(info, "margin_maintenance", 0.0) or 0.0),
            "marginHedged": float(getattr(info, "margin_hedged", 0.0) or 0.0),
            "marginLong": float(getattr(info, "margin_long", 0.0) or 0.0),
            "marginShort": float(getattr(info, "margin_short", 0.0) or 0.0),
            "currencyBase": getattr(info, "currency_base", "") or "",
            "currencyProfit": getattr(info, "currency_profit", "") or "",
            "currencyMargin": getattr(info, "currency_margin", "") or "",
            "description": getattr(info, "description", "") or "",
            "path": getattr(info, "path", "") or "",
            "session": self._session_state(info),
            "updatedAt": _now_iso(),
        }

    def symbol_tick(self, symbol: str) -> Dict[str, Any]:
        """Live bid/ask/spread and tick freshness for a symbol."""
        if not self.is_connected or self._stuck:
            return {"symbol": symbol, "available": False, "error": self._last_error or "Not connected"}
        tick = self._bounded(lambda: mt5.symbol_info_tick(symbol), timeout_ms=5000)
        if tick is None:
            return {"symbol": symbol, "available": False, "error": "No tick available"}
        tick_time = getattr(tick, "time", 0) or 0
        now = _time.time()
        bid = float(getattr(tick, "bid", 0.0) or 0.0)
        ask = float(getattr(tick, "ask", 0.0) or 0.0)
        return {
            "symbol": symbol,
            "available": True,
            "bid": bid,
            "ask": ask,
            "last": float(getattr(tick, "last", 0.0) or 0.0),
            "spread": round(ask - bid, 10),
            "volume": float(getattr(tick, "volume", 0.0) or 0.0),
            "time": _iso(tick_time),
            "timeMs": int(getattr(tick, "time_msc", 0) or 0),
            "ageSeconds": max(0, int(now - tick_time)),
            "marketLive": bool(tick_time and (now - tick_time) < 600),
            "updatedAt": _now_iso(),
        }

    def symbols(self, tradeable_only: bool = True) -> List[Dict[str, Any]]:
        """Tradeable symbols straight from `symbols_get`. Metadata is live;
        the active symbol's bid/ask is fetched on demand via symbol_tick."""
        if not self.is_connected or self._stuck:
            return []
        raw = self._bounded(mt5.symbols_get, timeout_ms=15000)
        if raw is None:
            return []
        result: List[Dict[str, Any]] = []
        for s in raw:
            try:
                symbol = getattr(s, "name", "") or ""
                if not symbol:
                    continue
                mode = int(getattr(s, "trade_mode", 0) or 0)
                if tradeable_only and mode == 0:
                    continue
                point = 10.0 ** (-int(getattr(s, "digits", 0) or 0))
                result.append(
                    {
                        "symbol": symbol,
                        "digits": int(getattr(s, "digits", 0) or 0),
                        "point": point,
                        "spreadPoints": float(getattr(s, "spread", 0) or 0),
                        "spread": float((getattr(s, "spread", 0) or 0) * point),
                        "contractSize": float(getattr(s, "trade_contract_size", 0.0) or 0.0),
                        "tickSize": float(getattr(s, "trade_tick_size", 0.0) or 0.0),
                        "tickValue": float(getattr(s, "trade_tick_value", 0.0) or 0.0),
                        "volumeMin": float(getattr(s, "volume_min", 0.0) or 0.0),
                        "volumeMax": float(getattr(s, "volume_max", 0.0) or 0.0),
                        "volumeStep": float(getattr(s, "volume_step", 0.0) or 0.0),
                        "tradeMode": mode,
                        "tradeAllowed": mode != 0,
                    }
                )
            except Exception:
                continue
        result.sort(key=lambda x: x["symbol"])
        return result

    # ── Trade calculators (official MT5 math, live data only) ──

    def calc_margin(self, symbol: str, volume: float, order_type: str = "buy", price: Optional[float] = None) -> Dict[str, Any]:
        if not self.is_connected or self._stuck:
            return {"ok": False, "error": self._last_error or "Not connected"}
        is_buy = order_type in ("buy", "buy-limit", "buy-stop", "buy-stop-limit")
        mt5_type = ORDER_TYPE_BUY if is_buy else ORDER_TYPE_SELL
        if price is None:
            tick = self.symbol_tick(symbol)
            if not tick.get("available"):
                return {"ok": False, "error": "No market price available for margin calculation"}
            price = tick.get("ask" if is_buy else "bid")
        try:
            result = self._bounded(lambda: mt5.order_calc_margin(mt5_type, symbol, float(volume), float(price)), timeout_ms=5000)
        except Exception as exc:
            return {"ok": False, "error": f"calc_margin raised: {exc}"}
        if result is None:
            code, message = self._last_mt5_error()
            return {"ok": False, "retcode": code, "error": message or "Margin calculation returned no result"}
        retcode = int(result[0])
        value = float(result[1]) if len(result) > 1 and result[1] is not None else None
        if retcode != TRADE_RETCODE_DONE:
            return {"ok": False, "retcode": retcode, "error": f"Margin calculation rejected (retcode {retcode})"}
        return {"ok": True, "margin": value, "symbol": symbol, "volume": float(volume), "orderType": order_type, "price": float(price), "retcode": retcode}

    def calc_profit(self, symbol: str, volume: float, order_type: str, open_price: float, close_price: float) -> Dict[str, Any]:
        if not self.is_connected or self._stuck:
            return {"ok": False, "error": self._last_error or "Not connected"}
        is_buy = order_type in ("buy", "buy-limit", "buy-stop", "buy-stop-limit")
        mt5_type = ORDER_TYPE_BUY if is_buy else ORDER_TYPE_SELL
        try:
            result = self._bounded(lambda: mt5.order_calc_profit(mt5_type, symbol, float(volume), float(open_price), float(close_price)), timeout_ms=5000)
        except Exception as exc:
            return {"ok": False, "error": f"calc_profit raised: {exc}"}
        if result is None:
            code, message = self._last_mt5_error()
            return {"ok": False, "retcode": code, "error": message or "Profit calculation returned no result"}
        retcode = int(result[0])
        value = float(result[1]) if len(result) > 1 and result[1] is not None else None
        if retcode != TRADE_RETCODE_DONE:
            return {"ok": False, "retcode": retcode, "error": f"Profit calculation rejected (retcode {retcode})"}
        return {"ok": True, "profit": value, "symbol": symbol, "volume": float(volume), "orderType": order_type, "openPrice": float(open_price), "closePrice": float(close_price), "retcode": retcode}

    def account(self) -> Optional[Dict[str, Any]]:
        if not self.is_connected or self._stuck:
            return None
        acc = self._bounded(mt5.account_info, timeout_ms=5000)
        if acc is None:
            return None
        terminal = self.terminal()
        trade_mode_raw = getattr(acc, "trade_mode", None)
        account_type = TRADE_MODE_NAMES.get(int(trade_mode_raw) if trade_mode_raw is not None else -1)
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
            "accountType": account_type,
            "tradeModeRaw": int(trade_mode_raw) if trade_mode_raw is not None else None,
            "tradeAllowed": bool(getattr(acc, "trade_allowed", False)),
            "tradeExpert": bool(getattr(acc, "trade_expert", False)),
            "tradeApiDisabled": bool(getattr(acc, "trade_api_disabled", False)),
            "terminalVersion": terminal.get("version"),
            "terminalBuild": terminal.get("build"),
            "terminalPath": terminal.get("path"),
            "updatedAt": _now_iso(),
        }

    # ── Read models ──

    def positions(self) -> List[Dict[str, Any]]:
        if not self.is_connected or self._stuck:
            return []
        raw = self._bounded(mt5.positions_get, timeout_ms=5000)
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
        if not self.is_connected or self._stuck:
            return []
        raw = self._bounded(mt5.orders_get, timeout_ms=5000)
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
        if not self.is_connected or self._stuck:
            return {"orders": orders, "deals": deals}
        raw_orders = self._bounded(lambda: mt5.history_orders_get(start, now), timeout_ms=10000)
        if raw_orders:
            for o in raw_orders:
                try:
                    orders.append(self._order_to_dict(o))
                except Exception:
                    continue
        raw_deals = self._bounded(lambda: mt5.history_deals_get(start, now), timeout_ms=10000)
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
        if self._stuck:
            return None
        tick = self._bounded(lambda: mt5.symbol_info_tick(symbol), timeout_ms=5000)
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
        if self._stuck:
            return {"ticket": None, "price": None, "message": "Terminal is unresponsive", "error": "Terminal is unresponsive. Restart the gateway to recover."}
        symbol = request.get("symbol", "")
        order_type = request.get("type", "buy")
        volume = float(request.get("volume", 0.0))
        price = request.get("price")
        sl = request.get("sl")
        tp = request.get("tp")
        magic = request.get("magic", self._magic or 0)
        deviation = request.get("deviation", self._deviation)
        comment = request.get("comment", "PRIMASTA") or "PRIMASTA"
        stop_limit = request.get("stop_limit")
        fill_policy = request.get("fill_policy")
        time_policy = request.get("time_policy")
        expiration = request.get("expiration")

        if order_type not in ORDER_TYPE_NAMES:
            return {"ticket": None, "price": None, "message": "Unsupported order type", "error": f"Unsupported order type: {order_type}"}

        is_pending = order_type in (
            "buy-limit",
            "sell-limit",
            "buy-stop",
            "sell-stop",
            "buy-stop-limit",
            "sell-stop-limit",
        )
        is_stop_limit = order_type in ("buy-stop-limit", "sell-stop-limit")
        action = TRADE_ACTION_PENDING if is_pending else TRADE_ACTION_DEAL
        mt5_type = ORDER_TYPE_NAMES[order_type]

        if is_pending:
            if not price:
                return {"ticket": None, "price": None, "message": "Price required for pending order", "error": "Pending orders require an explicit price"}
            if is_stop_limit and not stop_limit:
                return {"ticket": None, "price": None, "message": "Stop Limit trigger price required", "error": "Stop Limit orders require a stop limit (activation) price"}
        else:
            if not price:
                price = self._market_price(symbol, "buy" if mt5_type == ORDER_TYPE_BUY else "sell")

        if not price:
            return {"ticket": None, "price": None, "message": "No market price available", "error": "No market price available"}

        type_time = ORDER_TIME_GTC
        if time_policy:
            policy = str(time_policy).lower()
            if policy in ("specified", "specified-day"):
                if not expiration:
                    return {"ticket": None, "price": None, "message": "Expiration required", "error": "Orders with time policy 'specified' require an expiration timestamp"}
                parsed = self._parse_expiration(expiration)
                if parsed is None:
                    return {"ticket": None, "price": None, "message": "Invalid expiration", "error": "Expiration must be an ISO-8601 or unix timestamp"}
                type_time = TIME_POLICY_NAMES.get(policy, ORDER_TIME_SPECIFIED)
                if is_pending:
                    request_payload_extras = {"type_time": type_time, "expiration": int(parsed)}
                else:
                    request_payload_extras = {"type_time": type_time}
            elif policy in TIME_POLICY_NAMES:
                type_time = TIME_POLICY_NAMES[policy]
                request_payload_extras = {"type_time": type_time}
            else:
                request_payload_extras = {}
        else:
            request_payload_extras = {}

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
            "type_time": type_time,
            "type_filling": ORDER_FILLING_RETURN,
        }
        if is_stop_limit:
            request_payload["stoplimit"] = float(stop_limit)
        if is_pending:
            request_payload["type_filling"] = ORDER_FILLING_RETURN
        request_payload.update(request_payload_extras)
        if fill_policy:
            policy = str(fill_policy).lower()
            if policy in FILL_POLICY_NAMES:
                request_payload["type_filling"] = FILL_POLICY_NAMES[policy]

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
        if self._stuck:
            return "order"
        pos = self._bounded(lambda: mt5.positions_get(ticket=ticket), timeout_ms=5000)
        if pos:
            return "position"
        return "order"

    def modify_order(self, request: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_connected:
            return {"ticket": None, "price": None, "message": "Not connected", "error": "MT5 terminal is not connected"}
        if self._stuck:
            return {"ticket": None, "price": None, "message": "Terminal is unresponsive", "error": "Terminal is unresponsive. Restart the gateway to recover."}
        ticket = int(request.get("ticket", 0))
        sl = request.get("sl")
        tp = request.get("tp")
        price = request.get("price")
        comment = request.get("comment")

        kind = self._resolve_ticket(ticket)
        try:
            if kind == "position":
                pos = self._bounded(lambda: mt5.positions_get(ticket=ticket), timeout_ms=5000)
                symbol = getattr(pos[0], "symbol", "") if pos else ""
                payload = {
                    "action": TRADE_ACTION_SLTP,
                    "symbol": symbol,
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
        if self._stuck:
            return {"ticket": None, "price": None, "message": "Terminal is unresponsive", "error": "Terminal is unresponsive. Restart the gateway to recover."}
        ticket = int(request.get("ticket", 0))
        volume = request.get("volume")

        positions = self._bounded(lambda: mt5.positions_get(ticket=ticket), timeout_ms=5000)
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
        if self._stuck:
            return {"ticket": None, "price": None, "message": "Terminal is unresponsive", "error": "Terminal is unresponsive. Restart the gateway to recover."}
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
