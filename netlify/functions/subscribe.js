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

// Email transporter configuration (using environment variables)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app-specific password
    },
});

// Function to verify reCAPTCHA
async function verifyRecaptcha(token) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Set this in Netlify's environment variables

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

// Netlify function to handle subscription form submission
export async function handler(event) {
    console.log("Function triggered. HTTP Method:", event.httpMethod);
    console.log("Headers:", event.headers);
    console.log("Raw event body:", event.body); // Log the raw body for troubleshooting

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let email, recaptchaToken;

    // Parse the request body, handling JSON and form-encoded data
    try {
        if (event.headers['content-type'] === 'application/json') {
            const body = JSON.parse(event.body);
            email = body.email;
            recaptchaToken = body['g-recaptcha-response'];
        } else if (event.headers['content-type'] === 'application/x-www-form-urlencoded') {
            const params = new URLSearchParams(event.body);
            email = params.get('email');
            recaptchaToken = params.get('g-recaptcha-response');
        } else {
            throw new Error("Unsupported content type");
        }

        if (!email || !recaptchaToken) {
            throw new Error("Missing email or reCAPTCHA token");
        }

        console.log("Parsed email:", email);
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

    // Append email to CSV file in /tmp
    try {
        fs.appendFileSync(filePath, `${email}\n`);
        console.log("Email appended successfully.");
    } catch (error) {
        console.error('Error writing to CSV:', error);
        return { statusCode: 500, body: 'Error saving subscription data.' };
    }

    // Read all subscribers from CSV for email summary
    let totalSubscribers;
    try {
        const subscribers = fs.readFileSync(filePath, 'utf-8').split('\n').slice(1).filter(Boolean);
        totalSubscribers = subscribers.length;
        console.log("Total subscribers:", totalSubscribers);
    } catch (error) {
        console.error('Error reading from CSV:', error);
        return { statusCode: 500, body: 'Error reading subscription data.' };
    }

    // Send email notification to the owner
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Owner's email
        subject: 'New Subscriber Notification',
        text: `You have a new subscriber: ${email}\n\nTotal subscribers: ${totalSubscribers}`,
    };

    try {
        const emailResponse = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", emailResponse);
    } catch (error) {
        console.error('Error sending email:', error);
        return { statusCode: 500, body: 'Error sending email notification.' };
    }

    // Success response
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<div style="text-align: center; font-family: Arial;">
                 <h2>Thank you for subscribing!</h2>
                 <p>We will notify you when our website launches.</p>
               </div>`
    };
}
