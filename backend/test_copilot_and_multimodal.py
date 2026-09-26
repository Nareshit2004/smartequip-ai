import urllib.request
import urllib.parse
import json
import io
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_copilot():
    print("=" * 80)
    print("TESTING MAINTENANCE COPILOT (/api/v1/copilot/chat) FOR MACHINE M-3")
    print("=" * 80)
    url = "http://127.0.0.1:8000/api/v1/copilot/chat"
    
    test_queries = [
        "What is the status and failure risk of Machine M-3?",
        "When is the next maintenance scheduled and what is the RUL?",
        "Show me the latest telemetry readings for temperature and vibration",
        "Explain the root cause analysis"
    ]

    for q in test_queries:
        payload = {
            "machine_id": "M-3",
            "messages": [
                {"role": "user", "content": q}
            ]
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as resp:
                status = resp.status
                body = json.loads(resp.read().decode("utf-8"))
                print(f"\n[QUERY]: '{q}'")
                print(f"[STATUS]: {status}")
                print(f"[RESPONSE]: {body.get('response')}")
                print(f"[CONFIDENCE]: {body.get('confidence')}%")
                print(f"[SOURCES]: {body.get('sources')}")
        except Exception as e:
            print(f"FAILED on query '{q}': {e}")

def test_multimodal():
    print("\n" + "=" * 80)
    print("TESTING MULTIMODAL ANALYSIS (/api/v1/multimodal/analyze) FOR MACHINE M-3")
    print("=" * 80)
    url = "http://127.0.0.1:8000/api/v1/multimodal/analyze"

    test_files = [
        ("thermal_bearing_scan.png", b"\x89PNG\r\n\x1a\nfakeimagecontent", "image/png"),
        ("vibration_spectra_report.pdf", b"%PDF-1.4 fakedoccontent", "application/pdf"),
        ("sensor_telemetry_dump.csv", b"timestamp,temp,vib\n1,70,1.2\n2,75,1.5", "text/csv")
    ]

    for filename, content, mime_type in test_files:
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        body_parts = []
        
        # machine_id part
        body_parts.append(f"--{boundary}\r\n".encode("utf-8"))
        body_parts.append('Content-Disposition: form-data; name="machine_id"\r\n\r\n'.encode("utf-8"))
        body_parts.append("M-3\r\n".encode("utf-8"))
        
        # file part
        body_parts.append(f"--{boundary}\r\n".encode("utf-8"))
        body_parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
        body_parts.append(f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"))
        body_parts.append(content)
        body_parts.append(b"\r\n")
        
        # closing boundary
        body_parts.append(f"--{boundary}--\r\n".encode("utf-8"))
        
        full_body = b"".join(body_parts)
        
        req = urllib.request.Request(
            url,
            data=full_body,
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "Content-Length": str(len(full_body))
            }
        )
        
        try:
            with urllib.request.urlopen(req) as resp:
                status = resp.status
                res_json = json.loads(resp.read().decode("utf-8"))
                print(f"\n[UPLOAD]: '{filename}' ({mime_type})")
                print(f"[STATUS]: {status}")
                print(f"[FINDINGS]:")
                for f in res_json.get("findings", []):
                    print(f"  * {f}")
                print(f"[ACTION]: {res_json.get('recommended_action')}")
                print(f"[CONFIDENCE]: {res_json.get('confidence')}%")
        except Exception as e:
            print(f"FAILED upload for '{filename}': {e}")

if __name__ == "__main__":
    test_copilot()
    test_multimodal()
