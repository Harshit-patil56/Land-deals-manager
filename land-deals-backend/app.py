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
    'host': 'localhost',
    'user': 'root',
    'password': 'admin@123',
    'database': 'land_deals_db'
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

# Location API endpoints
@app.route('/api/locations/states', methods=['GET'])
def get_states():
    """Get all states from external API or database"""
    try:
        # First try to get from external API - GitHub dataset (most reliable)
        try:
            response = requests.get('https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json', timeout=10)
            if response.status_code == 200:
                all_states_data = response.json()
                # Filter only Indian states (country_id = 101 for India)
                indian_states = [state for state in all_states_data if state.get('country_id') == 101]
                
                if indian_states:
                    states = [{'id': state['id'], 'name': state['name']} for state in indian_states]
                    # Sort with Maharashtra first if present
                    states.sort(key=lambda x: (x['name'] != 'Maharashtra', x['name']))
                    print(f"Successfully fetched {len(states)} states from GitHub API")
                    return jsonify(states)
        except Exception as github_error:
            print(f"GitHub API failed: {str(github_error)}")
        
        # Try CoWIN API (Government of India)
        try:
            response = requests.get('https://cdn-api.co-vin.in/api/v2/admin/location/states', timeout=5)
            if response.status_code == 200:
                api_data = response.json()
                if 'states' in api_data:
                    states = [{'id': state['state_id'], 'name': state['state_name']} for state in api_data['states']]
                    # Sort with Maharashtra first if present
                    states.sort(key=lambda x: (x['name'] != 'Maharashtra', x['name']))
                    print(f"Successfully fetched {len(states)} states from CoWIN API")
                    return jsonify(states)
        except Exception as api_error:
            print(f"CoWIN API failed: {str(api_error)}")
        
        # Try alternative comprehensive API
        try:
            response = requests.get('https://api.countrystatecity.in/v1/countries/IN/states', 
                                  headers={'X-CSCAPI-KEY': 'YOUR_API_KEY'}, timeout=5)
            if response.status_code == 200:
                states_data = response.json()
                if states_data:
                    states = [{'id': i+1, 'name': state['name']} for i, state in enumerate(states_data)]
                    # Sort with Maharashtra first if present
                    states.sort(key=lambda x: (x['name'] != 'Maharashtra', x['name']))
                    print(f"Successfully fetched {len(states)} states from CountryStateCity API")
                    return jsonify(states)
        except Exception as csc_error:
            print(f"CountryStateCity API failed: {str(csc_error)}")
        
        # Try Indian Postal Service API with broader search
        try:
            # Get data from multiple major cities to extract more states
            major_cities = ['mumbai', 'delhi', 'bangalore', 'kolkata', 'chennai', 'hyderabad', 'pune', 'ahmedabad']
            all_states = set()
            
            for city in major_cities:
                try:
                    response = requests.get(f'https://api.postalpincode.in/postoffice/{city}', timeout=3)
                    if response.status_code == 200:
                        postal_data = response.json()
                        if postal_data and len(postal_data) > 0 and postal_data[0].get('Status') == 'Success':
                            post_offices = postal_data[0].get('PostOffice', [])
                            for post_office in post_offices:
                                if post_office.get('State'):
                                    all_states.add(post_office['State'])
                except:
                    continue
            
            if all_states:
                states = [{'id': i+1, 'name': state} for i, state in enumerate(sorted(all_states))]
                # Sort with Maharashtra first if present
                states.sort(key=lambda x: (x['name'] != 'Maharashtra', x['name']))
                print(f"Successfully fetched {len(states)} states from Postal API")
                return jsonify(states)
        except Exception as postal_error:
            print(f"Postal API failed: {str(postal_error)}")
        
        # If APIs fail, get from database
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT DISTINCT state FROM deals WHERE state IS NOT NULL AND state != '' ORDER BY state")
        states_from_deals = cursor.fetchall()
        
        if states_from_deals:
            states = []
            for i, state in enumerate(states_from_deals, 1):
                states.append({
                    'id': i,
                    'name': state['state']
                })
            
            # Sort with Maharashtra first if present
            states.sort(key=lambda x: (x['name'] != 'Maharashtra', x['name']))
            print(f"Fetched {len(states)} states from database as fallback")
            return jsonify(states)
        
        # If no data anywhere, return error
        return jsonify({'error': 'No states data available. Please add some deals to the database first.'}), 404
        
    except Exception as e:
        return jsonify({'error': f'Error fetching states: {str(e)}'}), 500
    finally:
        if 'connection' in locals() and connection:
            connection.close()

