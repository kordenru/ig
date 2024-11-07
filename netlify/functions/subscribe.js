import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import axios from 'axios';

// Define the path to the CSV file in the Netlify function environment
const filePath = path.resolve('/tmp/subscribers.csv');

// Ensure the CSV file exists in /tmp
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'email\n');
}

// Email transporter configuration (using environment variables)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Function to verify reCAPTCHA
async function verifyRecaptcha(token) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
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

// Netlify function to handle subscription form submission
export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let email, recaptchaToken;

    // Parse the request body
    try {
        const params = new URLSearchParams(event.body);
        email = params.get('email');
        recaptchaToken = params.get('g-recaptcha-response');

        if (!email || !recaptchaToken) {
            throw new Error("Missing email or reCAPTCHA token");
        }
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            body: 'Invalid request format or missing email/recaptcha token.',
        };
    }

    // Verify reCAPTCHA
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
        return { statusCode: 400, body: 'reCAPTCHA verification failed.' };
    }

    // Append email to CSV
    try {
        fs.appendFileSync(filePath, `${email}\n`);
    } catch (error) {
        console.error('Error writing to CSV:', error);
        return { statusCode: 500, body: 'Error saving subscription data.' };
    }

    // Send email notification to the owner
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: 'New Subscriber Notification',
        text: `You have a new subscriber: ${email}`,
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
