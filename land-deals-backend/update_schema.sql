-- SQL script to update database schema
-- Run this script to update existing tables with new fields

-- Update owners table
ALTER TABLE owners 
DROP COLUMN photo,
ADD COLUMN mobile VARCHAR(10) AFTER name,
ADD COLUMN email VARCHAR(100) AFTER mobile;

-- Update buyers table  
ALTER TABLE buyers
DROP COLUMN photo,
ADD COLUMN mobile VARCHAR(10) AFTER name,
ADD COLUMN email VARCHAR(100) AFTER mobile;

-- Update investors table (rename phone to mobile)
ALTER TABLE investors 
CHANGE COLUMN phone mobile VARCHAR(10);

-- If tables don't exist, create them with new schema
CREATE TABLE IF NOT EXISTS owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(10),
    email VARCHAR(100),
    aadhar_card VARCHAR(14),
    pan_card VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS buyers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(10),
    email VARCHAR(100),
    aadhar_card VARCHAR(14),
    pan_card VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS investors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    investor_name VARCHAR(100) NOT NULL,
    investment_amount DECIMAL(15,2),
    investment_percentage DECIMAL(5,2),
    mobile VARCHAR(10),
    email VARCHAR(100),
    aadhar_card VARCHAR(14),
    pan_card VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);
