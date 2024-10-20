

import express from 'express';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
const PORT = 4321;

// Path to the CSV file
const filePath = path.resolve('subscribers.csv');

// Ensure the CSV file exists
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, 'email\n');
}

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'oneplu12@gmail.com', // Your email address
    pass: 'fegu hgmx mbgs yykn', // Your email password or app-specific password
  },
});

// Middleware
app.use(cors()); // Enable CORS to allow requests from different origins
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// API endpoint to handle subscription
app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;

  try {
    // Append email to CSV file
    fs.appendFileSync(filePath, `${email}\n`);

    // Read all subscribers
    const subscribers = fs.readFileSync(filePath, 'utf-8').split('\n').slice(1).filter(Boolean);
    const emailList = subscribers.join(', ');
    const totalSubscribers = subscribers.length;

    // Send email notification to the owner
    const mailOptions = {
      from: 'oneplu12@gmail.com',
      to: 'oneplu12@gmail.com', // Change to the owner's email
      subject: 'New Subscriber Notification',
      text: `You have a new subscriber: ${email}\n\nTotal subscribers: ${totalSubscribers}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).send('Error sending email notification.');
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    // Respond to the client with a success message
    res.status(200).send('Subscription successful');
  } catch (error) {
    console.error('Error handling subscription:', error);
    res.status(500).send('An error occurred while processing your request.');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
