import 'dotenv/config';
import nodemailer from 'nodemailer';

async function test() {
    console.log("USER:", process.env.EMAIL_USER);
    console.log("PASS:", process.env.EMAIL_PASS);
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || '',
            pass: process.env.EMAIL_PASS || ''
        }
    });

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: "test@example.com",
            subject: "Test",
            text: "Hello"
        });
        console.log("Sent", info.messageId);
    } catch (e) {
        console.error("Error sending", e.message);
    }
}

test();
