import requests

r = requests.get('http://127.0.0.1:8000/api/v1/reports/equipment')
items = r.json()
print("EQUIPMENT REPORT:")
for item in items:
    print(f"{item['machine_id']:<6} | {item['name']:<32} | Status: {item['status']:<10} | Health: {item['health_score']:5.1f}% | Faults: {item['active_faults_count']}")

r2 = requests.get('http://127.0.0.1:8000/api/v1/maintenance/fault-reports')
faults = r2.json()
print("\nFAULT REPORTS:")
for f in faults:
    print(f"{f['report_id']:<12} | Machine: {f['machine_id']:<6} | Severity: {f['severity']:<10} | Status: {f['status']:<25} | Desc: {f['description']}")
