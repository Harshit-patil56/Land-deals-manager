# app.py - Main Flask Application
from flask import Flask, request, jsonify, session, send_from_directory, send_file, abort
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import mysql.connector
from datetime import datetime, timedelta
import jwt
import os
import time
from io import BytesIO
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load environment variables from .env file
except ImportError:
    pass  # python-dotenv not installed
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
except Exception:
    # reportlab may not be installed in dev environment; the endpoint will return an error
    A4 = None
    canvas = None
    ImageReader = None
from functools import wraps
import json
import mimetypes
import requests

# Load environment variables from .env file if it exists
def load_env_file():
    """Load environment variables from .env file"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

# Load environment variables
load_env_file()

app = Flask(__name__)
app.static_folder = 'uploads'
app.static_url_path = '/uploads'
app.config['SECRET_KEY'] = 'your-secret-key-here'
APP_ROOT = os.path.dirname(__file__)
# Use absolute uploads folder inside backend so static serving works predictably
app.config['UPLOAD_FOLDER'] = os.path.join(APP_ROOT, 'uploads')
CORS(app, origins='*', supports_credentials=True, methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'Range'],
     expose_headers=['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'])


# Database configuration
DB_CONFIG = {
    'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
    'port': 17231,
    'user': 'avnadmin',
    'password': os.environ.get('DB_PASSWORD', 'YOUR_DB_PASSWORD_HERE'),
    'database': 'land_deals_db',
    'ssl_ca': os.path.join(os.path.dirname(__file__), 'ca-certificate.pem'),
    'ssl_verify_cert': True,
    'ssl_verify_identity': True
}

# Create uploads directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Database connection function
def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return None

# Helper functions for location normalization
def get_or_create_state(cursor, state_name):
    """Get state_id or create if not exists. Returns None if state_name is empty."""
    if not state_name or state_name.strip() == '':
        return None
    
    # Check if state exists
    cursor.execute("SELECT id FROM states WHERE name = %s", (state_name.strip(),))
    result = cursor.fetchone()
    if result:
        return result[0]
    
    # Create new state
    cursor.execute("INSERT IGNORE INTO states (name) VALUES (%s)", (state_name.strip(),))
    if cursor.lastrowid:
        return cursor.lastrowid
    
    # Try to get it again in case of race condition
    cursor.execute("SELECT id FROM states WHERE name = %s", (state_name.strip(),))
    result = cursor.fetchone()
    return result[0] if result else None

def get_or_create_district(cursor, state_id, district_name):
    """Get district_id or create if not exists. Returns None if district_name is empty."""
    if not district_name or district_name.strip() == '' or not state_id:
        return None
    
    # Check if district exists
    cursor.execute("SELECT id FROM districts WHERE state_id = %s AND name = %s", (state_id, district_name.strip()))
    result = cursor.fetchone()
    if result:
        return result[0]
    
    # Create new district
    cursor.execute("INSERT IGNORE INTO districts (state_id, name) VALUES (%s, %s)", (state_id, district_name.strip()))
    if cursor.lastrowid:
        return cursor.lastrowid
    
    # Try to get it again in case of race condition
    cursor.execute("SELECT id FROM districts WHERE state_id = %s AND name = %s", (state_id, district_name.strip()))
    result = cursor.fetchone()
    return result[0] if result else None


# Helpers to resolve or create normalized location rows
def get_or_create_state(cursor, state_name):
    """Return state id for given state_name, creating the state if missing."""
    if not state_name:
        return None
    state_name = state_name.strip()
    cursor.execute("SELECT id FROM states WHERE name = %s", (state_name,))
    row = cursor.fetchone()
    if row:
        # cursor may be dictionary or tuple depending on cursor type
        return row['id'] if isinstance(row, dict) else row[0]
    # Insert new state
    cursor.execute("INSERT INTO states (name) VALUES (%s)", (state_name,))
    return cursor.lastrowid


def get_or_create_district(cursor, state_id, district_name):
    """Return district id for given state_id and district_name, creating if missing."""
    if not district_name:
        return None
    district_name = district_name.strip()
    if not state_id:
        return None
    cursor.execute("SELECT id FROM districts WHERE state_id = %s AND name = %s", (state_id, district_name))
    row = cursor.fetchone()
    if row:
        return row['id'] if isinstance(row, dict) else row[0]
    # Insert new district
    cursor.execute("INSERT INTO districts (state_id, name) VALUES (%s, %s)", (state_id, district_name))
    return cursor.lastrowid

# JWT token decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            # expose decoded user on request for permission checks
            try:
                request.user = {
                    'id': data.get('user_id'),
                    'username': data.get('username'),
                    'role': data.get('role')
                }
            except Exception:
                request.user = {'id': data.get('user_id')}
            current_user = data['user_id']
        except:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# Routes

# Payments endpoints integrated into app.py (moved here so token_required is defined)
@app.route('/api/payments/test', methods=['GET'])
def payments_test():
    return jsonify({'message': 'Payments endpoints active'})


@app.route('/api/payments/<int:deal_id>', methods=['GET'])
def list_payments(deal_id):
    """Return all payments for a deal"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT p.* FROM payments p WHERE p.deal_id = %s ORDER BY p.payment_date DESC", (deal_id,))
        rows = cursor.fetchall() or []

        # convert dates to isoformat where applicable
        for r in rows:
            for k in ('payment_date', 'created_at'):
                if r.get(k) is not None and isinstance(r.get(k), datetime):
                    r[k] = r[k].isoformat()

        # attach parties for each payment using a fresh cursor (dictionary rows expected)
        try:
            party_cursor = conn.cursor(dictionary=True)
            for r in rows:
                party_cursor.execute("SELECT id, party_type, party_id, amount, percentage FROM payment_parties WHERE payment_id = %s", (r['id'],))
                parts = party_cursor.fetchall() or []
                part_list = []
                for p in parts:
                    part_list.append({
                        'id': p.get('id'),
                        'party_type': p.get('party_type'),
                        'party_id': p.get('party_id'),
                        'amount': float(p.get('amount')) if p.get('amount') is not None else None,
                        'percentage': float(p.get('percentage')) if p.get('percentage') is not None else None
                    })
                r['parties'] = part_list
        except Exception:
            for r in rows:
                r['parties'] = []

        return jsonify(rows)
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/ledger.csv', methods=['GET'])
@token_required
def payments_ledger_csv(current_user):
    """Export ledger results as CSV. Accepts same query params as /api/payments/ledger"""
    params = request.args
    deal_id = params.get('deal_id')
    party_type = params.get('party_type')
    party_id = params.get('party_id')
    payment_mode = params.get('payment_mode')
    start_date = params.get('start_date')
    end_date = params.get('end_date')

    args = []
    if party_type or party_id:
        sql = "SELECT DISTINCT p.* FROM payments p JOIN payment_parties pp ON pp.payment_id = p.id WHERE 1=1"
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if party_type:
            sql += " AND pp.party_type = %s"
            args.append(party_type)
        if party_id:
            sql += " AND pp.party_id = %s"
            args.append(party_id)
    else:
        sql = "SELECT p.* FROM payments p WHERE 1=1"
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if payment_mode:
            sql += " AND p.payment_mode = %s"
            args.append(payment_mode)

    if start_date:
        sql += " AND p.payment_date >= %s"
        args.append(start_date)
    if end_date:
        sql += " AND p.payment_date <= %s"
        args.append(end_date)

    sql += " ORDER BY p.payment_date DESC"

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(sql, tuple(args))
        cols = [d[0] for d in cursor.description]
        rows = cursor.fetchall() or []

        import io, csv
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(cols)
        for r in rows:
            row = []
            for v in r:
                if isinstance(v, datetime):
                    row.append(v.isoformat())
                else:
                    row.append(v)
            w.writerow(row)
        csv_data = buf.getvalue()
        return app.response_class(csv_data, mimetype='text/csv', headers={"Content-Disposition": "attachment; filename=ledger.csv"})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/ledger.pdf', methods=['GET'])
