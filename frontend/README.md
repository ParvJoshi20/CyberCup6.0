# AegisGate Frontend

Next.js frontend for the AegisGate dashboard and chat playground.

## Run locally

Install the frontend dependencies and start Next.js:

```powershell
cd frontend
npm install
npm run dev
```

In another terminal, start the FastAPI backend:

```powershell
cd backend
python -m uvicorn app.main:app --reload
```

The frontend is available at `http://localhost:3000`; the backend defaults to `http://127.0.0.1:8000`. The chat page uses a same-origin Next.js route to forward requests to the backend, so no backend CORS changes are required.

To use a different backend address, set the server-only `AEGISGATE_API_BASE_URL` environment variable before starting the frontend. The default is `http://127.0.0.1:8000`.

The chat playground supports the backend's `echo` and `scripted_leaky` mock providers. `scripted_leaky` is intended to demonstrate output inspection; neither provider is a production AI model. The UI does not request RAG because retrieval is not implemented by the current chat handler.
