from fastapi import APIRouter
from app.api.endpoints import auth, users, machines, telemetry, simulation, copilot, multimodal, lineage, maintenance, notifications, websockets, reports, intelligence

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(machines.router, prefix="/machines", tags=["machines"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["telemetry"])
api_router.include_router(simulation.router, prefix="/simulation", tags=["simulation"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["copilot"])
api_router.include_router(multimodal.router, prefix="/multimodal", tags=["multimodal"])
api_router.include_router(lineage.router, prefix="/lineage", tags=["lineage"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(websockets.router, prefix="/ws", tags=["websockets"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(intelligence.router, prefix="/intelligence", tags=["intelligence"])
