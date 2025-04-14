/*
  # Create WhatsApp connections table

  1. New Tables
    - `whatsapp_connections`
      - `id` (uuid, primary key)
      - `is_connected` (boolean)
      - `device_name` (text)
      - `device_number` (text)
      - `qr_code` (text)
      - `auth_file` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_connected boolean DEFAULT false,
  device_name text,
  device_number text,
  qr_code text,
  auth_file text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read connections"
  ON whatsapp_connections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create connections"
  ON whatsapp_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update connections"
  ON whatsapp_connections
  FOR UPDATE
  TO authenticated
  USING (true);