@token_required
def payments_ledger_pdf(current_user):
    """Generate a simple PDF ledger. Embeds the first proof image per payment when present."""
    if canvas is None:
        return jsonify({'error': 'reportlab not available on server'}), 500

    params = request.args
    deal_id = params.get('deal_id')
    party_type = params.get('party_type')
    party_id = params.get('party_id')
    payment_mode = params.get('payment_mode')
    start_date = params.get('start_date')
    end_date = params.get('end_date')

    args = []
    if party_type or party_id:
        sql = "SELECT DISTINCT p.* FROM payments p JOIN payment_parties pp ON pp.payment_id = p.id WHERE 1=1"
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if party_type:
            sql += " AND pp.party_type = %s"
            args.append(party_type)
        if party_id:
            sql += " AND pp.party_id = %s"
            args.append(party_id)
    else:
        sql = "SELECT p.* FROM payments p WHERE 1=1"
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if payment_mode:
            sql += " AND p.payment_mode = %s"
            args.append(payment_mode)

    if start_date:
        sql += " AND p.payment_date >= %s"
        args.append(start_date)
    if end_date:
        sql += " AND p.payment_date <= %s"
        args.append(end_date)

    sql += " ORDER BY p.payment_date DESC"

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, tuple(args))
        rows = cursor.fetchall() or []

        # For each payment fetch one proof file path (if any)
        for r in rows:
            cursor.execute("SELECT file_path FROM payment_proofs WHERE payment_id = %s ORDER BY uploaded_at DESC LIMIT 1", (r['id'],))
            p = cursor.fetchone()
            if p and p.get('file_path'):
                r['proof'] = p.get('file_path')
            else:
                r['proof'] = None

        # Create PDF
        buff = BytesIO()
        c = canvas.Canvas(buff, pagesize=A4)
        width, height = A4
        y = height - 40
        c.setFont('Helvetica-Bold', 14)
        title = f"Payments Ledger {('Deal ' + str(deal_id)) if deal_id else ''}"
        c.drawString(40, y, title)
        y -= 30
        c.setFont('Helvetica', 10)

        for r in rows:
            if y < 160:
                c.showPage()
                y = height - 40
                c.setFont('Helvetica', 10)

            # Header line with date, id, amount, currency
            c.setFont('Helvetica-Bold', 11)
            c.drawString(40, y, f"{r.get('payment_date','')}  | ID: {r.get('id','-')}  | ₹{r.get('amount','')}")
            c.setFont('Helvetica', 10)
            c.drawString(400, y, f"{r.get('currency','INR')}")
            y -= 16

            # Mode, reference, created_by
            c.drawString(40, y, f"Mode: {r.get('payment_mode','-')}")
            c.drawString(200, y, f"Reference: {str(r.get('reference') or '-')}" )
            c.drawString(420, y, f"Created by: {r.get('created_by') or '-'}")
            y -= 14

            # Notes (trim long)
            notes = str(r.get('notes') or '')
            c.drawString(40, y, f"Notes: {notes[:120]}")
            y -= 14

            # Party splits (if any) — draw a small table with columns
            if r.get('parties'):
                parts = r.get('parties') or []
                if parts:
                    # Table layout
                    x0 = 48
                    col1 = x0
                    col2 = x0 + 260
                    col3 = x0 + 360
                    row_h = 14
                    # header
                    c.setFont('Helvetica-Bold', 9)
                    c.drawString(col1, y, 'Party')
                    c.drawString(col2, y, 'Percentage')
                    c.drawString(col3, y, 'Amount')
                    y -= row_h
                    c.setFont('Helvetica', 9)
                    # rows
                    for pp in parts:
                        # page break if necessary
                        if y < 80:
                            c.showPage()
                            y = height - 40
                            c.setFont('Helvetica', 10)
                        label = pp.get('party_name') or (f"{pp.get('party_type','')} #{pp.get('party_id')}" if pp.get('party_id') else pp.get('party_type',''))
                        pct = pp.get('percentage')
                        amt = pp.get('amount')
                        c.drawString(col1, y, f"{label}")
                        c.drawString(col2, y, f"{pct if pct is not None else '-'}")
                        c.drawRightString(col3 + 60, y, f"{('₹' + format(amt, ',.2f')) if amt is not None else '-'}")
                        y -= row_h
            else:
                # draw image thumbnail if proof exists and file present
                if r.get('proof'):
                    p = r.get('proof').replace('\\', '/')
                    idx = p.find('uploads/')
                    if idx != -1:
                        rel = p[idx:]
                        img_path = os.path.abspath(os.path.join(APP_ROOT, rel))
                        try:
                            img = ImageReader(img_path)
                            c.drawImage(img, 40, y-60, width=80, height=60, preserveAspectRatio=True, mask='auto')
                            y -= 64
                        except Exception:
                            pass

            y -= 12

        c.save()
        buff.seek(0)
        return send_file(buff, mimetype='application/pdf', as_attachment=True, download_name='ledger.pdf')
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/ledger', methods=['GET'])
def payments_ledger():
    """Return payments filtered by query parameters:
    Supported params: deal_id, party_type, party_id, payment_mode, start_date, end_date
    """
    params = request.args
    deal_id = params.get('deal_id')
    party_type = params.get('party_type')
    party_id = params.get('party_id')
    payment_mode = params.get('payment_mode')
    start_date = params.get('start_date')
    end_date = params.get('end_date')

    # If filtering by party (party_type or party_id) prefer to join payment_parties
    args = []
    if party_type or party_id:
        sql = "SELECT DISTINCT p.* FROM payments p JOIN payment_parties pp ON pp.payment_id = p.id WHERE 1=1"
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if party_type:
            sql += " AND pp.party_type = %s"
            args.append(party_type)
        if party_id:
            sql += " AND pp.party_id = %s"
            args.append(party_id)
    else:
        sql = "SELECT p.* FROM payments p WHERE 1=1"
        if deal_id:
            sql += " AND p.deal_id = %s"
            args.append(deal_id)
        if payment_mode:
            sql += " AND p.payment_mode = %s"
            args.append(payment_mode)

    if start_date:
        sql += " AND p.payment_date >= %s"
        args.append(start_date)
    if end_date:
        sql += " AND p.payment_date <= %s"
        args.append(end_date)

    sql += " ORDER BY p.payment_date DESC"

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, tuple(args))
        rows = cursor.fetchall() or []
        for r in rows:
            for k in ('payment_date', 'created_at'):
                if r.get(k) is not None and isinstance(r.get(k), datetime):
                    r[k] = r[k].isoformat()
        return jsonify(rows)
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>', methods=['POST'])
@token_required
def create_payment(current_user, deal_id):
    """Create a payment record for a deal"""
    data = request.get_json() or {}
    # normalize party_type to the ENUM allowed values in the DB
    party_type = data.get('party_type', 'other')
    allowed_party_types = {'owner', 'buyer', 'investor', 'other'}
    if party_type not in allowed_party_types:
        party_type = 'other'

    # normalize party_id to integer or None
    party_id = data.get('party_id')
    try:
        if party_id is None or party_id == '':
            party_id = None
        else:
            party_id = int(party_id)
    except Exception:
        party_id = None
    amount = data.get('amount')
    currency = data.get('currency', 'INR')
    payment_date = data.get('payment_date')
    payment_mode = data.get('payment_mode')
    reference = data.get('reference')
    notes = data.get('notes')

    # Validate amount
    try:
        if amount is None or amount == '':
            raise ValueError('amount missing')
        amount = float(amount)
    except Exception:
        return jsonify({'error': 'amount is required and must be a number'}), 400

    # Validate payment_date (required, YYYY-MM-DD)
    if not payment_date:
        return jsonify({'error': 'payment_date is required and must be YYYY-MM-DD'}), 400
    try:
        parsed = datetime.strptime(payment_date, '%Y-%m-%d').date()
        payment_date = parsed.strftime('%Y-%m-%d')
    except Exception:
        return jsonify({'error': 'payment_date must be in YYYY-MM-DD format'}), 400

    # If parties provided, compute their sum and optionally enforce equality with amount.
    parties = data.get('parties')
    try:
        prepared_parties = []
        if parties and isinstance(parties, list):
            for part in parties:
                pt = part.get('party_type', 'other')
                pid = part.get('party_id')
                amt = part.get('amount')
                pct = part.get('percentage')
                if pid is not None and pid != '':
                    try:
                        pid = int(pid)
                    except Exception:
                        pid = None
                if amt is not None and amt != '':
                    try:
                        amt = float(amt)
                    except Exception:
                        amt = None
                if pct is not None and pct != '':
                    try:
                        pct = float(pct)
                    except Exception:
                        pct = None
                prepared_parties.append({'party_type': pt, 'party_id': pid, 'amount': amt, 'percentage': pct})
    except Exception:
        prepared_parties = []

    conn = None
    try:
        conn = get_db_connection()
        # Start a transaction to ensure payment + parties are atomic
        conn.start_transaction()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO payments (deal_id, party_type, party_id, amount, currency, payment_date, payment_mode, reference, notes, created_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (deal_id, party_type, party_id, amount, currency, payment_date, payment_mode, reference, notes, current_user)
        )
        payment_id = cursor.lastrowid

        # Server-side validation: if prepared_parties provided, ensure consistency
        if prepared_parties:
            amounts_provided = any(isinstance(p.get('amount'), (int, float)) for p in prepared_parties)
            percentages_provided = any(isinstance(p.get('percentage'), (int, float)) for p in prepared_parties)

            # If percentages are provided, ensure they sum to (approximately) 100
            if percentages_provided:
                total_pct = sum([p.get('percentage') or 0 for p in prepared_parties])
                force = request.args.get('force', 'false').lower() == 'true'
                if abs(total_pct - 100.0) > 0.01 and not force:
                    try:
                        conn.rollback()
                    except Exception:
                        pass
                    return jsonify({'error': 'party_percentage_mismatch', 'total_percentage': total_pct}), 400

            # If only percentages are provided (not amounts), compute amounts from payment amount
            if percentages_provided and not amounts_provided:
                for p in prepared_parties:
                    pct = p.get('percentage')
                    if isinstance(pct, (int, float)):
                        p['amount'] = round((pct / 100.0) * amount, 2)

            # If amounts are provided, ensure their sum matches payment amount
            if amounts_provided:
                total_party_amount = sum([p['amount'] for p in prepared_parties if isinstance(p.get('amount'), (int, float))])
                force = request.args.get('force', 'false').lower() == 'true'
                if abs(total_party_amount - amount) > 0.01 and not force:
                    try:
                        conn.rollback()
                    except Exception:
                        pass
                    return jsonify({'error': 'party_amount_mismatch', 'payment_amount': amount, 'parties_total': total_party_amount}), 400

        # If request provided multiple parties with shares, persist them to payment_parties
        if prepared_parties:
            for part in prepared_parties:
                try:
                    cursor.execute("INSERT INTO payment_parties (payment_id, party_type, party_id, amount, percentage) VALUES (%s,%s,%s,%s,%s)", (payment_id, part.get('party_type', 'other'), part.get('party_id'), part.get('amount'), part.get('percentage')))
                except mysql.connector.Error as db_e:
                    # If the DB schema is missing the `percentage` column (1054), retry without it.
                    try:
                        if getattr(db_e, 'errno', None) == 1054 or 'Unknown column' in str(db_e):
                            cursor.execute("INSERT INTO payment_parties (payment_id, party_type, party_id, amount) VALUES (%s,%s,%s,%s)", (payment_id, part.get('party_type', 'other'), part.get('party_id'), part.get('amount')))
                        else:
                            raise
                    except Exception:
                        # Bubble up original error so outer except catches and returns 500
                        raise

        # commit transaction
        conn.commit()

        return jsonify({'message': 'Payment recorded', 'payment_id': payment_id}), 201
    except Exception as e:
        # rollback on error
        try:
            if conn:
                conn.rollback()
        except Exception:
            pass
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/<int:payment_id>', methods=['PUT'])
@token_required
def annotate_payment(current_user, deal_id, payment_id):
    """Add notes or update a payment's reference/notes"""
    data = request.get_json() or {}
    fields = {}
    for k in ('reference', 'notes', 'payment_mode', 'amount', 'payment_date'):
        if k in data:
            fields[k] = data[k]

    if not fields:
        return jsonify({'error': 'No updatable fields provided'}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        set_clause = ', '.join([f"{k} = %s" for k in fields.keys()])
        params = list(fields.values()) + [deal_id, payment_id]
        cursor.execute(f"UPDATE payments SET {set_clause} WHERE deal_id = %s AND id = %s", params)
        conn.commit()
        return jsonify({'message': 'Payment updated'})
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/<int:payment_id>', methods=['DELETE'])
@token_required
def delete_payment(current_user, deal_id, payment_id):
    """Delete a payment and its proof files (admin or owner)."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Fetch proofs to delete files
        cursor.execute("SELECT id, file_path FROM payment_proofs WHERE payment_id = %s", (payment_id,))
        proofs = cursor.fetchall()

        # Permission check: only admins or creator of payment can delete
        try:
            cursor.execute("SELECT created_by FROM payments WHERE id = %s AND deal_id = %s", (payment_id, deal_id))
            p = cursor.fetchone()
            created_by = p.get('created_by') if p else None
        except Exception:
            created_by = None

        role = None
        try:
            role = request.user.get('role')
        except Exception:
            role = None

        if not (role == 'admin' or created_by == current_user):
            return jsonify({'error': 'forbidden'}), 403

        # Delete DB rows for proofs
        cursor.execute("DELETE FROM payment_proofs WHERE payment_id = %s", (payment_id,))

        # Delete payment row
        cursor.execute("DELETE FROM payments WHERE deal_id = %s AND id = %s", (deal_id, payment_id))
        conn.commit()

        # remove files from disk (best-effort)
        for pr in proofs:
            fp = pr.get('file_path')
            if not fp:
                continue
            # Normalize: find uploads/ inside path
            p = fp.replace('\\', '/')
            idx = p.find('uploads/')
            if idx != -1:
                rel = p[idx:]
                # compute absolute path relative to the configured UPLOAD_FOLDER
                abs_path = os.path.abspath(os.path.join(app.config['UPLOAD_FOLDER'], os.path.relpath(rel.replace('uploads/', ''), '')))
                try:
                    # ensure the abs_path is inside UPLOAD_FOLDER
                    if abs_path.startswith(os.path.abspath(app.config['UPLOAD_FOLDER'])) and os.path.exists(abs_path):
                        os.remove(abs_path)
                except Exception:
                    pass

        return jsonify({'message': 'Payment and proofs deleted'})
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:payment_id>/parties', methods=['POST'])
@token_required
def add_payment_party(current_user, payment_id):
    """Add a party share to an existing payment."""
    data = request.get_json() or {}
    pt = data.get('party_type', 'other')
    pid = data.get('party_id')
    amt = data.get('amount')
    pct = data.get('percentage')
    try:
        if pid is not None and pid != '':
            pid = int(pid)
    except Exception:
        pid = None
    try:
        if amt is not None and amt != '':
            amt = float(amt)
    except Exception:
        amt = None
    try:
        if pct is not None and pct != '':
            pct = float(pct)
    except Exception:
        pct = None

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO payment_parties (payment_id, party_type, party_id, amount, percentage) VALUES (%s,%s,%s,%s,%s)", (payment_id, pt, pid, amt, pct))
        except mysql.connector.Error as db_e:
            if getattr(db_e, 'errno', None) == 1054 or 'Unknown column' in str(db_e):
                cursor.execute("INSERT INTO payment_parties (payment_id, party_type, party_id, amount) VALUES (%s,%s,%s,%s)", (payment_id, pt, pid, amt))
            else:
                raise
        conn.commit()
        return jsonify({'message': 'party_added', 'party_id': cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/parties/<int:party_id>', methods=['PUT'])
@token_required
def update_payment_party(current_user, party_id):
    data = request.get_json() or {}
    fields = {}
    for k in ('party_type', 'party_id', 'amount', 'percentage'):
        if k in data:
            fields[k] = data[k]
    if not fields:
        return jsonify({'error': 'no fields to update'}), 400
    # normalize
    if 'party_id' in fields:
        try:
            fields['party_id'] = int(fields['party_id'])
        except Exception:
            fields['party_id'] = None
    if 'amount' in fields:
        try:
            fields['amount'] = float(fields['amount'])
        except Exception:
            fields['amount'] = None
    if 'percentage' in fields:
        try:
            fields['percentage'] = float(fields['percentage'])
        except Exception:
            fields['percentage'] = None

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        set_clause = ', '.join([f"{k} = %s" for k in fields.keys()])
        params = list(fields.values()) + [party_id]
        try:
            cursor.execute(f"UPDATE payment_parties SET {set_clause} WHERE id = %s", params)
        except mysql.connector.Error as db_e:
            # If percentage column doesn't exist and it's in set_clause, retry without it
            if (getattr(db_e, 'errno', None) == 1054 or 'Unknown column' in str(db_e)) and 'percentage' in set_clause:
                # Build a reduced clause removing percentage
                reduced_fields = {k: v for k, v in fields.items() if k != 'percentage'}
                if not reduced_fields:
                    return jsonify({'error': 'percentage column not present on server'}), 500
                set_clause2 = ', '.join([f"{k} = %s" for k in reduced_fields.keys()])
                params2 = list(reduced_fields.values()) + [party_id]
                cursor.execute(f"UPDATE payment_parties SET {set_clause2} WHERE id = %s", params2)
            else:
                raise
        conn.commit()
        return jsonify({'message': 'party_updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/parties/<int:party_id>', methods=['DELETE'])
@token_required
def delete_payment_party(current_user, party_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM payment_parties WHERE id = %s", (party_id,))
        conn.commit()
        return jsonify({'message': 'party_deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/deals/<int:deal_id>/financials', methods=['GET'])
@token_required
def deal_financials(current_user, deal_id):
    """Return a financial summary for a deal: totals for payments by mode, total expenses, investments, owners' shares (if profit_allocation set), and simple P&L estimate."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # total payments grouped by payment_mode
        cursor.execute("SELECT payment_mode, SUM(amount) as total FROM payments WHERE deal_id = %s GROUP BY payment_mode", (deal_id,))
        payments_by_mode = cursor.fetchall() or []

        # total payments overall
        cursor.execute("SELECT SUM(amount) as total_payments FROM payments WHERE deal_id = %s", (deal_id,))
        total_pay = cursor.fetchone() or {}

        # total expenses
        cursor.execute("SELECT SUM(amount) as total_expenses FROM expenses WHERE deal_id = %s", (deal_id,))
        total_exp = cursor.fetchone() or {}

        # total investments
        cursor.execute("SELECT SUM(investment_amount) as total_invested FROM investors WHERE deal_id = %s", (deal_id,))
        total_inv = cursor.fetchone() or {}

        # owners count and basic split if profit_allocation exists on deals
        cursor.execute("SELECT profit_allocation, purchase_amount, selling_amount FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone() or {}

        # basic profit calculation if selling and purchase present
        profit = None
        try:
            pur = float(deal.get('purchase_amount') or 0)
            sell = float(deal.get('selling_amount') or 0)
            profit = sell - pur if (pur and sell) else None
        except Exception:
            profit = None

        return jsonify({
            'payments_by_mode': payments_by_mode,
            'total_payments': total_pay.get('total_payments'),
            'total_expenses': total_exp.get('total_expenses'),
            'total_invested': total_inv.get('total_invested'),
            'deal_profit_estimate': profit,
            'profit_allocation': deal.get('profit_allocation')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/<int:payment_id>', methods=['GET'])
def get_payment_detail(deal_id, payment_id):
    """Get detailed information for a specific payment including parties and proofs"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get payment basic info
        cursor.execute("SELECT * FROM payments WHERE deal_id = %s AND id = %s", (deal_id, payment_id))
        payment = cursor.fetchone()
        
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        
        # Convert dates to isoformat
        for k in ('payment_date', 'created_at'):
            if payment.get(k) is not None and isinstance(payment.get(k), datetime):
                payment[k] = payment[k].isoformat()
        
        # Get payment parties
        cursor.execute("SELECT id, party_type, party_id, amount, percentage FROM payment_parties WHERE payment_id = %s", (payment_id,))
        parties = cursor.fetchall() or []
        party_list = []
        for p in parties:
            party_list.append({
                'id': p.get('id'),
                'party_type': p.get('party_type'),
                'party_id': p.get('party_id'),
                'amount': float(p.get('amount')) if p.get('amount') is not None else None,
                'percentage': float(p.get('percentage')) if p.get('percentage') is not None else None
            })
        payment['parties'] = party_list
        
        # Get payment proofs
        cursor.execute("SELECT id, file_path, uploaded_by, uploaded_at, doc_type FROM payment_proofs WHERE payment_id = %s ORDER BY uploaded_at DESC", (payment_id,))
        proofs = cursor.fetchall() or []
        proof_list = []
        for proof in proofs:
            proof_data = {
                'id': proof.get('id'),
                'file_path': proof.get('file_path'),
                'uploaded_by': proof.get('uploaded_by'),
                'doc_type': proof.get('doc_type')
            }
            if proof.get('uploaded_at') and isinstance(proof.get('uploaded_at'), datetime):
                proof_data['uploaded_at'] = proof.get('uploaded_at').isoformat()
            proof_list.append(proof_data)
        payment['proofs'] = proof_list
        
        return jsonify(payment)
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/<int:payment_id>/proofs/<int:proof_id>', methods=['DELETE'])
@token_required
def delete_proof(current_user, deal_id, payment_id, proof_id):
    """Delete a single proof by id (best-effort file removal)."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT file_path, uploaded_by FROM payment_proofs WHERE id = %s AND payment_id = %s", (proof_id, payment_id))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'proof not found'}), 404

        # permission: only admin or uploader can delete
        uploader = row.get('uploaded_by')
        role = None
        try:
            role = request.user.get('role')
        except Exception:
            role = None
        if not (role == 'admin' or uploader == current_user):
            return jsonify({'error': 'forbidden'}), 403

        # delete DB row
        cursor.execute("DELETE FROM payment_proofs WHERE id = %s", (proof_id,))
        conn.commit()

        # delete file
        fp = row.get('file_path')
        if fp:
            p = fp.replace('\\', '/')
            idx = p.find('uploads/')
            if idx != -1:
                rel = p[idx:]
                abs_path = os.path.join(APP_ROOT, rel)
                try:
                    if os.path.exists(abs_path):
                        os.remove(abs_path)
                except Exception:
                    pass

        return jsonify({'message': 'proof deleted'})
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/payments/<int:deal_id>/<int:payment_id>/proof', methods=['POST'])
@token_required
def upload_payment_proof(current_user, deal_id, payment_id):
    """Upload an image/file as proof for a payment. Expects form-data with key 'proof'."""
    if 'proof' not in request.files:
        return jsonify({'error': 'No proof file provided (use form field name "proof")'}), 400

    file = request.files['proof']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    # Validation: accept any file type, but enforce size limit and secure filename
    MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB

    # prefix filename with a timestamp to avoid collisions
    base = secure_filename(file.filename)
    ts = str(int(time.time()))
    safe_name = f"{ts}_{base}"

    # Size check (attempt to use content_length or file.stream)
    size = None
    try:
        if hasattr(file, 'content_length') and file.content_length:
            size = int(file.content_length)
        else:
            # try to seek stream
            stream = file.stream
            stream.seek(0, os.SEEK_END)
            size = stream.tell()
            stream.seek(0)
    except Exception:
        size = None

    if size is not None and size > MAX_UPLOAD_SIZE:
        return jsonify({'error': 'File too large, max 5MB'}), 400

    # Save file under uploads/deal_<id>/payments/<payment_id>/
    # Save file under uploads/deal_<id>/payments/<payment_id>/
    save_dir = os.path.join(app.config['UPLOAD_FOLDER'], f'deal_{deal_id}', 'payments', str(payment_id))
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, safe_name)
    try:
        file.save(save_path)
    except Exception as e:
        return jsonify({'error': f'Failed to save file: {e}'}), 500

    # Store a web-friendly path starting with uploads/ so the frontend can request /uploads/...
    # e.g. uploads/deal_50/payments/3/project.jpg
    # Use a web-relative path (do not store the server absolute uploads folder path)
    web_rel = os.path.join('uploads', f'deal_{deal_id}', 'payments', str(payment_id), safe_name).replace('\\', '/')

    # Optional document type (e.g., receipt, bank_transfer, cheque, cash, upi, contra)
    doc_type = request.form.get('doc_type')

    # Persist metadata to payment_proofs table (if present)
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # include doc_type if column exists (migration adds it)
        try:
            cursor.execute("INSERT INTO payment_proofs (payment_id, file_path, uploaded_by, doc_type) VALUES (%s,%s,%s,%s)", (payment_id, web_rel, current_user, doc_type))
        except Exception:
            # fallback if column doesn't exist
            cursor.execute("INSERT INTO payment_proofs (payment_id, file_path, uploaded_by) VALUES (%s,%s,%s)", (payment_id, web_rel, current_user))
        conn.commit()
        proof_id = cursor.lastrowid
    except mysql.connector.Error as e:
        # If table doesn't exist or insert fails, still return success for file save but warn
        return jsonify({'warning': 'file_saved_but_db_insert_failed', 'file_path': web_rel, 'db_error': str(e)}), 200
    finally:
        if conn:
            conn.close()

    return jsonify({'message': 'proof_uploaded', 'proof_id': proof_id, 'file_path': web_rel}), 201


