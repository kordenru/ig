import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import axios from 'axios';

// Define the path to the CSV file
const filePath = path.resolve('subscribers.csv');

// Ensure the CSV file exists
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'email\n'); // Create CSV file with header
}

// Google reCAPTCHA secret key
const RECAPTCHA_SECRET_KEY = 'YOUR_RECAPTCHA_SECRET_KEY'; // Replace with your reCAPTCHA secret key

// Email transport configuration
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'your-email@gmail.com', // Your email address
        pass: 'your-email-password',  // Your email password (or app password)
    },
});

// API function to handle form submission
export async function post({ request }) {
    const formData = await request.formData();
    const email = formData.get('email');
    const recaptchaToken = formData.get('g-recaptcha-response');

    // Verify reCAPTCHA
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
        return {
            status: 400,
            body: 'reCAPTCHA verification failed.'
        };
    }

    // Append the email to the CSV file
    fs.appendFileSync(filePath, `${email}\n`);

    // Send notification email to the website owner
    const subscribers = fs.readFileSync(filePath, 'utf-8').split('\n').slice(1).filter(Boolean);
    const emailList = subscribers.join(', ');
    const totalSubscribers = subscribers.length;

    const mailOptions = {
        from: 'your-email@gmail.com', // Your email
        to: 'owner-email@example.com', // Website owner's email
        subject: 'New Subscriber Notification',
        text: `You have a new subscriber: ${email}\n\nTotal subscribers: ${totalSubscribers}\nList: ${emailList}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return {
                status: 500,
                body: 'Error sending email notification.'
            };
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    return {
        status: 200,
        body: `<div style="text-align: center; font-family: Arial;"><h2>Thank you for subscribing!</h2><p>We will notify you when our website launches.</p></div>`
    };
}

// Function to verify reCAPTCHA with Google
async function verifyRecaptcha(token) {
    const response = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify`,
        {},
        {
            params: {
                secret: RECAPTCHA_SECRET_KEY,
                response: token,
            },
        }
    );
    return response.data.success;
}
