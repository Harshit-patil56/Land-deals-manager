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

-- Create normalized location tables if they do not exist
CREATE TABLE IF NOT EXISTS states (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS districts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
    UNIQUE KEY uk_state_district (state_id, name)
);

-- Alter deals table to add legacy textual and normalized location references if missing
ALTER TABLE deals
    ADD COLUMN IF NOT EXISTS state VARCHAR(100),
    ADD COLUMN IF NOT EXISTS district VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_id INT,
    ADD COLUMN IF NOT EXISTS district_id INT;

-- Add foreign keys if they do not exist (MySQL doesn't support IF NOT EXISTS for FK; these statements
-- are safe to run on a fresh DB and may need manual check on some MySQL versions if FK already exists.)
ALTER TABLE deals ADD CONSTRAINT fk_deals_state_id FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE SET NULL;
ALTER TABLE deals ADD CONSTRAINT fk_deals_district_id FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL;

-- Seed states table with Indian states/UTs (idempotent insert)
INSERT IGNORE INTO states (name) VALUES
('Andaman and Nicobar Islands'),('Andhra Pradesh'),('Arunachal Pradesh'),('Assam'),('Bihar'),
('Chandigarh'),('Chhattisgarh'),('Dadra and Nagar Haveli and Daman and Diu'),('Delhi'),('Goa'),
('Gujarat'),('Haryana'),('Himachal Pradesh'),('Jammu and Kashmir'),('Jharkhand'),('Karnataka'),
('Kerala'),('Ladakh'),('Lakshadweep'),('Madhya Pradesh'),('Maharashtra'),('Manipur'),('Meghalaya'),
('Mizoram'),('Nagaland'),('Odisha'),('Puducherry'),('Punjab'),('Rajasthan'),('Sikkim'),('Tamil Nadu'),
('Telangana'),('Tripura'),('Uttar Pradesh'),('Uttarakhand'),('West Bengal');

-- NOTE: District seeding is intentionally left out to avoid an overly large script; import districts via a separate migration
-- or populate from the frontend mapping data if desired.
