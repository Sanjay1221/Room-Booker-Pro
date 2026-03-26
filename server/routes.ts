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

  // === BOOKINGS ===
  app.get(api.bookings.list.path, async (req, res) => {
    try {
      const bookings = await storage.getBookingsByUser(1); // fixed user
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

      const allRooms = await storage.getMeetingRooms();

      const suitableRooms = allRooms
        .filter(r => r.capacity >= input.members)
        .sort((a, b) => a.capacity - b.capacity);

      if (suitableRooms.length === 0) {
        return res.status(404).json({ message: "No room available." });
      }

      let assignedRoomId: number | null = null;

      const timeToMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      const newStart = timeToMinutes(input.startTime);
      const newEnd = timeToMinutes(input.endTime);

      for (const room of suitableRooms) {
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

        if (!conflict) {
          assignedRoomId = room.id;
          break;
        }
      }

      if (!assignedRoomId) {
        return res.status(409).json({ message: "Time slot already booked." });
      }

      const { members, requirements, ...bookingData } = input;

      const booking = await storage.createBooking({
        ...bookingData,
        roomId: assignedRoomId,
        userId: 1 // fixed
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
    try {
      const bookingId = Number(req.params.id);
      if (isNaN(bookingId)) return res.status(400).json({ message: "Invalid booking ID" });

      const updated = await storage.cancelBooking(bookingId, 1);

      if (!updated) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ❌ DISABLED ADMIN (causing crash)
  // remove req.user usage completely

  app.get('/api/analytics/rooms', async (req, res) => {
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