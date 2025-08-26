import requests

base = 'http://127.0.0.1:5000/api'

def main():
    deal = 50
    print('== GET /payments/{deal} (no auth)')
    r = requests.get(f'{base}/payments/{deal}')
    print('Status:', r.status_code)
    try:
        print('Body:', r.json())
    except Exception:
        print('Body (text):', r.text)

    print('\n== POST /payments/{deal}/123/proof (no auth) with in-memory file')
    files = {'proof': ('test.txt', b'hello world', 'text/plain')}
    r2 = requests.post(f'{base}/payments/{deal}/123/proof', files=files)
    print('Status:', r2.status_code)
    try:
        print('Body:', r2.json())
    except Exception:
        print('Body (text):', r2.text)

if __name__ == '__main__':
    main()
