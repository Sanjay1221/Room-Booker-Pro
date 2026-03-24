import 'dotenv/config';
import { sendBookingConfirmation } from './server/email';

async function run() {
    console.log("Testing email fallback...");
    // Give time for transporter to initialize if async
    await new Promise(r => setTimeout(r, 2000));
    
    await sendBookingConfirmation(
        { date: '2026-03-20', startTime: '10:00', endTime: '11:00', members: 4, email: 'user@example.com' },
        { name: 'Test Room' },
        { username: 'user@example.com' }
    );
    console.log("Done");
    process.exit(0);
}

run();
