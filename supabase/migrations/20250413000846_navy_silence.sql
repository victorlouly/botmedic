/*
  # WhatsApp Connection Storage

  1. New Tables
    - `whatsapp_connections`
      - `id` (uuid, primary key)
      - `is_connected` (boolean) - Current connection status
      - `device_name` (text) - Name of the connected device
      - `device_number` (text) - Phone number of the connected device
      - `qr_code` (text) - Current QR code for connection
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `whatsapp_connections` table
    - Add policy for authenticated users to read/write their own data
*/

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_connected boolean DEFAULT false,
  device_name text,
  device_number text,
  qr_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read whatsapp connections"
  ON whatsapp_connections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update whatsapp connections"
  ON whatsapp_connections
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can insert whatsapp connections"
  ON whatsapp_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (true);