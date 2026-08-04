"""Pydantic request/response models for the MT5 gateway service."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class ConnectRequest(BaseModel):
    """Connect using saved-account credentials (account_id) or direct
    credentials supplied server-side by the Next.js transport.

    Credentials never appear in any response payload and are held in memory
    only for the lifetime of the MT5 session. When `remember` is true the
    account is persisted with its password encrypted at rest.
    """

    account_id: Optional[str] = None
    login: Optional[int] = None
    password: Optional[str] = None
    investor_password: Optional[str] = None
    server: Optional[str] = None
    terminal_path: Optional[str] = None
    magic: Optional[int] = None
    deviation: Optional[int] = None
    remember: Optional[bool] = None
    name: Optional[str] = None
    read_only: Optional[bool] = None
    auto_connect: Optional[bool] = None
    demo: Optional[bool] = None
    trade_mode: Optional[str] = None


class TestConnectionRequest(BaseModel):
    """Probe credentials against the broker without synchronizing anything."""

    login: Optional[int] = None
    password: Optional[str] = None
    investor_password: Optional[str] = None
    server: Optional[str] = None
    terminal_path: Optional[str] = None


class SwitchAccountRequest(BaseModel):
    account_id: str


class AutoConnectRequest(BaseModel):
    """Optional: only attempt accounts whose autoConnect flag is set."""

    auto_only: Optional[bool] = False


class SaveAccountRequest(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    broker: Optional[str] = None
    login: Optional[int] = None
    password: Optional[str] = None
    investor_password: Optional[str] = None
    server: Optional[str] = None
    terminal_path: Optional[str] = None
    remember: Optional[bool] = None
    auto_connect: Optional[bool] = None
    read_only: Optional[bool] = None
    demo: Optional[bool] = None
    trade_mode: Optional[str] = None
    magic: Optional[int] = None
    deviation: Optional[int] = None
    favorite: Optional[bool] = None
    is_default: Optional[bool] = None


class AccountPatchRequest(BaseModel):
    name: Optional[str] = None
    broker: Optional[str] = None
    server: Optional[str] = None
    terminal_path: Optional[str] = None
    password: Optional[str] = None
    investor_password: Optional[str] = None
    remember: Optional[bool] = None
    auto_connect: Optional[bool] = None
    read_only: Optional[bool] = None
    demo: Optional[bool] = None
    trade_mode: Optional[str] = None
    favorite: Optional[bool] = None
    is_default: Optional[bool] = None


class PlaceOrderRequest(BaseModel):
    request_id: str = Field(default_factory=lambda: "")
    symbol: str
    type: str  # buy | sell | buy-limit | sell-limit | buy-stop | sell-stop
    volume: float
    price: Optional[float] = None
    sl: Optional[float] = None
    tp: Optional[float] = None
    magic: Optional[int] = None
    deviation: Optional[int] = None
    comment: Optional[str] = "PRIMASTA"


class ModifyOrderRequest(BaseModel):
    ticket: int
    sl: Optional[float] = None
    tp: Optional[float] = None
    price: Optional[float] = None
    comment: Optional[str] = None


class CloseOrderRequest(BaseModel):
    ticket: int
    volume: Optional[float] = None


class CancelOrderRequest(BaseModel):
    ticket: int


class GatewayResponse(BaseModel):
    """Uniform envelope. `data` shape depends on the endpoint."""

    ok: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
