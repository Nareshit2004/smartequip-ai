import requests
import random
import time

BASE_URL = "http://localhost:8000/api/v1/machines/"

machines_to_add = [
    {"name": "Injection Molder X1", "type": "Molding", "status": "Active"},
    {"name": "Injection Molder X2", "type": "Molding", "status": "Warning"},
    {"name": "Spot Welding Robot A", "type": "Welding", "status": "Active"},
    {"name": "Spot Welding Robot B", "type": "Welding", "status": "Active"},
    {"name": "Spot Welding Robot C", "type": "Welding", "status": "Critical"},
    {"name": "Conveyor Belt System 1", "type": "Transport", "status": "Active"},
    {"name": "Conveyor Belt System 2", "type": "Transport", "status": "Warning"},
    {"name": "CNC Miller V4", "type": "Machining", "status": "Active"},
    {"name": "Industrial 3D Printer", "type": "Additive", "status": "Active"},
    {"name": "Plasma Cutter Pro", "type": "Cutting", "status": "Active"},
    {"name": "Automated Packaging Line", "type": "Packaging", "status": "Warning"}
]

print("Starting to seed database via API...")

for machine in machines_to_add:
    try:
        response = requests.post(BASE_URL, json=machine)
        if response.status_code == 200:
            print(f"Successfully added: {machine['name']}")
        else:
            print(f"Failed to add {machine['name']}: {response.text}")
    except Exception as e:
        print(f"Error adding {machine['name']}: {e}")
    
    time.sleep(0.1)

print("Finished seeding.")
