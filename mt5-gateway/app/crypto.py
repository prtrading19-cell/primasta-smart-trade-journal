"""At-rest encryption for MT5 account credentials.

Passwords are encrypted with AES-256-GCM before they are written to the
account registry. The encryption key is read from MT5_GATEWAY_ENCRYPTION_KEY
when set; otherwise a random 32-byte key is generated on first use and stored
in the gateway data directory (never committed to Git, file mode 0600).

Credentials are decrypted only inside this gateway service and are passed to
the MetaTrader5 login call in memory. They are never logged, returned through
any API, or written to disk in plain text.
"""

from __future__ import annotations

import base64
import hashlib
import os
from typing import Dict, Optional

try:  # pragma: no cover - environment dependent
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    _CRYPTO_OK = True
    _CRYPTO_ERROR: Optional[str] = None
except Exception as exc:  # pragma: no cover - environment dependent
    AESGCM = None  # type: ignore
    _CRYPTO_OK = False
    _CRYPTO_ERROR = f"cryptography package is not available: {exc}"

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
_KEY_FILE = os.path.join(DATA_DIR, "gateway.key")


def crypto_available() -> bool:
    return _CRYPTO_OK


def crypto_error() -> Optional[str]:
    return _CRYPTO_ERROR


def _load_key() -> bytes:
    env_key = os.environ.get("MT5_GATEWAY_ENCRYPTION_KEY", "").strip()
    if env_key:
        return hashlib.sha256(env_key.encode("utf-8")).digest()
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(_KEY_FILE):
        with open(_KEY_FILE, "rb") as f:
            return f.read()
    key = os.urandom(32)
    with open(_KEY_FILE, "wb") as f:
        f.write(key)
    try:
        os.chmod(_KEY_FILE, 0o600)
    except OSError:  # pragma: no cover - windows ignores chmod
        pass
    return key


def encrypt_secret(plaintext: str) -> Dict[str, str]:
    """Encrypt a plaintext secret into a portable payload dict."""
    if not _CRYPTO_OK or AESGCM is None:
        raise RuntimeError(_CRYPTO_ERROR or "cryptography package is not available")
    key = _load_key()
    nonce = os.urandom(12)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)
    return {
        "cipher": "aes-256-gcm",
        "iv": base64.b64encode(nonce).decode("ascii"),
        "data": base64.b64encode(ciphertext).decode("ascii"),
    }


def decrypt_secret(payload: Dict[str, str]) -> str:
    """Decrypt a payload produced by `encrypt_secret`."""
    if not _CRYPTO_OK or AESGCM is None:
        raise RuntimeError(_CRYPTO_ERROR or "cryptography package is not available")
    key = _load_key()
    nonce = base64.b64decode(payload["iv"])
    ciphertext = base64.b64decode(payload["data"])
    plaintext = AESGCM(key).decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")
