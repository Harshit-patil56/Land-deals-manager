#!/usr/bin/env python3
"""
Script to systematically add database connection checks to all functions in app.py
"""
import re

def fix_db_connections():
    with open('land-deals-backend/app.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to find: get_db_connection() followed immediately by cursor creation
    # Replace with: get_db_connection() + None check + cursor creation
    
    patterns = [
        # Pattern 1: dictionary=True cursor
        (
            r'(\s+)conn = get_db_connection\(\)\n(\s+)cursor = conn\.cursor\(dictionary=True\)',
            r'\1conn = get_db_connection()\n\1if not conn:\n\1    return jsonify({\'error\': \'Database connection failed\'}), 500\n\2cursor = conn.cursor(dictionary=True)'
        ),
        # Pattern 2: regular cursor
        (
            r'(\s+)conn = get_db_connection\(\)\n(\s+)cursor = conn\.cursor\(\)',
            r'\1conn = get_db_connection()\n\1if not conn:\n\1    return jsonify({\'error\': \'Database connection failed\'}), 500\n\2cursor = conn.cursor()'
        )
    ]
    
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
    
    with open('land-deals-backend/app.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Fixed database connection checks in app.py")

if __name__ == '__main__':
    fix_db_connections()
