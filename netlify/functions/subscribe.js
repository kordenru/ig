import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch'; // Ensure you have this package installed

// Define the path to the CSV file in the Netlify function environment
const filePath = path.resolve('/tmp/subscribers.csv');

// Ensure the CSV file exists in /tmp
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'email,ip,dateTime\n'); // Create CSV file with headers
}

// Configure the email transporter using nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password (or app password)
    },
});

export async function handler(event) {
    // Check if the HTTP method is POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Parse the incoming request body to extract the email
    const params = new URLSearchParams(event.body);
    const email = params.get('email');

    // Capture the user's IP address from request headers
    const ip = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || event.headers['remote-address'] || event.ip || 'Unknown IP';
    const dateTime = new Date().toISOString(); // Get the current date and time in ISO format

    // Validate that an email was provided
    if (!email) {
        return {
            statusCode: 400,
            body: 'Email is required.',
        };
    }

    // Append email, IP, and dateTime to the CSV file
    try {
        fs.appendFileSync(filePath, `${email},${ip},${dateTime}\n`); // Append the new entry
        await uploadToBlob(filePath); // Upload the updated CSV file to Netlify Blob
    } catch (error) {
        console.error('Error writing to CSV:', error);
        return { statusCode: 500, body: 'Error saving subscription data.' };
    }

    // Read the total number of subscribers
    const subscribers = fs.readFileSync(filePath, 'utf-8').split('\n').slice(1).filter(Boolean);
    const totalSubscribers = subscribers.length;

    // Set up the email notification options
    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender email
        to: process.env.EMAIL_USER, // Recipient email (can be the same as sender)
        subject: 'New Subscriber Notification',
        text: `New subscriber: ${email}\nTotal subscribers: ${totalSubscribers}\nSubscriber IP: ${ip}`, // Include IP in notification
    };

    // Send notification email
    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        return { statusCode: 500, body: 'Error sending email notification.' };
    }

    // Return a success response
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<div style="text-align: center; font-family: Arial;">
                 <h2>Thank you for subscribing!</h2>
                 <p>We will notify you when our website launches.</p>
               </div>`,
    };
}

// Function to upload the CSV file to Netlify Blob
async function uploadToBlob(filePath) {
    const response = await fetch('https://api.netlify.com/api/v1/sites/0792599e-edfa-4cee-a7a7-d2cc621489ee/blobs', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.NETLIFY_API_TOKEN}`, // Netlify API token for authorization
            'Content-Type': 'text/csv', // Specify the content type
        },
        body: fs.readFileSync(filePath), // Read the updated CSV file to upload
    });

    // Check for errors during upload
    if (!response.ok) {
        throw new Error(`Error uploading to Netlify Blob: ${response.statusText}`);
    }

    // Log the response from the upload for debugging
    const blobResponse = await response.json();
    console.log('Uploaded to Netlify Blob:', blobResponse);
}
