import requests

BASE = 'http://127.0.0.1:8000/api/v1'

print("=" * 70)
print("FLEET SUMMARY")
print("=" * 70)
r = requests.get(f'{BASE}/intelligence/fleet/summary')
print(r.json())

print("\n" + "=" * 70)
print("ALL 16 MACHINES AUDIT (Cost, Energy, Sensor Reliability, Lineage)")
print("=" * 70)

for i in range(1, 17):
    mid = f"M-{i}"
    c = requests.get(f'{BASE}/intelligence/cost/{mid}').json()
    e = requests.get(f'{BASE}/intelligence/energy/{mid}').json()
    s = requests.get(f'{BASE}/intelligence/sensor-health/{mid}').json()
    lin = requests.get(f'{BASE}/lineage/machine/{mid}').json()
    l = lin[0] if isinstance(lin, list) and len(lin) > 0 else {}
    
    m_name = c.get('machine_name', 'Unknown')
    m_type = l.get('machine_type', 'N/A')
    model = l.get('model_name', 'N/A')
    p_kw = e.get('power_kw', 0)
    eff = e.get('efficiency_rating', 'N/A')
    cost_driver = c.get('primary_driver') or 'Normal Operation'
    rel_score = s.get('reliability_score', 0)
    savings = c.get('estimated_savings', 0)
    
    print(f"[{mid:<4}] {m_name:<28} | Type: {m_type:<10} | Model: {model:<20} | Pwr: {p_kw:>5.1f}kW ({eff:<9}) | Rel: {rel_score:>3}% | Sav: ${savings:>6,.0f} | Driver: {cost_driver}")

print("\n" + "=" * 70)
print("INTERACTIVE ADVANCED MODULES AUDIT")
print("=" * 70)

chat_res = requests.post(f'{BASE}/copilot/chat', json={
    'machine_id': 'M-3',
    'message': 'Analyze current health and recommend immediate maintenance actions.'
})
print(f"Copilot Chat (M-3): HTTP {chat_res.status_code}")
if chat_res.status_code == 200:
    print(f"Copilot Response: {chat_res.json().get('response', '')[:120]}...\n")

multi_res = requests.post(
    f'{BASE}/multimodal/analyze',
    data={'machine_id': 'M-3', 'context': 'Vibration acoustic spectrum report'},
    files={'file': ('vibration_spectrum.csv', b'timestamp,hz,amplitude\n1,120,0.42\n2,240,0.85\n', 'text/csv')}
)
print(f"Multimodal Analysis (M-3): HTTP {multi_res.status_code}")
if multi_res.status_code == 200:
    print(f"Findings: {multi_res.json().get('findings', [])}\n")
