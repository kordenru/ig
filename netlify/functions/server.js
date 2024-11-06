import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import axios from 'axios';

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

// Function to verify reCAPTCHA
async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Access the secret key from environment variables

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify', null, {
        params: {
          secret: secretKey,
          response: token,
        },
      }
    );
    return response.data.success;
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return false;
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let email, recaptchaToken;

  try {
    // Parse the request body to extract email and reCAPTCHA token
    const { email: parsedEmail, 'g-recaptcha-response': parsedToken } = JSON.parse(event.body);
    email = parsedEmail;
    recaptchaToken = parsedToken;

    if (!email || !recaptchaToken) throw new Error("Missing email or reCAPTCHA token");

    console.log("Parsed email:", email);
  } catch (error) {
    console.error('Error parsing request body:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Invalid request format or missing data.' }),
    };
  }

  // Verify reCAPTCHA
  const isHuman = await verifyRecaptcha(recaptchaToken);
  if (!isHuman) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'reCAPTCHA verification failed.' }) };
  }

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
