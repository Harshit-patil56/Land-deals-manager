# app.py - Main Flask Application
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import mysql.connector
from datetime import datetime, timedelta
import jwt
import os
from functools import wraps
import json

app = Flask(__name__)
app.static_folder = 'uploads'
app.static_url_path = '/uploads'
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = 'uploads'
CORS(app, origins=['http://localhost:3000'], supports_credentials=True, methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

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
            INSERT INTO deals (project_name, survey_number, location, district, 
                             taluka, village, total_area, purchase_date, 
                             purchase_amount, selling_amount, created_by, status, payment_mode, mutation_done, profit_allocation)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('project_name'),
            data.get('survey_number'),
            data.get('location'),
            data.get('district'),
            data.get('taluka'),
            data.get('village'),
            total_area,
            data.get('purchase_date'),
            purchase_amount,
            selling_amount,
            current_user,
            data.get('status'),
            data.get('payment_mode'),
            data.get('mutation_done'),
            data.get('profit_allocation')
        ))
        deal_id = cursor.lastrowid
        # Insert owners
        owners = data.get('owners', [])
        for owner in owners:
            if owner.get('name'):
                cursor.execute("""
                    INSERT INTO owners (deal_id, name, photo, aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    owner.get('name'),
                    owner.get('photo'),
                    owner.get('aadhar_card'),
                    owner.get('pan_card')
                ))

        # Insert buyers
        buyers = data.get('buyers', [])
        for buyer in buyers:
            if buyer.get('name'):
                cursor.execute("""
                    INSERT INTO buyers (deal_id, name, photo, aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    buyer.get('name'),
                    buyer.get('photo'),
                    buyer.get('aadhar_card'),
                    buyer.get('pan_card')
                ))
        
        # Insert investors
        investors = data.get('investors', [])
        for investor in investors:
            if investor.get('investor_name'):
                cursor.execute("""
                    INSERT INTO investors (deal_id, investor_name, investment_amount, 
                                         investment_percentage, phone, email, 
                                         aadhar_card, pan_card)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    investor.get('investor_name'),
                    investor.get('investment_amount'),
                    investor.get('investment_percentage'),
                    investor.get('phone'),
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

@app.route('/api/test-db', methods=['GET'])
def test_db():
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) as user_count FROM users")
        result = cursor.fetchone()
        
        return jsonify({
            'message': 'Database connection successful!',
            'users_in_db': result[0]
        })
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)