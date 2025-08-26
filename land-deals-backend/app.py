# app.py - Main Flask Application
from flask import Flask, request, jsonify, session, send_from_directory, abort
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import mysql.connector
from datetime import datetime, timedelta
import jwt
import os
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
app.config['UPLOAD_FOLDER'] = 'uploads'
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
            current_user = data['user_id']
        except:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# Routes

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
        
        if user and password == user['password']:  # In production, use hashed passwords
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

    # DELETE route for deals
@app.route('/api/deals/<int:deal_id>', methods=['DELETE'])
@token_required
def delete_deal(current_user, deal_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("DELETE FROM deals WHERE id = %s", (deal_id,))
        connection.commit()
        return jsonify({'message': 'Deal deleted successfully'})
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

        # Insert deal with new fields
        cursor.execute("""
            INSERT INTO deals (project_name, survey_number, location, state, district, 
                             taluka, village, total_area, area_unit, purchase_date, 
                             purchase_amount, selling_amount, created_by, status, payment_mode, profit_allocation)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            data.get('profit_allocation')
        ))
        deal_id = cursor.lastrowid
        # Insert owners
        owners = data.get('owners', [])
        for owner in owners:
            if owner.get('name'):
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
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Security check - ensure file exists and is within uploads directory
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
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
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
            connection.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)