from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
from datetime import datetime

from app.utils.simulator import simulator_instance

router = APIRouter()

# Connection manager to handle active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

manager = ConnectionManager()

@router.websocket("/telemetry/{machine_id}")
async def websocket_telemetry_endpoint(websocket: WebSocket, machine_id: str):
    await manager.connect(websocket)
    is_streaming = False
    stream_task = None
    
    # Strip 'M-' prefix if it exists to match the simulator's integer ID requirement
    try:
        numeric_id = int(machine_id.replace("M-", ""))
    except ValueError:
        numeric_id = 1 # Fallback
        
    async def stream_data():
        try:
            # Import here to avoid circular imports during startup
            from app.core.database import AsyncSessionLocal
            from app.models.machine import Machine
            from sqlalchemy.future import select
            
            machine_type = "Generic"
            status = "HEALTHY"
            
            # Fetch machine details once when streaming starts
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Machine).filter(Machine.id == numeric_id))
                machine = result.scalars().first()
                if machine:
                    machine_type = machine.type
                    status = machine.status
                    
            while is_streaming:
                # Generate realistic reading from the backend simulator using machine specifics
                reading = simulator_instance.generate_reading(numeric_id, machine_type, status)
                reading["time"] = datetime.now().strftime("%H:%M:%S")
                
                await websocket.send_text(json.dumps(reading))
                await asyncio.sleep(1.0) # Stream at 1Hz
        except asyncio.CancelledError:
            pass

    try:
        while True:
            data = await websocket.receive_text()
            try:
                command = json.loads(data)
                action = command.get("action")
                
                if action == "start":
                    if not is_streaming:
                        is_streaming = True
                        stream_task = asyncio.create_task(stream_data())
                        await websocket.send_text(json.dumps({"status": "Simulator started"}))
                
                elif action == "stop":
                    if is_streaming:
                        is_streaming = False
                        if stream_task:
                            stream_task.cancel()
                        await websocket.send_text(json.dumps({"status": "Simulator stopped"}))
                        
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        is_streaming = False
        if stream_task:
            stream_task.cancel()
