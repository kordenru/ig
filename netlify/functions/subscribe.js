const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  // Set CORS headers - update with your actual domain
  const allowedOrigins = [
    'https://www.ianaglushach.com',
    'https://ianaglushach.com'
  ];
  
  const origin = event.headers.origin;
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Add origin if it's in the allowed list
  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse form data
    const body = JSON.parse(event.body);
    const { email, 'g-recaptcha-response': token } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Verify reCAPTCHA
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${token}`;
    
    const recaptchaResponse = await fetch(verifyUrl);
    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'reCAPTCHA verification failed' })
      };
    }

    // Configure email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send email
    await transporter.sendMail({
      from: `"Website Subscription" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'New Website Subscriber',
      text: `New subscription from: ${email}`,
      html: `<p>New subscription from: <strong>${email}</strong></p>`
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Subscription successful' })
    };

  } catch (error) {
   console.error('Error processing subscription:', error.message); // Log the error message
  console.error(error.stack); // Log the stack trace for more details
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
