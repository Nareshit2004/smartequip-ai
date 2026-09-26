import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_workflow_actions():
    print("Testing Workflow Actions...")

    # 1. Add a new machine
    new_machine_payload = {
        "name": "Automated Laser Cutter Alpha",
        "type": "Machining",
        "status": "HEALTHY"
    }
    r = requests.post(f"{BASE_URL}/api/v1/machines/", json=new_machine_payload)
    assert r.status_code == 200, f"Add machine failed: {r.text}"
    m_data = r.json()
    new_m_id = m_data["id"]
    print(f"[PASS] Added new machine: ID {new_m_id}, Name: {m_data['name']}, Status: {m_data['status']}, Health: {m_data['health_score']}%")

    # Verify sensor history exists for the new machine
    r_hist = requests.get(f"{BASE_URL}/api/v1/telemetry/history/{new_m_id}")
    assert r_hist.status_code == 200 and len(r_hist.json()) > 0, "No sensor history generated for new machine"
    print(f"[PASS] Auto-generated {len(r_hist.json())} baseline sensor records for machine {new_m_id}")

    # Verify AI prediction exists for the new machine
    r_pred = requests.get(f"{BASE_URL}/api/v1/telemetry/last-prediction/{new_m_id}")
    assert r_pred.status_code == 200, f"No AI prediction for new machine: {r_pred.text}"
    pred_data = r_pred.json()
    print(f"[PASS] Auto-generated initial AI prediction: Risk: {pred_data['failure_risk']}%, RUL: {pred_data['rul_days']} days")

    # 2. Test Copilot with new machine
    r_copilot = requests.post(f"{BASE_URL}/api/v1/copilot/chat", json={
        "machine_id": f"M-{new_m_id}",
        "message": "What is the health and risk of this machine?"
    })
    assert r_copilot.status_code == 200, f"Copilot failed: {r_copilot.text}"
    print(f"[PASS] Copilot response for M-{new_m_id}: {r_copilot.json()['response'][:100]}...")

    # 3. Create a Fault Report
    fr_payload = {
        "machine_id": f"M-{new_m_id}",
        "category": "Mechanical",
        "severity": "Warning",
        "description": "Minor Spindle vibration observed during cutting cycle.",
        "reported_by": "Operator Marcus"
    }
    r_fr = requests.post(f"{BASE_URL}/api/v1/maintenance/fault-reports", json=fr_payload)
    assert r_fr.status_code == 200, f"Fault report failed: {r_fr.text}"
    fr_data = r_fr.json()
    fr_id = fr_data["report_id"]
    print(f"[PASS] Created Fault Report: {fr_id}")

    # 4. Create a Work Order linked to the Fault Report
    wo_payload = {
        "machine_id": f"M-{new_m_id}",
        "fault_report_id": fr_id,
        "scheduled_date": "2026-09-25T10:00:00Z",
        "technician": "Tech-1 Alpha",
        "priority": "Medium",
        "reason": "Inspect and calibrate spindle alignment",
        "estimated_duration_hours": 2.5
    }
    r_wo = requests.post(f"{BASE_URL}/api/v1/maintenance/work-orders", json=wo_payload)
    assert r_wo.status_code == 200, f"Work order failed: {r_wo.text}"
    wo_data = r_wo.json()
    wo_id = wo_data["order_id"]
    print(f"[PASS] Created Work Order: {wo_id} linked to {fr_id}")

    # 5. Resolve a notification
    r_notifs = requests.get(f"{BASE_URL}/api/v1/notifications/")
    assert r_notifs.status_code == 200, "Failed to get notifications"
    notifs = r_notifs.json()
    if notifs:
        target_notif = notifs[0]
        n_id = target_notif["notification_id"]
        r_patch = requests.patch(f"{BASE_URL}/api/v1/notifications/{n_id}", json={"is_resolved": True})
        assert r_patch.status_code == 200, f"Resolve notification failed: {r_patch.text}"
        print(f"[PASS] Resolved notification: {n_id}")

    print("\nALL WORKFLOW ACTIONS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!")

if __name__ == "__main__":
    test_workflow_actions()
