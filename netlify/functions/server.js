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

    // Log before sending the email
    console.log("Attempting to send email...");
    const emailResponse = await transporter.sendMail(mailOptions);
    console.log("Email sent:", emailResponse);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `<div style="text-align: center; font-family: Arial;">
               <h2>Thank you for subscribing!</h2>
               <p>We will notify you when our website launches.</p>
             </div>`,
    };
  } catch (error) {
    console.error('Error handling subscription:', error);

    // Return an HTML error response
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `<div style="text-align: center; font-family: Arial; color: red;">
               <h2>Error</h2>
               <p>There was an issue processing your subscription. Please try again later.</p>
             </div>`,
    };
  }
}
