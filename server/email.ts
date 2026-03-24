import nodemailer from "nodemailer";
import cron from "node-cron";
import { storage } from "./storage";
import { db } from "./db";
import { bookings, meetingRooms, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { format, parseISO, differenceInMinutes, startOfMinute } from "date-fns";

// ==========================================
// Nodemailer Setup
// ==========================================
let transporter: nodemailer.Transporter;

// Check if credentials are placeholders or empty
const isPlaceholder = (val: string) => !val || val === 'your_email@gmail.com' || val === 'your_app_password';

if (isPlaceholder(process.env.EMAIL_USER || '') || isPlaceholder(process.env.EMAIL_PASS || '')) {
  console.warn("⚠️ Warning: EMAIL_USER or EMAIL_PASS environment variables are missing or using placeholders.");
  console.warn("⚠️ Nodemailer is falling back to Ethereal Test Email (mock emails). Check the console for preview URLs.");
  
  nodemailer.createTestAccount().then((testAccount) => {
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  }).catch(console.error);
} else {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}


// ==========================================
// Email Service
// ==========================================
export async function sendBookingConfirmation(booking: any, roomParams: any, userParams: any) {
    try {
        const formattedDate = format(parseISO(booking.date), 'MMMM d, yyyy');

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER && !isPlaceholder(process.env.EMAIL_USER) ? process.env.EMAIL_USER : '"Meeting Room System" <noreply@example.com>',
            to: booking.email || userParams.username, // Use the provided booking email
            subject: "Meeting Room Booking Confirmed",
            text: `Hello,

Your meeting room booking has been confirmed.

Room: ${roomParams.name}
Date: ${formattedDate}
Time: ${booking.startTime} – ${booking.endTime}
Members: ${booking.members}
Status: Confirmed

Thank you for using the Meeting Room Booking System.`
        });

        console.log("Confirmation email sent: %s", info.messageId);
        if (isPlaceholder(process.env.EMAIL_USER || '')) {
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
    } catch (error) {
        console.error("Failed to send booking confirmation email:", error);
    }
}

export async function sendMeetingReminder(booking: any, roomParams: any, userParams: any) {
    try {
        const info = await transporter.sendMail({
            from: '"MeetSpace 🏢" <noreply@meetspace.com>',
            to: userParams.username, // Assuming username is an email address here
            subject: "⏱️ Reminder: Your meeting starts in 10 minutes",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #f59e0b;">Meeting Reminder</h2>
          <p>Hi ${userParams.username},</p>
          <p>This is a quick reminder that your meeting in <strong>${roomParams.name}</strong> will begin in exactly 10 minutes (at ${booking.startTime}).</p>
          
          <p>Please ensure you arrive on time and vacate the room promptly at ${booking.endTime} to respect the next booking slot.</p>
          
          <p>Thanks,<br>The MeetSpace Team</p>
        </div>
      `,
        });

        console.log("Reminder email sent: %s", info.messageId);
        if (isPlaceholder(process.env.EMAIL_USER || '')) {
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
    } catch (error) {
        console.error("Failed to send meeting reminder email:", error);
    }
}


// ==========================================
// Cron Jobs
// ==========================================
// Run every minute
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        // We want to find bookings for "today" whose start time is 10 minutes from exactly now.
        // For simplicity with sqlite formatting, we'll format now to the required string formats.

        const todayStr = format(now, 'yyyy-MM-dd');
        const allBookingsToday = await db.select().from(bookings).where(
            and(
                eq(bookings.date, todayStr),
                eq(bookings.status, "confirmed")
            )
        );

        for (const booking of allBookingsToday) {
            // Create a Date object representing the meeting's start time today
            const [startHour, startMinute] = booking.startTime.split(':').map(Number);
            const meetingStartTime = new Date(now);
            meetingStartTime.setHours(startHour, startMinute, 0, 0);

            // Check difference in minutes
            const diffMins = differenceInMinutes(meetingStartTime, startOfMinute(now));

            // If the meeting is EXACTLY 10 minutes away, trigger the reminder email.
            if (diffMins === 10) {
                const room = await storage.getMeetingRoom(booking.roomId);
                const user = await storage.getUser(booking.userId);

                if (room && user) {
                    await sendMeetingReminder(booking, room, user);
                }
            }
        }
    } catch (error) {
        console.error("Cron job error checking reminders:", error);
    }
});
