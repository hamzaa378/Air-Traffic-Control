"""Simple FastAPI proxy for live aircraft data and the built React site."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .opensky import OpenSkyService, UpstreamError

# uvicorn server.main:app automatically reads .env in the project root.
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

app = FastAPI(title="SkyScope API", version="1.0.0")
service = OpenSkyService()
DIST = Path(__file__).resolve().parent.parent / "dist"


@app.get("/api/health")
def health():
    return {"ok": True, "service": "skyscope", "hasCredentials": bool(
        os.environ.get("OPENSKY_CLIENT_ID") and os.environ.get("OPENSKY_CLIENT_SECRET"))}


@app.get("/api/credits")
def credits():
    """Project-local rolling 24h usage and OpenSky's last reported balance."""
    return {"authMode": "oauth2" if service.has_credentials() else "anonymous",
            "credits": service.credit_info()}


@app.get("/api/aircraft")
def aircraft(
    south: float = Query(ge=-90, le=90),
    west: float = Query(ge=-180, le=180),
    north: float = Query(ge=-90, le=90),
    east: float = Query(ge=-180, le=180),
):
    if south >= north or west >= east:
        raise HTTPException(status_code=422, detail="Invalid bounds: min must be less than max")
    if (north - south) * (east - west) > 25:
        raise HTTPException(status_code=422, detail="Region exceeds 25 square degrees; zoom in")
    try:
        return service.get((south, west, north, east))
    except UpstreamError as exc:
        headers = {"Retry-After": str(exc.retry_after)} if exc.retry_after else None
        return JSONResponse(status_code=exc.status_code,
                            content={"detail": str(exc), "retryAfter": exc.retry_after, "credits": service.credit_info()},
                            headers=headers)


if DIST.is_dir():
    assets_dir = DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        # Serve only known public files; everything else is the React router entry point.
        candidate = (DIST / path).resolve()
        if candidate.is_file() and DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
else:
    @app.get("/", include_in_schema=False)
    def dev_note():
        return {"message": "Run the React dev server with npm run dev, or build the frontend."}
