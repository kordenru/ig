import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  // Parse form data
  const body = Object.fromEntries(new URLSearchParams(event.body));
  
  // Verify reCAPTCHA
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  const recaptchaResponse = body['g-recaptcha-response'];
  
  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaResponse}`;
  const recaptchaResult = await fetch(verifyUrl).then(res => res.json());
  
  if (!recaptchaResult.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'reCAPTCHA verification failed' })
    };
  }

  // Send email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: 'New Website Subscriber',
    text: `New subscription from: ${body.email}`
  };

  try {
    await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscription successful' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error sending email' })
    };
  }
};