@app.route('/api/payments/<int:deal_id>/<int:payment_id>/proofs', methods=['GET'])
def list_payment_proofs(deal_id, payment_id):
    """Return list of proof records for a given payment."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, file_path, uploaded_by, uploaded_at FROM payment_proofs WHERE payment_id = %s ORDER BY uploaded_at DESC", (payment_id,))
        rows = cursor.fetchall()
        # Convert file_path to a URL path the frontend can load (uploads are served at /uploads/...)
        for r in rows:
            if r.get('file_path'):
                p = r['file_path'].replace('\\', '/')
                # If path contains 'uploads/...', trim any leading '../' or other segments
                idx = p.find('uploads/')
                if idx != -1:
                    p = '/' + p[idx:]
                else:
                    # ensure it starts with /
                    if not p.startswith('/'):
                        p = '/' + p
                # Build an absolute URL so the frontend (which may be on a different origin) can fetch the file
                try:
                    base = request.host_url.rstrip('/')
                    r['url'] = f"{base}{p}"
                except Exception:
                    # fallback to the path-only URL
                    r['url'] = p
            # include doc_type if present
            if r.get('doc_type'):
                r['doc_type'] = r.get('doc_type')
        return jsonify(rows)
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        stored = user.get('password') if user else None
        ok = False
        if stored:
            # Detect whether the stored value is a password hash (common prefixes or long length)
            s = str(stored)
            looks_hashed = False
            if s.startswith('pbkdf2:') or s.startswith('$2') or s.startswith('sha1$') or len(s) > 20:
                looks_hashed = True

            if looks_hashed:
                try:
                    ok = check_password_hash(stored, password)
                except Exception:
                    ok = False
            else:
                # stored value is likely plain-text (legacy); compare directly
                ok = (password == stored)

        if user and ok:
            token = jwt.encode({
                'user_id': user['id'],
                'username': user['username'],
                'role': user['role'],
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.config['SECRET_KEY'])
            
            return jsonify({
                'token': token,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'role': user['role'],
                    'full_name': user['full_name']
                }
            })
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/register', methods=['POST'])
def register():
    """
    Temporary registration endpoint for testing purposes
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        full_name = data.get('full_name', username)
        role = data.get('role', 'user')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check if user already exists
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            return jsonify({'error': 'Username already exists'}), 400
        
        # Create users table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        # Insert new user
        cursor.execute("""
            INSERT INTO users (username, password, full_name, role)
            VALUES (%s, %s, %s, %s)
        """, (username, password, full_name, role))
        
        connection.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user': {
                'username': username,
                'full_name': full_name,
                'role': role
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

    # DELETE route for deals
