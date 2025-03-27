import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  // Verify reCAPTCHA first
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  const { email, 'g-recaptcha-response': token } = JSON.parse(event.body);
  
  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${token}`;
  const recaptchaResult = await fetch(verifyUrl).then(res => res.json());
  
  if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
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

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'New Website Subscriber',
      text: `New subscription from: ${email}`
    });

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
