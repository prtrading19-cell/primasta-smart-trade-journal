"""Pydantic request/response models for the MT5 gateway service."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class ConnectRequest(BaseModel):
    """Credentials are supplied server-side by the Next.js transport.

    They never appear in any response payload and are held in memory only
    for the lifetime of the MT5 session.
    """

    login: Optional[int] = None
    password: Optional[str] = None
    investor_password: Optional[str] = None
    server: Optional[str] = None
    terminal_path: Optional[str] = None
    magic: Optional[int] = None
    deviation: Optional[int] = None


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
