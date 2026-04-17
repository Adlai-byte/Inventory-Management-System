-- Migration: Add username column to inv_users
-- Run this SQL against your bmm_db database

-- Add username column after id
ALTER TABLE inv_users ADD COLUMN username VARCHAR(100) UNIQUE AFTER id;

-- Update existing admin user with username
UPDATE inv_users SET username = 'admin' WHERE email = 'admin@bastistil.com' OR full_name = 'Admin';

-- Make username NOT NULL after populating existing users
ALTER TABLE inv_users MODIFY COLUMN username VARCHAR(100) NOT NULL;
