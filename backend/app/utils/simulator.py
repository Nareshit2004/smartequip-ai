import numpy as np
import pandas as pd
from typing import List, Dict
import random

class SensorSimulator:
    def __init__(self, num_machines: int = 15):
        self.num_machines = num_machines
        
        # We will determine baselines dynamically on the fly if not initialized
        self.baselines_cache = {}
        
        # Degradation state per machine
        self.degradation = {m_id: 0.0 for m_id in range(1, num_machines + 50)}
        self.sensor_failures = {m_id: {} for m_id in range(1, num_machines + 50)}
        
    def _get_baselines(self, machine_id: int, machine_type: str = "Generic"):
        if machine_id in self.baselines_cache:
            return self.baselines_cache[machine_id]
            
        b = {
            "temperature": 65.0, "vibration": 1.2, "pressure": 120.0,
            "rpm": 1500.0, "current": 25.0, "voltage": 220.0
        }
        
        if "Lathe" in machine_type or "Milling" in machine_type or "Grinding" in machine_type or "Cutting" in machine_type:
            b["rpm"] = 3000.0
            b["vibration"] = 2.5
        elif "Press" in machine_type or "Pump" in machine_type or "Compressor" in machine_type:
            b["pressure"] = 800.0 if "Press" in machine_type else 300.0
            b["temperature"] = 85.0
        elif "Conveyor" in machine_type or "Assembly" in machine_type:
            b["pressure"] = 1.0 # Negligible
            b["rpm"] = 200.0
            b["current"] = 15.0
        elif "Boiler" in machine_type or "Molding" in machine_type or "Welding" in machine_type:
            b["temperature"] = 250.0 if "Boiler" in machine_type else 150.0
            b["voltage"] = 480.0
            b["current"] = 80.0
            
        self.baselines_cache[machine_id] = b
        return b
        
    def generate_reading(self, machine_id: int, machine_type: str = "Generic", status: str = "HEALTHY", force_healthy: bool = False) -> Dict[str, float]:
        """Generates a single time-step reading for a specific machine"""
        baselines = self._get_baselines(machine_id, machine_type)
        
        if machine_id not in self.degradation:
            self.degradation[machine_id] = 0.0
            
        # Adjust drift based on status
        if status == "CRITICAL":
            self.degradation[machine_id] += random.uniform(0.01, 0.05)
        elif status == "WARNING":
            self.degradation[machine_id] += random.uniform(0.001, 0.005)
        elif status == "MAINTENANCE":
            self.degradation[machine_id] = 0.0 # reset
        else:
            self.degradation[machine_id] += random.uniform(0.0001, 0.001)
            
        deg_factor = self.degradation[machine_id]
        
        is_anomaly = 1 if (random.random() < 0.05 or status == "CRITICAL") else 0
        
        if not force_healthy and random.random() < 0.01:
            sensor_keys = list(baselines.keys())
            target_sensor = random.choice(sensor_keys)
            failure_type = random.choice(["frozen", "drifting"])
            self.sensor_failures[machine_id][target_sensor] = failure_type
            
        def get_sim_val(sensor, mult):
            failure = self.sensor_failures[machine_id].get(sensor)
            return self._simulate_sensor(sensor, deg_factor, is_anomaly, mult, failure, baselines)
        
        reading = {
            "temperature": get_sim_val("temperature", 5.0),
            "vibration": get_sim_val("vibration", 1.5),
            "pressure": get_sim_val("pressure", 10.0),
            "rpm": get_sim_val("rpm", -100.0),
            "current": get_sim_val("current", 5.0),
            "voltage": get_sim_val("voltage", 2.0),
            "is_anomaly": is_anomaly
        }
        
        return reading
        
    def _simulate_sensor(self, sensor: str, deg_factor: float, is_anomaly: int, multiplier: float, failure_type: str, baselines: dict) -> float:
        base = baselines[sensor]
        noise = np.random.normal(0, base * 0.02) # 2% natural noise
        
        # Degradation drift
        drift = deg_factor * multiplier
        
        # Anomaly spike
        spike = 0
        if is_anomaly:
            spike = np.random.choice([1, -1]) * base * random.uniform(0.15, 0.3)
            
        value = base + noise + drift + spike
        
        if failure_type == "frozen":
            return round(base, 2) # Constant value, no noise
        elif failure_type == "drifting":
            return round(max(0, value + (base * 0.5)), 2) # Massive unrealistic offset
            
        return round(max(0, value), 2)

simulator_instance = SensorSimulator()
