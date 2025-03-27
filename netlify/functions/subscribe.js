import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  // Verify request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, 'g-recaptcha-response': token } = JSON.parse(event.body);

    // Verify reCAPTCHA
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${token}`;
    
    const recaptchaResponse = await fetch(verifyUrl);
    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      return {
        statusCode: 400,
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
      from: `"Website Form" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'New Subscription',
      text: `You have a new subscriber:\n\nEmail: ${email}`,
      html: `<p>You have a new subscriber:</p><p><strong>Email:</strong> ${email}</p>`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscription successful' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
