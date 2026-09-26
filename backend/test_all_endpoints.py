import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    passed = 0
    failed = 0
    errors = []

    def check(name, resp, expected_status=200):
        nonlocal passed, failed
        if resp.status_code == expected_status:
            print(f"[PASS] {name} ({resp.status_code})")
            passed += 1
            return True
        else:
            print(f"[FAIL] {name} (Expected {expected_status}, got {resp.status_code}): {resp.text[:200]}")
            failed += 1
            errors.append((name, resp.status_code, resp.text[:200]))
            return False

    print("--- 1. Root & Auth ---")
    r = requests.get(f"{BASE_URL}/")
    check("GET /", r)

    print("\n--- 2. Machines & Telemetry ---")
    r = requests.get(f"{BASE_URL}/api/v1/machines/")
    check("GET /api/v1/machines/", r)
    machines = r.json() if r.status_code == 200 else []
    print(f"Total machines: {len(machines)}")

    if machines:
        m_id = machines[0]['id']
        r = requests.get(f"{BASE_URL}/api/v1/machines/{m_id}")
        check(f"GET /api/v1/machines/{m_id}", r)

        r = requests.get(f"{BASE_URL}/api/v1/telemetry/last-prediction/{m_id}")
        check(f"GET /api/v1/telemetry/last-prediction/{m_id}", r)

        r = requests.get(f"{BASE_URL}/api/v1/telemetry/history/{m_id}")
        check(f"GET /api/v1/telemetry/history/{m_id}", r)

        r = requests.post(f"{BASE_URL}/api/v1/telemetry/ai-health-check/{m_id}")
        check(f"POST /api/v1/telemetry/ai-health-check/{m_id}", r)

        r = requests.post(f"{BASE_URL}/api/v1/telemetry/simulate/{m_id}")
        check(f"POST /api/v1/telemetry/simulate/{m_id}", r)

    print("\n--- 3. Intelligence Endpoints ---")
    r = requests.get(f"{BASE_URL}/api/v1/intelligence/fleet/summary")
    check("GET /api/v1/intelligence/fleet/summary", r)

    if machines:
        m_id = machines[0]['id']
        r = requests.get(f"{BASE_URL}/api/v1/intelligence/cost/{m_id}")
        check(f"GET /api/v1/intelligence/cost/{m_id}", r)

        r = requests.get(f"{BASE_URL}/api/v1/intelligence/energy/{m_id}")
        check(f"GET /api/v1/intelligence/energy/{m_id}", r)

        r = requests.get(f"{BASE_URL}/api/v1/intelligence/sensor-health/{m_id}")
        check(f"GET /api/v1/intelligence/sensor-health/{m_id}", r)

    print("\n--- 4. Reports Endpoints ---")
    for r_type in ["equipment", "faults", "maintenance", "ai"]:
        r = requests.get(f"{BASE_URL}/api/v1/reports/{r_type}")
        check(f"GET /api/v1/reports/{r_type}", r)

    print("\n--- 5. Maintenance & Notifications ---")
    r = requests.get(f"{BASE_URL}/api/v1/maintenance/fault-reports")
    check("GET /api/v1/maintenance/fault-reports", r)

    r = requests.get(f"{BASE_URL}/api/v1/maintenance/work-orders")
    check("GET /api/v1/maintenance/work-orders", r)

    r = requests.get(f"{BASE_URL}/api/v1/notifications/")
    check("GET /api/v1/notifications/", r)

    print("\n--- 6. Users ---")
    r = requests.get(f"{BASE_URL}/api/v1/users/")
    check("GET /api/v1/users/", r)

    print("\n--- 7. Lineage ---")
    if machines:
        m_id = machines[0]['id']
        r = requests.get(f"{BASE_URL}/api/v1/lineage/machine/{m_id}")
        check(f"GET /api/v1/lineage/machine/{m_id}", r)

    print("\n--- 8. Simulation What-If ---")
    sim_payload = {
        "machine_id": 1,
        "temperature": 75.0,
        "vibration": 3.5,
        "pressure": 5.0,
        "speed": 1800.0,
        "cooling_rate": 80.0
    }
    r = requests.post(f"{BASE_URL}/api/v1/simulation/what-if", json=sim_payload)
    check("POST /api/v1/simulation/what-if", r)

    print("\n--- 9. AI Copilot Chat ---")
    chat_payload = {
        "message": "What is the recommended action for high vibration?",
        "machine_id": "M-1"
    }
    r = requests.post(f"{BASE_URL}/api/v1/copilot/chat", json=chat_payload)
    check("POST /api/v1/copilot/chat", r)

    print("\n--- 10. Multimodal Fault Upload ---")
    # multipart test
    files = {'file': ('test.txt', b'Mock sensor image content', 'text/plain')}
    data = {'machine_id': 'M-1', 'media_type': 'image'}
    r = requests.post(f"{BASE_URL}/api/v1/multimodal/analyze", files=files, data=data)
    check("POST /api/v1/multimodal/analyze", r)

    print(f"\n==========================================")
    print(f"Summary: {passed} passed, {failed} failed")
    print(f"==========================================")
    if errors:
        print("Failures:")
        for name, status, text in errors:
            print(f"- {name}: Status {status} -> {text}")

if __name__ == "__main__":
    run_tests()
