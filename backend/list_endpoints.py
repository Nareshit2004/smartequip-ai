import urllib.request
import json

def test_api():
    try:
        res = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/openapi.json')
        data = json.loads(res.read().decode('utf-8'))
        print(f"Total paths: {len(data.get('paths', {}))}")
        for path, methods in sorted(data.get('paths', {}).items()):
            for method in methods:
                print(f"{method.upper():<6} {path}")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    test_api()
