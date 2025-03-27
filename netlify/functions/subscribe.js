import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

export const handler = async (event) => {
  // Cors headers for cross-origin support
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Verify request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { email, 'g-recaptcha-response': token } = JSON.parse(event.body);

    // Validate email
    if (!isValidEmail(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email address' })
      };
    }

    // Verify reCAPTCHA
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (!recaptchaSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'reCAPTCHA secret key not configured' })
      };
    }

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${token}`;
    
    const recaptchaResponse = await fetch(verifyUrl);
    const recaptchaData = await recaptchaResponse.json();

    // Validate reCAPTCHA
    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'reCAPTCHA verification failed' })
      };
    }

    // Configure email transport
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send notification email to admin
    await transporter.sendMail({
      from: `"Website Subscription" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'New Website Subscription',
      html: `
        <h1>New Subscriber!</h1>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subscribed at:</strong> ${new Date().toLocaleString()}</p>
      `
    });

    // Optional: Save subscriber (you'd implement this based on your storage method)
    await saveSubscriber(email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Subscription successful', 
        email: email 
      })
    };
  } catch (error) {
    console.error('Subscription Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Subscription failed', 
        details: error.message 
      })
    };
  }
};

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Placeholder for subscriber saving logic
async function saveSubscriber(email) {
  // Implement your subscriber storage method here
  // This could be writing to a file, saving to a database, etc.
  console.log(`Saving subscriber: ${email}`);
}
