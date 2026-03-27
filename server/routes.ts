import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { type User as SharedUser } from "@shared/schema";

// ❌ removed email (it was crashing)
// import { sendBookingConfirmation } from "./email";

declare global {
  namespace Express {
    interface User extends SharedUser {}
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  setupAuth(app);

  // === ROOMS ===
  app.get(api.rooms.list.path, async (req, res) => {
    try {
      const rooms = await storage.getMeetingRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.rooms.get.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid room ID" });

      const room = await storage.getMeetingRoom(id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      console.error("Error fetching room:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.rooms.create.path, async (req, res) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const input = api.rooms.create.input.parse(req.body);
      const room = await storage.createMeetingRoom(input);
      res.status(201).json(room);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Error creating room:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // === BOOKINGS ===
  app.get(api.bookings.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const bookings = await storage.getBookingsByUser(req.user!.id);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings by user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.bookings.listByRoom.path, async (req, res) => {
    try {
      const roomId = Number(req.params.id);
      if (isNaN(roomId)) return res.status(400).json({ message: "Invalid room ID" });

      const date = req.query.date as string | undefined;
      const bookings = await storage.getBookingsByRoom(roomId, date);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings by room:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.bookings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.bookings.create.input.parse(req.body);

      const [reqYear, reqMonth, reqDay] = input.date.split('-').map(Number);
      const [reqHour, reqMin] = input.startTime.split(':').map(Number);

      const meetingDateTime = new Date(reqYear, reqMonth - 1, reqDay, reqHour, reqMin);
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (meetingDateTime.getTime() < twentyFourHoursFromNow.getTime()) {
        return res.status(400).json({ message: "Book at least 1 day in advance." });
      }

      // Ensure the room actually exists.
      const room = await storage.getMeetingRoom(input.roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found." });
      }

      const timeToMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      const newStart = timeToMinutes(input.startTime);
      const newEnd = timeToMinutes(input.endTime);

      const existing = await storage.getBookingsByRoom(room.id, input.date);
      let conflict = false;

      for (const b of existing) {
        const start = timeToMinutes(b.startTime);
        const end = timeToMinutes(b.endTime);

        if (newStart < end && newEnd > start) {
          conflict = true;
          break;
        }
      }

      if (conflict) {
        return res.status(409).json({ message: "Time slot already booked." });
      }

      const booking = await storage.createBooking({
        ...input,
        roomId: room.id,
        userId: req.user!.id
      });

      // ❌ removed email (was crashing)

      res.status(201).json(booking);

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post(api.bookings.cancel.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const bookingId = Number(req.params.id);
      if (isNaN(bookingId)) return res.status(400).json({ message: "Invalid booking ID" });

      const updated = await storage.cancelBooking(bookingId, req.user!.id);

      if (!updated) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === ADMIN ENDPOINTS ===
  app.get('/api/admin/bookings', async (req, res) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const allBookings = await storage.getAllBookings();
      res.json(allBookings);
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/admin/bookings/:id/cancel', async (req, res) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const bookingId = Number(req.params.id);
      if (isNaN(bookingId)) return res.status(400).json({ message: "Invalid booking ID" });

      const updated = await storage.adminCancelBooking(bookingId);
      if (!updated) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error admin cancelling booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/analytics/rooms', async (req, res) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const rooms = await storage.getMeetingRooms();
      const allBookings = await storage.getAllBookings();

      const stats = rooms.map(room => {
        const roomBookings = allBookings.filter(b => b.roomId === room.id);

        return {
          name: room.name,
          totalBookings: roomBookings.length
        };
      });

      res.json(stats);

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal error" });
    }
  });

  return httpServer;
}