-- Add payment target tracking fields to payment_parties table
-- This supports the "who pays to whom" functionality

-- Add the new fields to payment_parties table
ALTER TABLE payment_parties 
ADD COLUMN pay_to_id INT NULL AFTER role,
ADD COLUMN pay_to_name VARCHAR(100) NULL AFTER pay_to_id,
ADD COLUMN pay_to_type ENUM('owner', 'buyer', 'investor', 'other') NULL AFTER pay_to_name;

-- Add index for better performance on pay_to_id lookups
CREATE INDEX idx_pay_to_id ON payment_parties(pay_to_id);

-- Add comments to describe the new fields
ALTER TABLE payment_parties 
MODIFY COLUMN pay_to_id INT NULL COMMENT 'ID of the person receiving/paying the money',
MODIFY COLUMN pay_to_name VARCHAR(100) NULL COMMENT 'Name of the person receiving/paying the money',
MODIFY COLUMN pay_to_type ENUM('owner', 'buyer', 'investor', 'other') NULL COMMENT 'Type of the payment target person';