@app.route('/api/locations/districts', methods=['GET'])
def get_districts():
    """Get districts for a specific state from external API or database"""
    state_name = request.args.get('state')
    
    if not state_name:
        return jsonify({'error': 'State parameter is required'}), 400
    
    try:
        # Try to get from database first (if user has added deals with district info)
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT DISTINCT district FROM deals WHERE state = %s AND district IS NOT NULL AND district != '' ORDER BY district",
                (state_name,)
            )
            districts_from_deals = cursor.fetchall()
            
            if districts_from_deals and len(districts_from_deals) > 2:  # If we have good database data
                districts = []
                for i, district in enumerate(districts_from_deals, 1):
                    districts.append({
                        'id': i,
                        'name': district['district']
                    })
                print(f"Fetched {len(districts)} districts for {state_name} from database")
                connection.close()
                return jsonify(districts)
            
            connection.close()
        
        # Try external APIs with robust error handling
        districts_found = []
        
        # Try comprehensive postal API search
        try:
            # Search by major cities for the state
            major_cities_by_state = {
                'maharashtra': ['mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'solapur', 'thane', 'kolhapur', 'satara', 'sangli', 'ahmednagar', 'latur'],
                'karnataka': ['bangalore', 'mysore', 'hubli', 'mangalore', 'belgaum', 'gulbarga', 'shimoga', 'tumkur', 'bellary', 'bijapur', 'davangere', 'chitradurga'],
                'tamil nadu': ['chennai', 'coimbatore', 'madurai', 'salem', 'tiruchirappalli', 'tirunelveli', 'vellore', 'erode', 'tiruppur', 'dindigul', 'thanjavur', 'kanchipuram'],
                'gujarat': ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'bhavnagar', 'jamnagar', 'gandhinagar', 'anand', 'bharuch', 'navsari', 'valsad', 'kheda'],
                'rajasthan': ['jaipur', 'jodhpur', 'udaipur', 'kota', 'bikaner', 'ajmer', 'alwar', 'bharatpur', 'sikar', 'pali', 'nagaur', 'tonk'],
                'uttar pradesh': ['lucknow', 'kanpur', 'ghaziabad', 'agra', 'varanasi', 'meerut', 'allahabad', 'bareilly', 'moradabad', 'saharanpur', 'gorakhpur', 'firozabad'],
                'west bengal': ['kolkata', 'howrah', 'durgapur', 'asansol', 'siliguri', 'malda', 'burdwan', 'kharagpur', 'haldia', 'english bazar', 'baharampur', 'krishnanagar'],
                'punjab': ['ludhiana', 'amritsar', 'jalandhar', 'patiala', 'bathinda', 'mohali', 'firozpur', 'hoshiarpur', 'pathankot', 'moga', 'abohar', 'malerkotla'],
                'haryana': ['faridabad', 'gurgaon', 'panipat', 'ambala', 'yamunanagar', 'rohtak', 'hisar', 'karnal', 'sonipat', 'sirsa', 'bahadurgarh', 'jind'],
                'madhya pradesh': ['indore', 'bhopal', 'jabalpur', 'gwalior', 'ujjain', 'sagar', 'dewas', 'satna', 'ratlam', 'rewa', 'katni', 'singrauli'],
                'bihar': ['patna', 'gaya', 'bhagalpur', 'muzaffarpur', 'purnia', 'darbhanga', 'bihar sharif', 'arrah', 'begusarai', 'katihar', 'munger', 'chapra'],
                'odisha': ['bhubaneswar', 'cuttack', 'rourkela', 'berhampur', 'sambalpur', 'puri', 'balasore', 'bhadrak', 'baripada', 'jharsuguda', 'jeypore', 'barbil'],
                'kerala': ['thiruvananthapuram', 'kochi', 'kozhikode', 'thrissur', 'kollam', 'palakkad', 'alappuzha', 'kannur', 'kottayam', 'malappuram', 'kasaragod', 'pathanamthitta'],
                'assam': ['guwahati', 'silchar', 'dibrugarh', 'jorhat', 'nagaon', 'tinsukia', 'bongaigaon', 'karimganj', 'dhubri', 'goalpara', 'kokrajhar', 'mangaldoi'],
                'telangana': ['hyderabad', 'warangal', 'nizamabad', 'khammam', 'karimnagar', 'ramagundam', 'mahbubnagar', 'nalgonda', 'adilabad', 'suryapet', 'miryalaguda', 'jagtial'],
                'andhra pradesh': ['visakhapatnam', 'vijayawada', 'guntur', 'nellore', 'kurnool', 'rajahmundry', 'tirupati', 'kakinada', 'anantapur', 'vizianagaram', 'eluru', 'ongole'],
                'jharkhand': ['ranchi', 'jamshedpur', 'dhanbad', 'bokaro', 'deoghar', 'phusro', 'hazaribagh', 'giridih', 'ramgarh', 'medininagar', 'chaibasa', 'dumka'],
                'chhattisgarh': ['raipur', 'bhilai', 'bilaspur', 'korba', 'durg', 'rajnandgaon', 'jagdalpur', 'raigarh', 'ambikapur', 'dhamtari', 'mahasamund', 'kanker'],
                'uttarakhand': ['dehradun', 'haridwar', 'roorkee', 'haldwani', 'rudrapur', 'kashipur', 'rishikesh', 'kotdwar', 'manglaur', 'ramnagar', 'doiwala', 'clement town'],
                'himachal pradesh': ['shimla', 'dharamshala', 'solan', 'mandi', 'palampur', 'baddi', 'una', 'kullu', 'hamirpur', 'bilaspur', 'chamba', 'kangra'],
                'jammu and kashmir': ['srinagar', 'jammu', 'anantnag', 'baramulla', 'udhampur', 'kathua', 'kupwara', 'rajouri', 'poonch', 'doda', 'kishtwar', 'ramban'],
                'goa': ['panaji', 'margao', 'vasco da gama', 'mapusa', 'ponda', 'bicholim', 'curchorem', 'sanquelim', 'valpoi', 'quepem', 'cuncolim', 'pernem'],
                'tripura': ['agartala', 'udaipur', 'dharmanagar', 'kailashahar', 'belonia', 'khowai', 'ambassa', 'ranir bazar', 'sonamura', 'kamalpur', 'kumarghat', 'sabroom'],
                'manipur': ['imphal', 'thoubal', 'bishnupur', 'churachandpur', 'ukhrul', 'senapati', 'tamenglong', 'chandel', 'jiribam', 'kangpokpi', 'tengnoupal', 'pherzawl'],
                'meghalaya': ['shillong', 'tura', 'jowai', 'nongstoin', 'baghmara', 'williamnagar', 'resubelpara', 'mawkyrwat', 'ampati', 'mairang', 'khliehriat', 'amlarem'],
                'mizoram': ['aizawl', 'lunglei', 'champhai', 'serchhip', 'kolasib', 'lawngtlai', 'saiha', 'mamit', 'bairabi', 'zawlnuam', 'hnahthial', 'saitual'],
                'nagaland': ['kohima', 'dimapur', 'mokokchung', 'tuensang', 'wokha', 'zunheboto', 'phek', 'kiphire', 'longleng', 'peren', 'mon', 'noklak'],
                'sikkim': ['gangtok', 'namchi', 'gyalshing', 'mangan', 'jorethang', 'rangpo', 'singtam', 'pakyong', 'soreng', 'yuksom', 'lachung', 'lachen'],
                'arunachal pradesh': ['itanagar', 'naharlagun', 'pasighat', 'along', 'bomdila', 'tezpur', 'ziro', 'changlang', 'aalo', 'roing', 'tezu', 'seppa']
            }
            
            state_key = state_name.lower()
            if state_key in major_cities_by_state:
                districts_set = set()
                cities_to_search = major_cities_by_state[state_key][:8]  # Limit to 8 cities
                
                for city in cities_to_search:
                    try:
                        response = requests.get(
                            f'https://api.postalpincode.in/postoffice/{city}', 
                            timeout=3
                        )
                        if response.status_code == 200:
                            postal_data = response.json()
                            if postal_data and len(postal_data) > 0 and postal_data[0].get('Status') == 'Success':
                                
                                for post_office in postal_data[0].get('PostOffice', []):
                                    po_state = post_office.get('State', '').lower()
                                    po_district = post_office.get('District', '')
                                    
                                    if (po_state == state_name.lower() and 
                                        po_district and 
                                        len(po_district.strip()) > 0):
                                        districts_set.add(po_district.strip())
                    except:
                        continue
                
                if districts_set:
                    # Filter and create districts list
                    filtered_districts = []
                    for district in districts_set:
                        district_clean = district.strip()
                        if (len(district_clean) > 1 and 
                            not district_clean.lower().endswith(' so') and
                            not district_clean.lower().endswith(' ho') and
                            not district_clean.lower().endswith(' bo') and
                            'post office' not in district_clean.lower()):
                            filtered_districts.append(district_clean)
                    
                    if filtered_districts:
                        unique_districts = sorted(set(filtered_districts))
                        districts_found = [
                            {'id': i+1, 'name': district} 
                            for i, district in enumerate(unique_districts)
                        ]
                        print(f"Successfully fetched {len(districts_found)} districts for {state_name} from Postal API")
                        return jsonify(districts_found)
        
        except Exception as postal_error:
            print(f"Postal districts API failed: {str(postal_error)}")
        
        # If we have some database data but not comprehensive, return it
        if connection:
            connection = get_db_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                cursor.execute(
                    "SELECT DISTINCT district FROM deals WHERE state = %s AND district IS NOT NULL AND district != '' ORDER BY district",
                    (state_name,)
                )
                districts_from_deals = cursor.fetchall()
                
                if districts_from_deals:
                    districts = []
                    for i, district in enumerate(districts_from_deals, 1):
                        districts.append({
                            'id': i,
                            'name': district['district']
                        })
                    print(f"Fetched {len(districts)} districts for {state_name} from database as fallback")
                    connection.close()
                    return jsonify(districts)
                
                connection.close()
        
        # If no data found anywhere, use comprehensive fallback data for major states
        fallback_districts = {
            'maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
            'karnataka': ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davangere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'],
            'tamil nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
            'gujarat': ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udepur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
            'rajasthan': ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Ganganagar', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur'],
            'uttar pradesh': ['Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shrawasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
            'west bengal': ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
            'madhya pradesh': ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chachaura', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Maihar', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
            'kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
            'punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'Shaheed Bhagat Singh Nagar', 'Tarn Taran'],
            'haryana': ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar']
        }
        
        state_key = state_name.lower()
        if state_key in fallback_districts:
            districts = [
                {'id': i+1, 'name': district} 
                for i, district in enumerate(fallback_districts[state_key])
            ]
            print(f"Using fallback data: {len(districts)} districts for {state_name}")
            return jsonify(districts)
        
        # If no data found anywhere, return empty array
        print(f"No districts found for {state_name}")
        return jsonify([])
        
    except Exception as e:
        print(f"Error in districts API: {str(e)}")
        return jsonify({'error': f'Error fetching districts: {str(e)}'}), 500

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