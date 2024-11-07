import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// Define the path to the CSV file in the server environment
const filePath = path.resolve('/tmp/subscribers.csv'); // Use /tmp for serverless environments

// Ensure the CSV file exists in /tmp
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'email\n'); // Create CSV file with header
}

// Configure email transporter (use environment variables for sensitive info)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Parse form data (URL-encoded)
    const params = new URLSearchParams(event.body);
    const email = params.get('email');

    if (!email) {
        return {
            statusCode: 400,
            body: 'Email is required.',
        };
    }

    // Append email to CSV file in /tmp
    try {
        fs.appendFileSync(filePath, `${email}\n`);
    } catch (error) {
        console.error('Error writing to CSV:', error);
        return { statusCode: 500, body: 'Error saving subscription data.' };
    }

    // Notify the site owner of the new subscriber
    const subscribers = fs.readFileSync(filePath, 'utf-8').split('\n').slice(1).filter(Boolean);
    const totalSubscribers = subscribers.length;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: 'New Subscriber Notification',
        text: `You have a new subscriber: ${email}\n\nTotal subscribers: ${totalSubscribers}`,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        return { statusCode: 500, body: 'Error sending email notification.' };
    }

    // Return success response
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<div style="text-align: center; font-family: Arial;">
                 <h2>Thank you for subscribing!</h2>
                 <p>We will notify you when our website launches.</p>
               </div>`
    };
}