@app.route('/api/deals/<int:deal_id>', methods=['DELETE'])
@token_required
def delete_deal(current_user, deal_id):
    """
    Delete a deal and all its associated data (owners, buyers, investors, expenses, documents)
    """
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # First check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Delete all associated data in the correct order (foreign key constraints)
        
        # 1. Delete owner documents first (if table exists)
        try:
            cursor.execute("""
                DELETE od FROM owner_documents od 
                INNER JOIN owners o ON od.owner_id = o.id 
                WHERE o.deal_id = %s
            """, (deal_id,))
        except Exception as e:
            # Table might not exist, continue
            pass
        
        # 2. Delete deal documents (if table exists)
        try:
            cursor.execute("DELETE FROM deal_documents WHERE deal_id = %s", (deal_id,))
        except Exception as e:
            # Table might not exist, continue
            pass
        
        # 3. Delete owners associated with this deal
        cursor.execute("DELETE FROM owners WHERE deal_id = %s", (deal_id,))
        
        # 4. Delete buyers associated with this deal  
        cursor.execute("DELETE FROM buyers WHERE deal_id = %s", (deal_id,))
        
        # 5. Delete investors associated with this deal
        cursor.execute("DELETE FROM investors WHERE deal_id = %s", (deal_id,))
        
        # 6. Delete expenses associated with this deal
        cursor.execute("DELETE FROM expenses WHERE deal_id = %s", (deal_id,))
        
        # 7. Finally delete the deal itself
        cursor.execute("DELETE FROM deals WHERE id = %s", (deal_id,))
        
        connection.commit()
        
        return jsonify({
            'message': 'Deal and all associated data deleted successfully',
            'deleted_deal_id': deal_id
        })
        
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({'error': f'Failed to delete deal: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/cleanup/orphaned-owners', methods=['DELETE'])
@token_required  
def cleanup_orphaned_owners(current_user):
    """
    Clean up orphaned owners whose associated deals have been deleted
    """
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Find owners whose deal_id no longer exists in deals table
        cursor.execute("""
            SELECT o.id, o.name, o.deal_id 
            FROM owners o 
            LEFT JOIN deals d ON o.deal_id = d.id 
            WHERE d.id IS NULL
        """)
        orphaned_owners = cursor.fetchall()
        
        if not orphaned_owners:
            return jsonify({
                'message': 'No orphaned owners found',
                'deleted_count': 0
            })
        
        orphaned_owner_ids = [owner[0] for owner in orphaned_owners]
        
        # Delete documents for orphaned owners (if table exists)
        try:
            if orphaned_owner_ids:
                placeholders = ','.join(['%s'] * len(orphaned_owner_ids))
                cursor.execute(f"""
                    DELETE FROM owner_documents 
                    WHERE owner_id IN ({placeholders})
                """, orphaned_owner_ids)
        except Exception as e:
            # Table might not exist, continue
            pass
        
        # Delete the orphaned owners
        if orphaned_owner_ids:
            placeholders = ','.join(['%s'] * len(orphaned_owner_ids))
            cursor.execute(f"""
                DELETE FROM owners 
                WHERE id IN ({placeholders})
            """, orphaned_owner_ids)
        
        connection.commit()
        
        return jsonify({
            'message': f'Successfully cleaned up {len(orphaned_owners)} orphaned owners',
            'deleted_count': len(orphaned_owners),
            'deleted_owners': [{'id': owner[0], 'name': owner[1], 'deal_id': owner[2]} for owner in orphaned_owners]
        })
        
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({'error': f'Failed to cleanup orphaned owners: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/cleanup/all-orphaned-data', methods=['DELETE'])
@token_required
def cleanup_all_orphaned_data(current_user):
    """
    Clean up all orphaned data (owners, buyers, investors, expenses) whose deals have been deleted
    """
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cleanup_results = {}
        
        # 1. Clean up orphaned owners
        cursor.execute("""
            SELECT o.id, o.name, o.deal_id 
            FROM owners o 
            LEFT JOIN deals d ON o.deal_id = d.id 
            WHERE d.id IS NULL
        """)
        orphaned_owners = cursor.fetchall()
        
        if orphaned_owners:
            orphaned_owner_ids = [owner[0] for owner in orphaned_owners]
            
            # Delete owner documents first
            try:
                placeholders = ','.join(['%s'] * len(orphaned_owner_ids))
                cursor.execute(f"""
                    DELETE FROM owner_documents 
                    WHERE owner_id IN ({placeholders})
                """, orphaned_owner_ids)
            except Exception:
                pass
            
            # Delete orphaned owners
            placeholders = ','.join(['%s'] * len(orphaned_owner_ids))
            cursor.execute(f"""
                DELETE FROM owners 
                WHERE id IN ({placeholders})
            """, orphaned_owner_ids)
            
            cleanup_results['owners'] = {
                'count': len(orphaned_owners),
                'names': [owner[1] for owner in orphaned_owners]
            }
        else:
            cleanup_results['owners'] = {'count': 0, 'names': []}
        
        # 2. Clean up orphaned buyers
        cursor.execute("""
            SELECT b.id, b.name, b.deal_id 
            FROM buyers b 
            LEFT JOIN deals d ON b.deal_id = d.id 
            WHERE d.id IS NULL
        """)
        orphaned_buyers = cursor.fetchall()
        
        if orphaned_buyers:
            orphaned_buyer_ids = [buyer[0] for buyer in orphaned_buyers]
            placeholders = ','.join(['%s'] * len(orphaned_buyer_ids))
            cursor.execute(f"""
                DELETE FROM buyers 
                WHERE id IN ({placeholders})
            """, orphaned_buyer_ids)
            
            cleanup_results['buyers'] = {
                'count': len(orphaned_buyers),
                'names': [buyer[1] for buyer in orphaned_buyers]
            }
        else:
            cleanup_results['buyers'] = {'count': 0, 'names': []}
        
        # 3. Clean up orphaned investors
        cursor.execute("""
            SELECT i.id, i.investor_name, i.deal_id 
            FROM investors i 
            LEFT JOIN deals d ON i.deal_id = d.id 
            WHERE d.id IS NULL
        """)
        orphaned_investors = cursor.fetchall()
        
        if orphaned_investors:
            orphaned_investor_ids = [investor[0] for investor in orphaned_investors]
            placeholders = ','.join(['%s'] * len(orphaned_investor_ids))
            cursor.execute(f"""
                DELETE FROM investors 
                WHERE id IN ({placeholders})
            """, orphaned_investor_ids)
            
            cleanup_results['investors'] = {
                'count': len(orphaned_investors),
                'names': [investor[1] for investor in orphaned_investors]
            }
        else:
            cleanup_results['investors'] = {'count': 0, 'names': []}
        
        # 4. Clean up orphaned expenses
        cursor.execute("""
            SELECT e.id, e.expense_type, e.deal_id 
            FROM expenses e 
            LEFT JOIN deals d ON e.deal_id = d.id 
            WHERE d.id IS NULL
        """)
        orphaned_expenses = cursor.fetchall()
        
        if orphaned_expenses:
            orphaned_expense_ids = [expense[0] for expense in orphaned_expenses]
            placeholders = ','.join(['%s'] * len(orphaned_expense_ids))
            cursor.execute(f"""
                DELETE FROM expenses 
                WHERE id IN ({placeholders})
            """, orphaned_expense_ids)
            
            cleanup_results['expenses'] = {
                'count': len(orphaned_expenses),
                'types': [expense[1] for expense in orphaned_expenses]
            }
        else:
            cleanup_results['expenses'] = {'count': 0, 'types': []}
        
        connection.commit()
        
        total_cleaned = sum(result['count'] for result in cleanup_results.values())
        
        return jsonify({
            'message': f'Successfully cleaned up {total_cleaned} orphaned records',
            'cleanup_results': cleanup_results,
            'total_deleted': total_cleaned
        })
        
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({'error': f'Failed to cleanup orphaned data: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>', methods=['PUT'])
@token_required
def update_deal(current_user, deal_id):
    """Update an existing deal with all its related data"""
    try:
        data = request.get_json()
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (deal_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Handle empty strings for numeric fields
        total_area = data.get('total_area') if data.get('total_area') != '' else None
        purchase_amount = data.get('purchase_amount') if data.get('purchase_amount') != '' else None
        selling_amount = data.get('selling_amount') if data.get('selling_amount') != '' else None

        # Resolve normalized state_id and district_id (idempotent)
        state_name = data.get('state')
        district_name = data.get('district')
        state_id = None
        district_id = None
        try:
            # Use the helper functions which will insert if missing
            state_id = get_or_create_state(cursor, state_name)
            if state_id:
                district_id = get_or_create_district(cursor, state_id, district_name)
        except Exception:
            # Non-fatal: continue without normalized ids if any issue
            state_id = None
            district_id = None

        # Update main deal record
        cursor.execute("""
            UPDATE deals SET 
                project_name = %s, survey_number = %s, location = %s, state = %s, 
                district = %s, taluka = %s, village = %s, total_area = %s, area_unit = %s, 
                purchase_date = %s, purchase_amount = %s, selling_amount = %s, 
                status = %s, payment_mode = %s, profit_allocation = %s, 
                state_id = %s, district_id = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (
            data.get('project_name'),
            data.get('survey_number'),
            data.get('location'),
            data.get('state'),
            data.get('district'),
            data.get('taluka'),
            data.get('village'),
            total_area,
            data.get('area_unit'),
            data.get('purchase_date'),
            purchase_amount,
            selling_amount,
            data.get('status'),
            data.get('payment_mode'),
            data.get('profit_allocation'),
            state_id,
            district_id,
            deal_id
        ))

        # Update owners - delete existing and insert new ones
        cursor.execute("DELETE FROM owners WHERE deal_id = %s", (deal_id,))
        owners = data.get('owners', [])
        for owner in owners:
            if owner.get('name'):
                cursor.execute("""
                    INSERT INTO owners (deal_id, name, mobile, email, aadhar_card, pan_card, address)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    owner.get('name'),
                    owner.get('mobile'),
                    owner.get('email'),
                    owner.get('aadhar_card'),
                    owner.get('pan_card'),
                    owner.get('address')
                ))

        # Update buyers - delete existing and insert new ones
        cursor.execute("DELETE FROM buyers WHERE deal_id = %s", (deal_id,))
        buyers = data.get('buyers', [])
        for buyer in buyers:
            if buyer.get('name'):
                cursor.execute("""
                    INSERT INTO buyers (deal_id, name, mobile, email, aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    buyer.get('name'),
                    buyer.get('mobile'),
                    buyer.get('email'),
                    buyer.get('aadhar_card'),
                    buyer.get('pan_card')
                ))
        
        # Update investors - delete existing and insert new ones
        cursor.execute("DELETE FROM investors WHERE deal_id = %s", (deal_id,))
        investors = data.get('investors', [])
        for investor in investors:
            if investor.get('investor_name'):
                cursor.execute("""
                    INSERT INTO investors (deal_id, investor_name, investment_amount, 
                                         investment_percentage, mobile, email, 
                                         aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    investor.get('investor_name'),
                    investor.get('investment_amount'),
                    investor.get('investment_percentage'),
                    investor.get('mobile'),
                    investor.get('email'),
                    investor.get('aadhar_card'),
                    investor.get('pan_card')
                ))

        # Update expenses - delete existing and insert new ones
        cursor.execute("DELETE FROM expenses WHERE deal_id = %s", (deal_id,))
        expenses = data.get('expenses', [])
        for expense in expenses:
            if expense.get('expense_type') and expense.get('amount'):
                cursor.execute("""
                    INSERT INTO expenses (deal_id, expense_type, expense_description, amount, paid_by, expense_date, receipt_number)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    expense.get('expense_type'),
                    expense.get('expense_description'),
                    expense.get('amount'),
                    expense.get('paid_by'),
                    expense.get('expense_date'),
                    expense.get('receipt_number')
                ))

        connection.commit()
        return jsonify({'message': 'Deal updated successfully', 'deal_id': deal_id})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals', methods=['GET'])
@token_required
def get_deals(current_user):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT d.*, u.full_name as created_by_name 
            FROM deals d 
            LEFT JOIN users u ON d.created_by = u.id 
            ORDER BY d.created_at DESC
        """)
        deals = cursor.fetchall()
        
        # Convert datetime objects to strings for JSON serialization
        for deal in deals:
            for key, value in deal.items():
                if isinstance(value, datetime):
                    deal[key] = value.isoformat()
        
        return jsonify(deals)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals', methods=['POST'])
@token_required
def create_deal(current_user):
    try:
        data = request.get_json()
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Handle empty strings for numeric fields
        total_area = data.get('total_area') if data.get('total_area') != '' else None
        purchase_amount = data.get('purchase_amount') if data.get('purchase_amount') != '' else None
        selling_amount = data.get('selling_amount') if data.get('selling_amount') != '' else None

        # Resolve normalized state_id and district_id (idempotent)
        state_name = data.get('state')
        district_name = data.get('district')
        state_id = None
        district_id = None
        try:
            # Use the helper functions which will insert if missing
            state_id = get_or_create_state(cursor, state_name)
            if state_id:
                district_id = get_or_create_district(cursor, state_id, district_name)
        except Exception:
            # Non-fatal: continue without normalized ids if any issue
            state_id = None
            district_id = None

        # Insert deal with new fields including normalized ids and keep legacy text
        cursor.execute("""
            INSERT INTO deals (project_name, survey_number, location, state, district, 
                             taluka, village, total_area, area_unit, purchase_date, 
                             purchase_amount, selling_amount, created_by, status, payment_mode, profit_allocation, state_id, district_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('project_name'),
            data.get('survey_number'),
            data.get('location'),
            data.get('state'),
            data.get('district'),
            data.get('taluka'),
            data.get('village'),
            total_area,
            data.get('area_unit'),
            data.get('purchase_date'),
            purchase_amount,
            selling_amount,
            current_user,
            data.get('status'),
            data.get('payment_mode'),
            data.get('profit_allocation'),
            state_id,
            district_id
        ))
        deal_id = cursor.lastrowid
        # Insert owners
        owners = data.get('owners', [])
        for owner in owners:
            if owner.get('existing_owner_id'):
                # Associate existing owner with this deal
                cursor.execute("""
                    INSERT INTO owners (deal_id, name, mobile, email, aadhar_card, pan_card)
                    SELECT %s, name, mobile, email, aadhar_card, pan_card
                    FROM owners 
                    WHERE id = %s
                    LIMIT 1
                """, (deal_id, owner.get('existing_owner_id')))
            elif owner.get('name'):
                # Create new owner
                cursor.execute("""
                    INSERT INTO owners (deal_id, name, mobile, email, aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    owner.get('name'),
                    owner.get('mobile'),
                    owner.get('email'),
                    owner.get('aadhar_card'),
                    owner.get('pan_card')
                ))

        # Insert buyers
        buyers = data.get('buyers', [])
        for buyer in buyers:
            if buyer.get('name'):
                cursor.execute("""
                    INSERT INTO buyers (deal_id, name, mobile, email, aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    buyer.get('name'),
                    buyer.get('mobile'),
                    buyer.get('email'),
                    buyer.get('aadhar_card'),
                    buyer.get('pan_card')
                ))
        
        # Insert investors
        investors = data.get('investors', [])
        for investor in investors:
            if investor.get('investor_name'):
                cursor.execute("""
                    INSERT INTO investors (deal_id, investor_name, investment_amount, 
                                         investment_percentage, mobile, email, 
                                         aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    investor.get('investor_name'),
                    investor.get('investment_amount'),
                    investor.get('investment_percentage'),
                    investor.get('mobile'),
                    investor.get('email'),
                    investor.get('aadhar_card'),
                    investor.get('pan_card')
                ))

        # Insert expenses
        expenses = data.get('expenses', [])
        for expense in expenses:
            if expense.get('expense_type') and expense.get('amount'):
                cursor.execute("""
                    INSERT INTO expenses (deal_id, expense_type, expense_description, amount, paid_by, expense_date, receipt_number)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    expense.get('expense_type'),
                    expense.get('expense_description'),
                    expense.get('amount'),
                    expense.get('paid_by'),
                    expense.get('expense_date'),
                    expense.get('receipt_number')
                ))

        connection.commit()

        return jsonify({'message': 'Deal created successfully', 'deal_id': deal_id})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>', methods=['GET'])
@token_required
def get_deal(current_user, deal_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Get deal details
        cursor.execute("SELECT * FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone()

        # Get owners
        cursor.execute("SELECT * FROM owners WHERE deal_id = %s", (deal_id,))
        owners = cursor.fetchall()

        # Get buyers
        cursor.execute("SELECT * FROM buyers WHERE deal_id = %s", (deal_id,))
        buyers = cursor.fetchall()

        if not deal:
            return jsonify({'error': 'Deal not found'}), 404

        # Get investors
        cursor.execute("SELECT * FROM investors WHERE deal_id = %s", (deal_id,))
        investors = cursor.fetchall()

        # Get expenses
        cursor.execute("""
            SELECT e.*, i.investor_name as paid_by_name 
            FROM expenses e 
            LEFT JOIN investors i ON e.paid_by = i.id 
            WHERE e.deal_id = %s
        """, (deal_id,))
        expenses = cursor.fetchall()

        # Get documents
        cursor.execute("SELECT * FROM documents WHERE deal_id = %s", (deal_id,))
        documents = cursor.fetchall()

        # Convert datetime objects
        for item in [deal] + owners + buyers + investors + expenses + documents:
            if item:
                for key, value in item.items():
                    if isinstance(value, datetime):
                        item[key] = value.isoformat()

        return jsonify({
            'deal': deal,
            'owners': owners,
            'buyers': buyers,
            'investors': investors,
            'expenses': expenses,
            'documents': documents
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/deals/<int:deal_id>/expenses', methods=['POST'])
@token_required
def add_expense(current_user, deal_id):
    try:
        data = request.get_json()
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            INSERT INTO expenses (deal_id, expense_type, expense_description, 
                                amount, paid_by, expense_date, receipt_number)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            deal_id,
            data.get('expense_type'),
            data.get('expense_description'),
            data.get('amount'),
            data.get('paid_by'),
            data.get('expense_date'),
            data.get('receipt_number')
        ))
        
        connection.commit()
        
        return jsonify({'message': 'Expense added successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

# Owners API endpoints
@app.route('/api/owners', methods=['GET'])
@token_required
def get_all_owners(current_user):
    """Get all owners with their project counts and total investment"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                MIN(o.id) as id,
                o.name,
                o.mobile,
                o.email,
                o.aadhar_card,
                o.pan_card,
                COUNT(DISTINCT o.deal_id) as total_projects,
                COUNT(DISTINCT CASE WHEN d.status = 'active' THEN d.id END) as active_projects,
                COALESCE(SUM(CASE WHEN d.status = 'active' THEN d.purchase_amount END), 0) as total_investment
            FROM owners o
            LEFT JOIN deals d ON o.deal_id = d.id
            GROUP BY o.name, o.mobile, o.email, o.aadhar_card, o.pan_card
            ORDER BY o.name
        """)
        owners = cursor.fetchall()
        
        return jsonify(owners)
    
    except Exception as e:
        print(f"Error in get_all_owners: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners/<int:owner_id>', methods=['GET'])
@token_required
def get_owner_details(current_user, owner_id):
    """Get detailed owner information including all their projects"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get owner details
        cursor.execute("""
            SELECT DISTINCT o.id, o.name, o.mobile, o.email, o.aadhar_card, o.pan_card
            FROM owners o
            WHERE o.id = %s
        """, (owner_id,))
        owner = cursor.fetchone()
        
        if not owner:
            return jsonify({'error': 'Owner not found'}), 404
        
        # Get all projects for this owner (find by matching owner details, not just this ID)
        cursor.execute("""
            SELECT DISTINCT
                d.id,
                d.project_name,
                d.state,
                d.district,
                d.taluka,
                d.village,
                d.total_area,
                d.area_unit,
                d.purchase_amount,
                d.selling_amount,
                d.purchase_date,
                d.status,
                d.created_at
            FROM deals d
            INNER JOIN owners o ON d.id = o.deal_id
            WHERE o.name = %s 
                AND (o.mobile = %s OR o.mobile IS NULL OR %s IS NULL)
                AND (o.email = %s OR o.email IS NULL OR %s IS NULL)
            ORDER BY d.created_at DESC
        """, (owner['name'], owner['mobile'], owner['mobile'], owner['email'], owner['email']))
        projects = cursor.fetchall()
        
        # Get owner documents - find all owner IDs with same person details
        documents = []
        try:
            # First get all owner IDs for this person
            cursor.execute("""
                SELECT DISTINCT o.id
                FROM owners o
                WHERE o.name = %s 
                    AND (o.mobile = %s OR o.mobile IS NULL OR %s IS NULL)
                    AND (o.email = %s OR o.email IS NULL OR %s IS NULL)
            """, (owner['name'], owner['mobile'], owner['mobile'], owner['email'], owner['email']))
            owner_ids = [row['id'] for row in cursor.fetchall()]
            
            if owner_ids:
                # Get documents for all owner IDs
                placeholders = ','.join(['%s'] * len(owner_ids))
                cursor.execute(f"""
                    SELECT id, document_type, document_name, file_path, file_size, 
                           uploaded_at, uploaded_by
                    FROM owner_documents 
                    WHERE owner_id IN ({placeholders})
                    ORDER BY uploaded_at DESC
                """, owner_ids)
                documents = cursor.fetchall()
        except mysql.connector.Error as e:
            # If owner_documents table doesn't exist, just return empty documents
            print(f"Warning: Could not fetch owner documents: {e}")
            documents = []
        
        # Convert datetime objects
        all_items = projects + documents
        for item in all_items:
            if item:
                for key, value in item.items():
                    if isinstance(value, datetime):
                        item[key] = value.isoformat()
        
        return jsonify({
            'owner': owner,
            'projects': projects,
            'documents': documents
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners', methods=['POST'])
@token_required
def create_owner(current_user):
    """Create a new owner"""
    try:
        data = request.get_json()
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            INSERT INTO owners (deal_id, name, mobile, email, aadhar_card, pan_card, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('deal_id'),
            data.get('name'),
            data.get('mobile'),
            data.get('email'),
            data.get('aadhar_card'),
            data.get('pan_card'),
            data.get('address')
        ))
        
        owner_id = cursor.lastrowid
        connection.commit()
        
        return jsonify({'message': 'Owner created successfully', 'owner_id': owner_id})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners/<int:owner_id>', methods=['DELETE'])
@token_required
def delete_owner(current_user, owner_id):
    """Delete an owner"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("DELETE FROM owners WHERE id = %s", (owner_id,))
        connection.commit()
        
        return jsonify({'message': 'Owner deleted successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners/<int:owner_id>/documents', methods=['POST'])
@token_required
def upload_owner_document(current_user, owner_id):
    """Upload document for an owner"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        document_type = request.form.get('document_type')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get owner name for folder
        cursor.execute("SELECT name FROM owners WHERE id = %s LIMIT 1", (owner_id,))
        owner = cursor.fetchone()
        if not owner:
            return jsonify({'error': 'Owner not found'}), 404
        
        owner_folder_name = f"owner_{owner_id}"
        
        # Create folder for the owner
        owner_folder = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(owner_folder_name))
        os.makedirs(owner_folder, exist_ok=True)
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(owner_folder, filename)
        file.save(filepath)
        
        # Save to database - handle table not existing
        try:
            cursor = connection.cursor()
            cursor.execute("""
                INSERT INTO owner_documents (owner_id, document_type, document_name, 
                                           file_path, file_size, uploaded_by)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                owner_id,
                document_type,
                filename,
                os.path.relpath(filepath, app.config['UPLOAD_FOLDER']),
                os.path.getsize(filepath),
                current_user
            ))
            connection.commit()
        except mysql.connector.Error as e:
            # If owner_documents table doesn't exist, return a specific error
            return jsonify({'error': 'Document management not yet set up. Please contact administrator.'}), 503
        
        return jsonify({'message': 'Document uploaded successfully', 'filename': filename})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/owners/<int:owner_id>/documents', methods=['GET'])
@token_required
def get_owner_documents(current_user, owner_id):
    """Get all documents for an owner"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Check if owner exists and get their details
        cursor.execute("SELECT id, name, mobile, email FROM owners WHERE id = %s LIMIT 1", (owner_id,))
        owner = cursor.fetchone()
        if not owner:
            return jsonify({'error': 'Owner not found'}), 404
        
        # Get documents - find all owner IDs with same person details, then get their documents
        try:
            # First get all owner IDs for this person
            cursor.execute("""
                SELECT DISTINCT o.id
                FROM owners o
                WHERE o.name = %s 
                    AND (o.mobile = %s OR o.mobile IS NULL OR %s IS NULL)
                    AND (o.email = %s OR o.email IS NULL OR %s IS NULL)
            """, (owner['name'], owner['mobile'], owner['mobile'], owner['email'], owner['email']))
            owner_ids = [row['id'] for row in cursor.fetchall()]
            
            documents = []
            if owner_ids:
                # Get documents for all owner IDs
                placeholders = ','.join(['%s'] * len(owner_ids))
                cursor.execute(f"""
                    SELECT id, document_type, document_name, file_path, file_size, 
                           created_at, uploaded_by
                    FROM owner_documents 
                    WHERE owner_id IN ({placeholders})
                    ORDER BY document_type, created_at DESC
                """, owner_ids)
                documents = cursor.fetchall()
            
            # Group documents by type
            grouped_docs = {}
            for doc in documents:
                doc_type = doc['document_type']
                if doc_type not in grouped_docs:
                    grouped_docs[doc_type] = []
                grouped_docs[doc_type].append({
                    'id': doc['id'],
                    'name': doc['document_name'],
                    'file_path': doc['file_path'],
                    'file_size': doc['file_size'],
                    'created_at': doc['created_at'].isoformat() if doc['created_at'] else None,
                    'uploaded_by': doc['uploaded_by']
                })
            
            return jsonify({
                'owner': owner,
                'documents': grouped_docs
            })
            
        except mysql.connector.Error as e:
            # If owner_documents table doesn't exist, return empty documents
            return jsonify({
                'owner': owner,
                'documents': {}
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

# ===== INVESTORS ENDPOINTS =====

@app.route('/api/investors', methods=['GET'])
@token_required
def get_investors(current_user):
    """Get all investors"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT i.*, d.project_name as deal_title
            FROM investors i
            LEFT JOIN deals d ON i.deal_id = d.id
            ORDER BY i.created_at DESC
        """)
        
        investors = cursor.fetchall()
        
        # Format the data
        formatted_investors = []
        for investor in investors:
            formatted_investors.append({
                'id': investor['id'],
                'deal_id': investor['deal_id'],
                'deal_title': investor['deal_title'],
                'investor_name': investor['investor_name'],
                'investment_amount': float(investor['investment_amount']) if investor['investment_amount'] else 0,
                'investment_percentage': float(investor['investment_percentage']) if investor['investment_percentage'] else 0,
                'mobile': investor['mobile'],
                'email': investor['email'],
                'aadhar_card': investor['aadhar_card'],
                'pan_card': investor['pan_card'],
                'address': investor['address'],
                'created_at': investor['created_at'].isoformat() if investor['created_at'] else None
            })
        
        return jsonify(formatted_investors)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors/<int:investor_id>', methods=['GET'])
@token_required
def get_investor(current_user, investor_id):
    """Get a specific investor with their deals and documents"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get the investor details
        cursor.execute("""
            SELECT i.*, d.project_name as deal_title
            FROM investors i
            LEFT JOIN deals d ON i.deal_id = d.id
            WHERE i.id = %s
        """, (investor_id,))
        
        investor = cursor.fetchone()
        if not investor:
            return jsonify({'error': 'Investor not found'}), 404
        
        # Get all deals this investor is involved in
        cursor.execute("""
            SELECT d.*, i.investment_amount, i.investment_percentage
            FROM deals d
            INNER JOIN investors i ON d.id = i.deal_id
            WHERE i.id = %s
        """, (investor_id,))
        deals = cursor.fetchall() or []
        
        # Get documents for this investor (if any)
        # Note: You might need to add investor documents table if it doesn't exist
        documents = []  # For now, empty array since investor documents might not be implemented
        
        # Format the investor data
        formatted_investor = {
            'id': investor['id'],
            'deal_id': investor['deal_id'],
            'deal_title': investor['deal_title'],
            'investor_name': investor['investor_name'],
            'investment_amount': float(investor['investment_amount']) if investor['investment_amount'] else 0,
            'investment_percentage': float(investor['investment_percentage']) if investor['investment_percentage'] else 0,
            'mobile': investor['mobile'],
            'email': investor['email'],
            'aadhar_card': investor['aadhar_card'],
            'pan_card': investor['pan_card'],
            'address': investor['address'],
            'created_at': investor['created_at'].isoformat() if investor['created_at'] else None
        }
        
        # Convert datetime objects in deals
        for deal in deals:
            if deal:
                for key, value in deal.items():
                    if isinstance(value, datetime):
                        deal[key] = value.isoformat()
        
        return jsonify({
            'investor': formatted_investor,
            'deals': deals,
            'documents': documents
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors', methods=['POST'])
@token_required
def create_investor(current_user):
    """Create a new investor"""
    try:
        data = request.get_json()
        required_fields = ['deal_id', 'investor_name']
        
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Check if deal exists
        cursor.execute("SELECT id FROM deals WHERE id = %s", (data['deal_id'],))
        if not cursor.fetchone():
            return jsonify({'error': 'Deal not found'}), 404
        
        # Insert new investor
        cursor.execute("""
            INSERT INTO investors (deal_id, investor_name, investment_amount, investment_percentage,
                                 mobile, email, aadhar_card, pan_card, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['deal_id'],
            data['investor_name'],
            data.get('investment_amount'),
            data.get('investment_percentage'),
            data.get('mobile'),
            data.get('email'),
            data.get('aadhar_card'),
            data.get('pan_card'),
            data.get('address')
        ))
        
        connection.commit()
        investor_id = cursor.lastrowid
        
        return jsonify({'message': 'Investor created successfully', 'id': investor_id}), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors/<int:investor_id>', methods=['PUT'])
@token_required
def update_investor(current_user, investor_id):
    """Update an existing investor"""
    try:
        data = request.get_json()
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Check if investor exists
        cursor.execute("SELECT id FROM investors WHERE id = %s", (investor_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Investor not found'}), 404
        
        # Build update query dynamically
        update_fields = []
        update_values = []
        
        updatable_fields = ['deal_id', 'investor_name', 'investment_amount', 'investment_percentage',
                           'mobile', 'email', 'aadhar_card', 'pan_card', 'address']
        
        for field in updatable_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        # If deal_id is being updated, check if the new deal exists
        if 'deal_id' in data:
            cursor.execute("SELECT id FROM deals WHERE id = %s", (data['deal_id'],))
            if not cursor.fetchone():
                return jsonify({'error': 'Deal not found'}), 404
        
        update_values.append(investor_id)
        query = f"UPDATE investors SET {', '.join(update_fields)} WHERE id = %s"
        
        cursor.execute(query, update_values)
        connection.commit()
        
        return jsonify({'message': 'Investor updated successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/investors/<int:investor_id>', methods=['DELETE'])
@token_required
def delete_investor(current_user, investor_id):
    """Delete an investor"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Check if investor exists
        cursor.execute("SELECT id FROM investors WHERE id = %s", (investor_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Investor not found'}), 404
        
        # Delete investor
        cursor.execute("DELETE FROM investors WHERE id = %s", (investor_id,))
        connection.commit()
        
        return jsonify({'message': 'Investor deleted successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

# ===== END INVESTORS ENDPOINTS =====

@app.route('/api/upload', methods=['POST'])
@token_required
def upload_file(current_user):
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        deal_id = request.form.get('deal_id')
        document_type = request.form.get('document_type')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get project_name for the deal
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT project_name FROM deals WHERE id = %s", (deal_id,))
        deal = cursor.fetchone()
        project_folder_name = f"deal_{deal_id}"

        # Create folder for the deal
        deal_folder = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(project_folder_name))
        os.makedirs(deal_folder, exist_ok=True)

        filename = secure_filename(file.filename)
        filepath = os.path.join(deal_folder, filename)
        file.save(filepath)

        # Save to database
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO documents (deal_id, document_type, document_name, 
                                 file_path, file_size, uploaded_by)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            deal_id,
            document_type,
            filename,
            os.path.relpath(filepath, app.config['UPLOAD_FOLDER']),
            os.path.getsize(filepath),
            current_user
        ))
        
        connection.commit()
        
        return jsonify({'message': 'File uploaded successfully', 'filename': filename})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route('/uploads/<path:filename>')
def serve_file(filename):
    """Serve uploaded files with proper MIME types for browser viewing"""
    try:
        # resolve and ensure path is under the uploads directory to prevent traversal
        requested = os.path.normpath(filename)
        file_path = os.path.abspath(os.path.join(app.config['UPLOAD_FOLDER'], requested))
        uploads_root = os.path.abspath(app.config['UPLOAD_FOLDER'])
        if not file_path.startswith(uploads_root) or not os.path.exists(file_path):
            print(f"File not found or outside uploads: {file_path}")
            abort(404)
        
        # Get the directory and filename
        directory = os.path.dirname(file_path)
        file_name = os.path.basename(file_path)
        
        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(file_path)
        
        # Enhanced MIME type detection for common file types
        file_extension = os.path.splitext(file_name)[1].lower()
        if mime_type is None:
            mime_type_mapping = {
                '.pdf': 'application/pdf',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.txt': 'text/plain',
            }
            mime_type = mime_type_mapping.get(file_extension, 'application/octet-stream')
        
        print(f"Serving file: {filename}, MIME type: {mime_type}")
        
        # Create response with proper headers
        response = send_from_directory(
            directory, 
            file_name, 
            mimetype=mime_type,
            as_attachment=False
        )
        
        # Add headers for better browser compatibility
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        # For PDFs, ensure they open in browser
        if mime_type == 'application/pdf':
            response.headers['Content-Disposition'] = 'inline'
            response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # For images, add appropriate headers
        elif mime_type.startswith('image/'):
            response.headers['Content-Disposition'] = 'inline'
        
        return response
            
    except Exception as e:
        print(f"Error serving file {filename}: {str(e)}")
        abort(404)

# Test route to verify backend is working
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'Land Deals Backend API is running!',
        'status': 'success',
        'endpoints': [
            '/api/login',
            '/api/deals',
            '/api/upload'
        ]
    })

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'API is working correctly!'})

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get comprehensive application and database status"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'status': 'error',
                'database': 'disconnected',
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get database info
        cursor.execute("SELECT VERSION() as version")
        db_version = cursor.fetchone()['version']
        
        cursor.execute("SELECT DATABASE() as db_name")
        db_name = cursor.fetchone()['db_name']
        
        # Get table counts
        cursor.execute("SHOW TABLES")
        tables_result = cursor.fetchall()
        tables = [list(table.values())[0] for table in tables_result]
        
        table_counts = {}
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) as count FROM `{table}`")
            table_counts[table] = cursor.fetchone()['count']
        
        return jsonify({
            'status': 'success',
            'database': {
                'connected': True,
                'host': DB_CONFIG['host'],
                'database': db_name,
                'version': db_version,
                'ssl_enabled': True
            },
            'tables': table_counts,
            'message': 'Application is running successfully with cloud database connection'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'database': 'error',
            'message': f'Error: {str(e)}'
        }), 500
    finally:
        if 'connection' in locals() and connection:
            connection.close()

# Location API endpoints
@app.route('/api/locations/states', methods=['GET'])
def get_states():
    """Deprecated endpoint: states are now provided from the frontend static list.
    Return a 410 to indicate the endpoint is intentionally removed, but keep
    the route so existing clients don't break with a 404. Frontend uses
    local static data from `lib/locationAPI.js`.
    """
    return jsonify({'message': 'This endpoint is deprecated. Use local frontend data.'}), 410

@app.route('/api/locations/districts', methods=['GET'])
def get_districts():
    """Deprecated endpoint: district lookups are now handled via frontend inputs.
    Return a 410 to indicate the endpoint is intentionally removed but keep
    the route to avoid 404s for older clients.
    """
    return jsonify({'message': 'This endpoint is deprecated. Use frontend inputs.'}), 410

@app.route('/api/test-districts/<state_name>', methods=['GET'])
def test_districts_debug(state_name):
    """Debug endpoint to test district fetching for a specific state"""
    try:
        # Test postal API directly
        response = requests.get(f'https://api.postalpincode.in/postoffice/jaipur', timeout=5)
        if response.status_code == 200:
            postal_data = response.json()
            if postal_data and len(postal_data) > 0 and postal_data[0].get('Status') == 'Success':
                districts = set()
                for post_office in postal_data[0].get('PostOffice', []):
                    if post_office.get('District'):
                        districts.add(post_office['District'])
                
                return jsonify({
                    'state_requested': state_name,
                    'postal_api_working': True,
                    'districts_found': list(districts),
                    'count': len(districts)
                })
        
        return jsonify({
            'state_requested': state_name,
            'postal_api_working': False,
            'error': 'Postal API failed'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/add-sample-locations', methods=['POST'])
def add_sample_locations():
    """Add sample location data to existing deals for testing"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get deals that don't have complete location data
        cursor.execute("SELECT id, state, district FROM deals LIMIT 10")
        deals = cursor.fetchall()
        
        if not deals:
            return jsonify({'message': 'No deals found in database'})
        
        # Sample location data from different states
        sample_locations = [
            {'state': 'Maharashtra', 'district': 'Pune'},
            {'state': 'Maharashtra', 'district': 'Mumbai'},
            {'state': 'Karnataka', 'district': 'Bangalore'},
            {'state': 'Tamil Nadu', 'district': 'Chennai'},
            {'state': 'Gujarat', 'district': 'Ahmedabad'},
            {'state': 'Maharashtra', 'district': 'Thane'},
            {'state': 'Karnataka', 'district': 'Mysore'},
            {'state': 'Tamil Nadu', 'district': 'Coimbatore'},
            {'state': 'Gujarat', 'district': 'Surat'},
            {'state': 'Maharashtra', 'district': 'Nashik'}
        ]
        
        updated_count = 0
        for i, deal in enumerate(deals):
            if i < len(sample_locations):
                location = sample_locations[i]
                # Update all deals with location data regardless of current values
                cursor.execute(
                    "UPDATE deals SET state = %s, district = %s WHERE id = %s",
                    (location['state'], location['district'], deal['id'])
                )
                updated_count += 1
        
        connection.commit()
        
        return jsonify({
            'message': f'Successfully added location data to {updated_count} deals',
            'updated_deals': updated_count,
            'deals_processed': len(deals)
        })
        
    except Exception as e:
        return jsonify({'error': f'Error adding sample locations: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@app.route('/api/test-db', methods=['GET'])
def test_db():
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check users count
        cursor.execute("SELECT COUNT(*) as user_count FROM users")
        user_result = cursor.fetchone()
        
        # Check deals count and if any have state data
        cursor.execute("SELECT COUNT(*) as deal_count FROM deals")
        deal_result = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as deals_with_state FROM deals WHERE state IS NOT NULL AND state != ''")
        state_result = cursor.fetchone()
        
        # Get sample states if any exist
        cursor.execute("SELECT DISTINCT state FROM deals WHERE state IS NOT NULL AND state != '' LIMIT 5")
        sample_states = cursor.fetchall()
        
        return jsonify({
            'message': 'Database connection successful!',
            'users_in_db': user_result['user_count'],
            'deals_in_db': deal_result['deal_count'],
            'deals_with_state': state_result['deals_with_state'],
            'sample_states': [s['state'] for s in sample_states]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            if connection:
                connection.close()
        except Exception:
            pass


@app.route('/api/admin/users', methods=['GET'])
@token_required
def admin_list_users(current_user):
    # only allow admin role
    try:
        if request.user.get('role') != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
    except Exception:
        return jsonify({'error': 'Forbidden'}), 403

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, username, role, full_name FROM users ORDER BY id")
        rows = cur.fetchall() or []
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/admin/users', methods=['POST'])
@token_required
def admin_create_user(current_user):
    try:
        if request.user.get('role') != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
    except Exception:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')
    full_name = data.get('full_name', '')

    # sanitize role to known allowed values to avoid DB truncation or invalid enum values
    try:
        role = (role or 'user').strip().lower()
    except Exception:
        role = 'user'
    allowed_roles = {'user', 'admin', 'auditor'}
    if role not in allowed_roles:
        role = 'user'

    # limit lengths to reasonable sizes to avoid column truncation
    if isinstance(full_name, str):
        full_name = full_name.strip()[:255]
    else:
        full_name = str(full_name)[:255]

    if not username or not password:
        return jsonify({'error': 'username and password required'}), 400

    # hash password
    try:
        hashed = generate_password_hash(password)
    except Exception:
        hashed = password

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('INSERT INTO users (username, password, role, full_name) VALUES (%s, %s, %s, %s)', (username, hashed, role, full_name))
        conn.commit()
        return jsonify({'message': 'user created'}), 201
    except mysql.connector.IntegrityError as e:
        # duplicate username
        return jsonify({'error': 'username already exists'}), 400
    except mysql.connector.DataError as e:
        # catch truncation / data errors and return helpful message
        return jsonify({'error': 'Invalid input: data too long or malformed'}), 400
    except Exception as e:
        # MySQL sometimes reports truncation as general errors — attempt to surface clearer message
        msg = str(e)
        if 'Data truncated for column' in msg or '1265' in msg:
            return jsonify({'error': 'Invalid input: role or other field truncated'}), 400
        return jsonify({'error': msg}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@token_required
def admin_update_user(current_user, user_id):
    try:
        if request.user.get('role') != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
    except Exception:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    role = data.get('role')
    full_name = data.get('full_name')
    password = data.get('password')

    updates = []
    params = []
    if role is not None:
        # sanitize incoming role
        try:
            r = (role or '').strip().lower()
        except Exception:
            r = 'user'
        if r not in {'user', 'admin', 'auditor'}:
            r = 'user'
        updates.append('role = %s')
        params.append(r)
    if full_name is not None:
        if isinstance(full_name, str):
            fn = full_name.strip()[:255]
        else:
            fn = str(full_name)[:255]
        updates.append('full_name = %s')
        params.append(fn)
    if password is not None:
        try:
            hashed = generate_password_hash(password)
        except Exception:
            hashed = password
        updates.append('password = %s')
        params.append(hashed)

    if not updates:
        return jsonify({'error': 'nothing to update'}), 400

    params.append(user_id)
    sql = 'UPDATE users SET ' + ', '.join(updates) + ' WHERE id = %s'

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        conn.commit()
        return jsonify({'message': 'user updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@token_required
def admin_delete_user(current_user, user_id):
    try:
        if request.user.get('role') != 'admin':
            return jsonify({'error': 'Forbidden'}), 403
    except Exception:
        return jsonify({'error': 'Forbidden'}), 403

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('DELETE FROM users WHERE id = %s', (user_id,))
        conn.commit()
        return jsonify({'message': 'user deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()
    

if __name__ == '__main__':
    app.run(debug=True, port=5000)