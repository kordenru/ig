import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// Path to the CSV file in Netlify function environment
const filePath = path.resolve('/tmp/subscribers.csv');

// Ensure the CSV file exists in /tmp directory
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, 'email\n');
}

// Configure email transporter (use environment variables for sensitive info)
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER, // Environment variable for email
    pass: process.env.EMAIL_PASS, // Environment variable for password
  },
});

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email } = JSON.parse(event.body);

  try {
    // Append the email to the CSV file in /tmp
    fs.appendFileSync(filePath, `${email}\n`);

    // Read all subscribers
    const subscribers = fs.readFileSync(filePath, 'utf-8').split('\n').slice(1).filter(Boolean);
    const totalSubscribers = subscribers.length;

    // Send an email notification to the owner
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Owner's email
      subject: 'New Subscriber Notification',
      text: `You have a new subscriber: ${email}\n\nTotal subscribers: ${totalSubscribers}`,
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscription successful' }),
    };
  } catch (error) {
    console.error('Error handling subscription:', error);
    return {
      statusCode: 500,
      body: 'An error occurred while processing your request.',
    };
  }
}