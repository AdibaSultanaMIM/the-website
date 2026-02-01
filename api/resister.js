import mysql from 'mysql2/promise';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // CORS for GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', 'https://prothomaa.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { name, email, phone, institution, topic } = req.body || {};

  if (!name || !email || !phone || !institution || !topic) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);

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

    await connection.execute(
      'INSERT INTO registrations (name, email, phone, institution, topic) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, institution, topic]
    );

    await resend.emails.send({
      from: 'WE-ICT Workshop <onboarding@resend.dev>',
      to: email,
      subject: 'WE-ICT 2026 Registration Confirmed',
      html: `<p>Dear ${name},</p>
             <p>Your registration for <strong>WE-ICT 2026</strong> (${topic}) has been received.</p>
             <p>Venue: BUET, Dhaka · Date: February 24, 2026.</p>`
    });

    await connection.end();
    return res.status(200).json({ message: 'Success' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
}
