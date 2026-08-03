# PrimaSta MT5 Gateway (Python)

Localhost-only HTTP gateway between the Next.js app and a MetaTrader 5
terminal, built with FastAPI and the official
[`MetaTrader5`](https://pypi.org/project/MetaTrader5/) python package.

The Next.js `PythonGatewayTransport` (selected with
`MT5_GATEWAY_TRANSPORT=python`) talks to this service over HTTP. Credentials
live on the server (env vars) and are forwarded to `/connect` over localhost;
they are **never** returned by any endpoint and never written to disk.

## Requirements

- Windows host with MetaTrader 5 installed
- Python 3.9–3.13 (the `MetaTrader5` pip package does not support every
  newest Python release yet — check the package page for compatibility)
- `pip install -r requirements.txt`

## Run

```bash
cd mt5-gateway
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

Health check: `curl http://127.0.0.1:8765/health`

## Endpoints

| Method | Path          | Purpose                                  |
| ------ | ------------- | ---------------------------------------- |
| GET    | `/health`     | Service + MetaTrader5 package availability |
| POST   | `/connect`    | Open an MT5 session (credentials in body) |
| POST   | `/disconnect` | Close the MT5 session                    |
| GET    | `/account`    | Current account snapshot                 |
| GET    | `/positions`  | Open positions                           |
| GET    | `/orders`     | Active (pending) orders                  |
| GET    | `/history`    | Recent history orders + deals            |
| POST   | `/send-order` | Market / pending order entry             |
| POST   | `/modify-order` | Modify SL/TP (position or pending order) |
| POST   | `/close-order` | Close (or partially close) a position    |
| POST   | `/cancel-order` | Cancel a pending order                 |
| GET    | `/terminal`   | Terminal state + version                 |
| GET    | `/heartbeat`  | Connection probe used by the transport   |

## Environment

Optional `.env` (fallback credentials for the service itself):

```
MT5_LOGIN=
MT5_PASSWORD=
MT5_INVESTOR_PASSWORD=
MT5_SERVER=
MT5_TERMINAL_PATH=
MT5_MAGIC=190624
MT5_DEVIATION=20
```

## Security notes

- Bind to `127.0.0.1` only — never expose this service to the network.
- Responses never contain passwords, investor passwords, or token values.
- Order transmission is only reachable through the manual approval flow in
  the Next.js app (Safety Engine → Approve → Gateway → Broker).
