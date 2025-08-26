import requests

urls = [
 'http://127.0.0.1:5000/api/payments/ledger?deal_id=50',
 'http://127.0.0.1:5000/api/payments/ledger.csv?deal_id=50',
 'http://127.0.0.1:5000/api/payments/ledger.pdf?deal_id=50'
]
for u in urls:
    try:
        r = requests.get(u, timeout=10)
        print(u, '->', r.status_code, r.headers.get('content-type'), 'len', len(r.content))
        if r.headers.get('content-type','').startswith('application/json'):
            try:
                print('json:', r.json())
            except Exception:
                pass
    except Exception as e:
        print(u, '-> error', e)
