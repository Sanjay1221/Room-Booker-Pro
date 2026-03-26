import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { type User as SharedUser } from "@shared/schema";
import { sendBookingConfirmation } from "./email";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends SharedUser { }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication routes and middleware
  setupAuth(app);

  // === ROOMS ===
  app.get(api.rooms.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rooms = await storage.getMeetingRooms();
    res.json(rooms);
  });

  app.get(api.rooms.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const room = await storage.getMeetingRoom(Number(req.params.id));
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json(room);
  });

  // === BOOKINGS ===
  app.get(api.bookings.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const bookings = await storage.getBookingsByUser(req.user!.id);
    res.json(bookings);
  });

  app.get(api.bookings.listByRoom.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const roomId = Number(req.params.id);
    const date = req.query.date as string | undefined;
    const bookings = await storage.getBookingsByRoom(roomId, date);
    res.json(bookings);
  });

  app.post(api.bookings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const input = api.bookings.create.input.parse(req.body);

      // 1. One-Day Advance Booking Rule
      // Parse the requested meeting date and start time
      const [reqYear, reqMonth, reqDay] = input.date.split('-').map(Number);
      const [reqHour, reqMin] = input.startTime.split(':').map(Number);

      const meetingDateTime = new Date(reqYear, reqMonth - 1, reqDay, reqHour, reqMin);
      const now = new Date();
      // Add 24 hours to current time
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (meetingDateTime.getTime() < twentyFourHoursFromNow.getTime()) {
        return res.status(400).json({ message: "Meeting rooms must be booked at least 1 day in advance." });
      }

      const allRooms = await storage.getMeetingRooms();
      const suitableRooms = allRooms
        .filter(r => r.capacity >= input.members)
        .filter(r => {
          if (!input.requirements || input.requirements.length === 0) return true;
          if (!r.features) return false;
          const roomFeatures = r.features.toLowerCase();
          return input.requirements.every(req => roomFeatures.includes(req.toLowerCase()));
        })
        .sort((a, b) => a.capacity - b.capacity);

      if (suitableRooms.length === 0) {
        return res.status(404).json({ message: "No meeting room available for this number of members." });
      }

      let assignedRoomId: number | null = null;
      let gapConflictFound = false;
      let timeConflictFound = false;

      const timeToMinutes = (timeValue: string) => {
        const [hours, minutes] = timeValue.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const newStartMins = timeToMinutes(input.startTime);
      const newEndMins = timeToMinutes(input.endTime);

      for (const room of suitableRooms) {
        const existingBookings = await storage.getBookingsByRoom(room.id, input.date);
        let roomHasConflict = false;

        for (const b of existingBookings) {
          const existingStartMins = timeToMinutes(b.startTime);
          const existingEndMins = timeToMinutes(b.endTime);

          const bufferStart = existingStartMins - 10;
          const bufferEnd = existingEndMins + 10;

          // Standard overlap checks if new meeting intersects with existing
          const standardOverlap = (newStartMins < existingEndMins) && (newEndMins > existingStartMins);
          // Buffer overlap checks if new meeting intersects with the padded buffer zone
          const bufferOverlap = (newStartMins < bufferEnd) && (newEndMins > bufferStart);

          if (standardOverlap) {
            roomHasConflict = true;
            timeConflictFound = true;
            break;
          } else if (bufferOverlap) {
            roomHasConflict = true;
            gapConflictFound = true;
            break;
          }
        }

        if (!roomHasConflict) {
          assignedRoomId = room.id;
          break;
        }
      }

      if (!assignedRoomId) {
        if (timeConflictFound) {
          return res.status(409).json({ message: "This time slot is already booked." });
        }
        if (gapConflictFound) {
          return res.status(409).json({ message: "This room requires a 10-minute gap between meetings. Please choose another time." });
        }
        return res.status(404).json({ message: "No meeting room available for this number of members." });
      }

      const { members, requirements, ...bookingData } = input;
      const booking = await storage.createBooking({
        ...bookingData,
        roomId: assignedRoomId,
        userId: req.user!.id
      });

      // Send async email without blocking request
      const room = await storage.getMeetingRoom(assignedRoomId);
      if (room && req.user) {
        sendBookingConfirmation({ ...booking, members }, room, req.user).catch(console.error);
      }

      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.bookings.cancel.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const bookingId = Number(req.params.id);
    const updated = await storage.cancelBooking(bookingId, req.user!.id);

    if (!updated) {
      return res.status(404).json({ message: "Booking not found or not owned by user" });
    }

    res.json(updated);
  });

  // === ADMIN ENDPOINTS ===
  // Security Helper
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user?.isAdmin) return res.sendStatus(403);
    next();
  };

  app.get(api.bookings.listAll.path, requireAdmin, async (req, res) => {
    const allBookings = await storage.getAllBookings();
    res.json(allBookings);
  });

  app.post(api.bookings.cancelAdmin.path, requireAdmin, async (req, res) => {
    const bookingId = Number(req.params.id);
    const updated = await storage.adminCancelBooking(bookingId);

    if (!updated) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(updated);
  });

  app.post(api.admin.rooms.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.rooms.create.input.parse(req.body);
      const newRoom = await storage.createMeetingRoom(input);
      res.status(201).json(newRoom);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch(api.admin.rooms.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.rooms.update.input.parse(req.body);
      const roomId = Number(req.params.id);
      const updatedRoom = await storage.updateMeetingRoom(roomId, input);

      if (!updatedRoom) {
        return res.status(404).json({ message: "Room not found" });
      }

      res.json(updatedRoom);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // === ANALYTICS ENDPOINTS ===
  app.get('/api/analytics/rooms', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const rooms = await storage.getMeetingRooms();
      const allBookings = await storage.getAllBookings();

      const stats = rooms.map(room => {
        const roomBookings = allBookings.filter(b => b.roomId === room.id && b.status !== "cancelled");
        const totalBookings = roomBookings.length;

        let totalMinutesBooked = 0;
        roomBookings.forEach(b => {
          const [startH, startM] = b.startTime.split(':').map(Number);
          const [endH, endM] = b.endTime.split(':').map(Number);
          totalMinutesBooked += (endH * 60 + endM) - (startH * 60 + startM);
        });

        // Assuming an 8 hour (480 min) work day for total utilization percentage calculation over the booked dates
        const uniqueDays = new Set(roomBookings.map(b => b.date)).size;
        const potentialMinutes = Math.max(uniqueDays * 480, 480); // Default to at least 1 day divisor

        const utilizationPercent = totalBookings > 0
          ? Math.min(Math.round((totalMinutesBooked / potentialMinutes) * 100), 100)
          : 0;

        return {
          name: room.name,
          totalBookings,
          utilizationPercent,
          totalMinutesBooked
        };
      });

      res.json(stats);
    } catch (error) {
      console.error("Failed to generate analytics", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seed data if needed
 // await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const rooms = await storage.getMeetingRooms();
  if (rooms.length === 0) {
    console.log("Seeding meeting rooms...");
    await storage.createMeetingRoom({
      name: "Conference Room A",
      capacity: 10,
      location: "1st Floor, East Wing",
      features: "Projector, Video Conferencing, Whiteboard",
      imageUrl: "/images/conference-room-a.png"
    });
    await storage.createMeetingRoom({
      name: "Focus Room 1",
      capacity: 4,
      location: "2nd Floor, Quiet Zone",
      features: "Whiteboard, Soundproof",
      imageUrl: "/images/focus-room-1.png"
    });
    await storage.createMeetingRoom({
      name: "Boardroom",
      capacity: 20,
      location: "Top Floor",
      features: "Large Screen, Catering Area, Executive Chairs",
      imageUrl: "/images/boardroom.png"
    });
  }
}
