import mysql from 'mysql2/promise';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
res.setHeader('Access-Control-Allow-Origin', '*');
export default async function handler(req, res) {
  // 1. UNIVERSAL CORS HEADERS (Allows all domains for testing)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight "OPTIONS" request (used by browsers to check security)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests for registration
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, email, phone, institution, topic } = req.body || {};

  // Validate that all fields are present
  if (!name || !email || !phone || !institution || !topic) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let connection;

  try {
    // 2. CONNECT TO DATABASE
    // Ensure DATABASE_URL is set in Vercel Environment Variables
    connection = await mysql.createConnection(process.env.DATABASE_URL);

    // 3. AUTO-CREATE TABLE (Self-healing logic)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        institution VARCHAR(255),
        topic VARCHAR(100),
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. INSERT DATA
    await connection.execute(
      'INSERT INTO registrations (name, email, phone, institution, topic) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, institution, topic]
    );

    // 5. SEND CONFIRMATION EMAIL
    // Ensure RESEND_API_KEY is set in Vercel Environment Variables
    await resend.emails.send({
      from: 'WE-ICT Workshop <onboarding@resend.dev>',
      to: email,
      subject: 'WE-ICT 2026 Registration Confirmed',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Registration Successful!</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>You have successfully registered for the workshop session: <strong>${topic}</strong>.</p>
          <p><strong>Venue:</strong> BUET, Dhaka</p>
          <p><strong>Date:</strong> February 24, 2026</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">This is an automated confirmation from the WE-ICT 2026 team.</p>
        </div>
      `
    });

    return res.status(200).json({ message: 'Registration successful' });

  } catch (error) {
    console.error('SERVER ERROR:', error);
    return res.status(500).json({ error: 'Database or Email Service Error', details: error.message });
  } finally {
    // 6. ALWAYS CLOSE CONNECTION
    if (connection) await connection.end();
  }
}
