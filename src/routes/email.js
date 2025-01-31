const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Email configuration and route
router.post('/send', async (req, res) => {
    const { first_name, last_name, email, phone_number, additional_info } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
        return res.status(400).json({ error: 'First name, last name, and email are required.' });
    }

    // Email configuration
    const transporter = nodemailer.createTransport({
        host: 'smtp.yourdomain.com', // Replace with your server's SMTP host
        port: 587, // Replace with your SMTP port
        secure: false, 
        auth: {
            user: process.env.EMAIL_USER, // Use environment variables
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'hanacophotography@gmail.com',
        subject: 'New Contact Form Submission',
        text: `You have received a new message:
    First Name: ${first_name}
    Last Name: ${last_name}
    Email: ${email}
    Phone Number: ${phone_number || 'N/A'}
    Additional Information: ${additional_info || 'N/A'}`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email. Please try again later.' });
    }
});

module.exports = router;