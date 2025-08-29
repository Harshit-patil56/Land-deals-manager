-- Add payment_type column to payments table
ALTER TABLE payments 
ADD COLUMN payment_type ENUM('land_purchase', 'investment_sale', 'documentation_legal', 'other') DEFAULT 'other'
AFTER amount;
