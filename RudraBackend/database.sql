-- Create users table
CREATE TABLE USERS_TABLE (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_code VARCHAR(255),
    otp VARCHAR(6),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON USERS_TABLE(email);

-- Create index on verification_code for faster verification
CREATE INDEX idx_users_verification_code ON USERS_TABLE(verification_code);

-- Create index on reset_token for faster password resets
CREATE INDEX idx_users_reset_token ON USERS_TABLE(reset_token);

-- Add a check constraint to ensure OTP is exactly 6 digits
ALTER TABLE USERS_TABLE ADD CONSTRAINT chk_otp_format CHECK (otp ~ '^[0-9]{6}$');

-- Add trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON USERS_TABLE
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();