"""Encrypted MT5 account registry.

The gateway is the single source of truth for saved MT5 accounts. Each
account references an encrypted credential entry; passwords are never stored
in plain text and never returned through the API. The registry survives
gateway restarts and lives at <gateway>/data/mt5-accounts.json.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import uuid
from typing import Any, Dict, List, Optional, Tuple

from . import crypto

DATA_FILE = os.environ.get(
    "MT5_ACCOUNT_DATA_FILE"
) or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "mt5-accounts.json"))

_EMPTY_DATA: Dict[str, Any] = {"version": 1, "credentials": {}, "accounts": []}


def _now_iso() -> str:
    return _dt.datetime.now(tz=_dt.timezone.utc).isoformat()


class AccountStore:
    def __init__(self, path: Optional[str] = None) -> None:
        self.path = path or DATA_FILE
        self._data: Dict[str, Any] = self._load()

    # ── Persistence ──

    def _load(self) -> Dict[str, Any]:
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, dict):
                return dict(_EMPTY_DATA)
            data.setdefault("credentials", {})
            data.setdefault("accounts", [])
            return data
        except Exception:
            return dict(_EMPTY_DATA)

    def _save(self) -> None:
        directory = os.path.dirname(self.path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2)

    # ── Credential refs ──

    def _new_credential(
        self, password: Optional[str], investor_password: Optional[str]
    ) -> str:
        ref = "cred_" + uuid.uuid4().hex[:12]
        entry: Dict[str, Any] = {"updatedAt": _now_iso()}
        if password is not None:
            entry["password"] = crypto.encrypt_secret(password)
        if investor_password is not None:
            entry["investorPassword"] = crypto.encrypt_secret(investor_password)
        self._data["credentials"][ref] = entry
        return ref

    def _update_credential(
        self,
        ref: str,
        password: Optional[str],
        investor_password: Optional[str],
    ) -> None:
        entry = self._data["credentials"].get(ref)
        if entry is None:
            entry = {"updatedAt": _now_iso()}
            self._data["credentials"][ref] = entry
        if password is not None:
            entry["password"] = crypto.encrypt_secret(password)
        if investor_password is not None:
            entry["investorPassword"] = crypto.encrypt_secret(investor_password)
        entry["updatedAt"] = _now_iso()

    def _decrypt_credential(self, ref: str) -> Tuple[Optional[str], Optional[str]]:
        entry = self._data["credentials"].get(ref)
        if not entry:
            return None, None
        password = None
        investor = None
        if entry.get("password"):
            password = crypto.decrypt_secret(entry["password"])
        if entry.get("investorPassword"):
            investor = crypto.decrypt_secret(entry["investorPassword"])
        return password, investor

    # ── Account lookups ──

    def get(self, account_id: str) -> Optional[Dict[str, Any]]:
        for account in self._data["accounts"]:
            if account.get("id") == account_id:
                return account
        return None

    def list_all(self) -> List[Dict[str, Any]]:
        return list(self._data["accounts"])

    def decrypt_credentials(self, account: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        return self._decrypt_credential(account.get("credentialRef", ""))

    def redact(self, account: Dict[str, Any]) -> Dict[str, Any]:
        out = {k: v for k, v in account.items() if k != "credentialRef"}
        out["hasSavedPassword"] = account.get("credentialRef") in self._data["credentials"]
        return out

    def list_redacted(self) -> List[Dict[str, Any]]:
        accounts = self.list_all()
        default_id = next((a.get("id") for a in accounts if a.get("isDefault")), None)
        return [self.redact(a) for a in accounts]

    def resolve_auto_connect_order(self) -> List[Dict[str, Any]]:
        accounts = self.list_all()
        if not accounts:
            return []

        def sort_key(account: Dict[str, Any]) -> Tuple[int, int, str]:
            default = 0 if account.get("isDefault") else 1
            auto = 0 if account.get("autoConnect") else 1
            last = account.get("lastUsedAt") or ""
            return (default, auto, last)

        return sorted(accounts, key=sort_key, reverse=True)

    # ── Mutations ──

    def save(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update an account. Passwords are encrypted at rest."""
        account_id = payload.get("id")
        existing = self.get(account_id) if account_id else None

        password = payload.get("password")
        investor_password = payload.get("investorPassword")
        if password is not None and isinstance(password, str) and password == "":
            password = None
        if investor_password is not None and isinstance(investor_password, str) and investor_password == "":
            investor_password = None

        if existing is not None:
            ref = existing.get("credentialRef", "")
            if password is not None or investor_password is not None:
                if not ref:
                    ref = self._new_credential(None, None)
                    existing["credentialRef"] = ref
                self._update_credential(ref, password, investor_password)
            account = existing
        else:
            account = {
                "id": "acc_" + uuid.uuid4().hex[:12],
                "createdAt": _now_iso(),
                "updatedAt": _now_iso(),
                "lastConnectedAt": None,
                "lastUsedAt": None,
                "lastLoginAt": None,
                "lastSyncAt": None,
            }
            ref = None
            if password is not None or investor_password is not None:
                ref = self._new_credential(password, investor_password)
            account["credentialRef"] = ref
            self._data["accounts"].append(account)

        self._apply_fields(account, payload)

        if payload.get("isDefault"):
            for other in self._data["accounts"]:
                if other.get("id") != account["id"]:
                    other["isDefault"] = False
            account["isDefault"] = True
        elif payload.get("isDefault") is False:
            account["isDefault"] = False

        self._ensure_default()
        account["updatedAt"] = _now_iso()
        self._save()
        return dict(account)

    def _apply_fields(self, account: Dict[str, Any], payload: Dict[str, Any]) -> None:
        for field in (
            "name",
            "broker",
            "server",
            "terminalPath",
            "tradeMode",
            "comment",
        ):
            if payload.get(field) is not None:
                account[field] = payload[field]
        for field in (
            "login",
            "magic",
            "deviation",
        ):
            if payload.get(field) is not None:
                account[field] = payload[field]
        for field in (
            "remember",
            "autoConnect",
            "readOnly",
            "favorite",
            "isDefault",
        ):
            if payload.get(field) is not None:
                account[field] = bool(payload[field])
        if payload.get("demo") is not None:
            account["demo"] = bool(payload["demo"])
        if account.get("broker") is None:
            account["broker"] = "MetaTrader 5"

    def patch(self, account_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        account = self.get(account_id)
        if account is None:
            return None

        password = updates.get("password")
        investor_password = updates.get("investorPassword")
        if password and isinstance(password, str) and password != "":
            ref = account.get("credentialRef", "")
            if not ref:
                ref = self._new_credential(None, None)
                account["credentialRef"] = ref
            self._update_credential(ref, password, None)
        if investor_password and isinstance(investor_password, str) and investor_password != "":
            ref = account.get("credentialRef", "")
            if not ref:
                ref = self._new_credential(None, None)
                account["credentialRef"] = ref
            self._update_credential(ref, None, investor_password)

        self._apply_fields(account, updates)

        if updates.get("isDefault") is True:
            for other in self._data["accounts"]:
                if other.get("id") != account_id:
                    other["isDefault"] = False
            account["isDefault"] = True

        self._ensure_default()
        account["updatedAt"] = _now_iso()
        self._save()
        return dict(account)

    def delete(self, account_id: str) -> bool:
        before = len(self._data["accounts"])
        self._data["accounts"] = [
            a for a in self._data["accounts"] if a.get("id") != account_id
        ]
        if len(self._data["accounts"]) == before:
            return False
        self._data["credentials"] = {
            ref: entry
            for ref, entry in self._data["credentials"].items()
            if any(a.get("credentialRef") == ref for a in self._data["accounts"])
        }
        self._ensure_default()
        self._save()
        return True

    def record_connection(self, account_id: str, synced: bool = False) -> None:
        account = self.get(account_id)
        if account is None:
            return
        account["lastConnectedAt"] = _now_iso()
        account["lastUsedAt"] = _now_iso()
        account["lastLoginAt"] = _now_iso()
        if synced:
            account["lastSyncAt"] = _now_iso()
        account["updatedAt"] = _now_iso()
        self._save()

    def record_sync(self, account_id: str) -> None:
        account = self.get(account_id)
        if account is None:
            return
        account["lastSyncAt"] = _now_iso()
        account["updatedAt"] = _now_iso()
        self._save()

    def _ensure_default(self) -> None:
        if not self._data["accounts"]:
            return
        if any(a.get("isDefault") for a in self._data["accounts"]):
            return
        self._data["accounts"][0]["isDefault"] = True

    # ── Export / import (never includes passwords) ──

    def export(self) -> Dict[str, Any]:
        return {
            "version": 1,
            "exportedAt": _now_iso(),
            "accounts": [
                {
                    "id": a.get("id"),
                    "name": a.get("name"),
                    "broker": a.get("broker"),
                    "login": a.get("login"),
                    "server": a.get("server"),
                    "terminalPath": a.get("terminalPath"),
                    "tradeMode": a.get("tradeMode"),
                    "demo": a.get("demo"),
                    "favorite": a.get("favorite"),
                    "isDefault": a.get("isDefault"),
                    "autoConnect": a.get("autoConnect"),
                    "readOnly": a.get("readOnly"),
                    "remember": a.get("remember"),
                    "magic": a.get("magic"),
                    "deviation": a.get("deviation"),
                    "hasSavedPassword": a.get("credentialRef") in self._data["credentials"],
                }
                for a in self._data["accounts"]
            ],
        }

    def import_redacted(self, payload: Dict[str, Any]) -> int:
        imported = 0
        for item in payload.get("accounts", []) or []:
            if not isinstance(item, dict):
                continue
            login = item.get("login")
            if login is None:
                continue
            account = {
                "name": item.get("name") or f"Account {login}",
                "broker": item.get("broker") or "MetaTrader 5",
                "login": int(login),
                "server": item.get("server"),
                "terminalPath": item.get("terminalPath"),
                "tradeMode": item.get("tradeMode") or "manual",
                "demo": item.get("demo"),
                "favorite": bool(item.get("favorite")),
                "autoConnect": bool(item.get("autoConnect")),
                "readOnly": bool(item.get("readOnly")),
                "remember": True,
                "magic": item.get("magic"),
                "deviation": item.get("deviation"),
                "isDefault": bool(item.get("isDefault")),
            }
            self.save(account)
            imported += 1
        if imported:
            self._save()
        return imported
