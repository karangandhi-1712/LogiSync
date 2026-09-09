import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db, SessionLocal
from .seed import seed
from .routers import gis

app = FastAPI(title="Thoothukudi MMLP Digital Twin API",
              version="0.1.0-phase1",
              description="Phase 1 Foundation: IMPLEMENTED. Later phases: PLANNED.")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(gis.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "phase": 1,
            "implementation_status": "IMPLEMENTED",
            "upcoming": "MOCKED/SIMULATED/PLANNED per README"}


@app.on_event("startup")
def on_startup():
    if os.environ.get("SEED_ON_STARTUP", "true").lower() == "true":
        try:
            init_db()
            db = SessionLocal()
            try:
                seed(db)
            finally:
                db.close()
        except Exception as e:
            print(f"DB init/seed skipped (fallback to file mode): {e}")
