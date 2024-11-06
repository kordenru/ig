import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import axios from 'axios';

// Define the path to the CSV file in the Netlify function environment
const filePath = path.resolve('/tmp/subscribers.csv'); // Use /tmp for serverless environments

// Ensure the CSV file exists in /tmp
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'email\n'); // Create CSV file with header
}

// Google reCAPTCHA secret key (store securely as environment variable)
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

// Email transporter configuration (use environment variables for credentials)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,       // Your email address
        pass: process.env.EMAIL_PASS,       // Your email password or app-specific password
    },
});

// Netlify function to handle subscription form submission
export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { email, 'g-recaptcha-response': recaptchaToken } = JSON.parse(event.body);

    // Verify reCAPTCHA token
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
        return { statusCode: 400, body: 'reCAPTCHA verification failed.' };
    }

    // Append email to CSV file in /tmp
    fs.appendFileSync(filePath, `${email}\n`);

    // Read all subscribers from CSV
    const subscribers = fs.readFileSync(filePath, 'utf-8').split('\n').slice(1).filter(Boolean);
    const totalSubscribers = subscribers.length;

    // Send email notification to the owner
    const mailOptions = {
        from: process.env.EMAIL_USER,              // Your email address
        to: process.env.EMAIL_USER,                // Owner's email
        subject: 'New Subscriber Notification',
        text: `You have a new subscriber: ${email}\n\nTotal subscribers: ${totalSubscribers}`,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        return { statusCode: 500, body: 'Error sending email notification.' };
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<div style="text-align: center; font-family: Arial;">
                 <h2>Thank you for subscribing!</h2>
                 <p>We will notify you when our website launches.</p>
               </div>`
    };
}

// Function to verify reCAPTCHA with Google
async function verifyRecaptcha(token) {
    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: RECAPTCHA_SECRET_KEY,
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