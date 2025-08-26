#!/usr/bin/env python3
"""
Setup script for Land Deals Manager - Local Development
This script helps set up environment variables for local development
"""

import os
from pathlib import Path

def setup_environment():
    """Create .env file for local development"""
    env_file = Path('.env')
    env_example = Path('.env.example')
    
    if env_file.exists():
        print("✓ .env file already exists")
        return
    
    if not env_example.exists():
        print("✗ .env.example file not found")
        return
    
    try:
        # Copy .env.example to .env
        with open(env_example, 'r') as example:
            content = example.read()
        
        with open(env_file, 'w') as env:
            env.write(content)
        
        print("✓ Created .env file from .env.example")
        print("⚠ Please update the .env file with your actual database credentials")
        print("⚠ Never commit the .env file to version control")
        
    except Exception as e:
        print(f"✗ Error creating .env file: {e}")

def check_requirements():
    """Check if required packages are installed"""
    required_packages = [
        'flask',
        'flask-cors', 
        'mysql-connector-python',
        'PyJWT',
        'requests'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("⚠ Missing required packages:")
        for package in missing_packages:
            print(f"  - {package}")
        print("\nRun: pip install " + " ".join(missing_packages))
    else:
        print("✓ All required packages are installed")

if __name__ == "__main__":
    print("=== Land Deals Manager - Local Development Setup ===\n")
    
    setup_environment()
    print()
    check_requirements()
    
    print("\n=== Next Steps ===")
    print("1. Update .env file with your database credentials")
    print("2. Run: python test_connection.py (to test database connection)")
    print("3. Run: python app.py (to start the Flask application)")
