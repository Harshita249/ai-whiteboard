
# AI Whiteboard - Full Project (Final ZIP)

This package contains a full AI Whiteboard project with:
- Backend: FastAPI, WebSockets, JWT stub, gallery, AI cleanup stub.
- Frontend: React + Vite, Canvas drawing, toolbar, gallery UI.

## Quick start (no Docker)

### Prerequisites
- Python 3.11.x (recommended)
- Node.js 18+ and npm
- VS Code (recommended)

### Backend (PowerShell)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend will run at `http://127.0.0.1:8000` and OpenAPI at `/docs`.

### Frontend (PowerShell)
```powershell
cd frontend
npm install
npm run dev
```
Open `http://127.0.0.1:5173` in your browser.

## Notes
- The AI endpoint is a stub (`/api/ai/cleanup`). Replace with real AI model calls.
- WebSocket manager is in-memory (good for single-server). For scaling, use Redis/Message broker.

## Downgrade Python to 3.11.9 (Windows)
1. Uninstall current Python from Control Panel > Programs.
2. Download installer from https://www.python.org/downloads/release/python-3119/
3. Run the installer, check "Add Python to PATH", install.
4. Verify: `python --version` -> `Python 3.11.9`

For Linux/macOS use package manager or pyenv to install specific version.

