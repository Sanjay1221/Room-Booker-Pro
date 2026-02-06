import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

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
      
      // Check availability
      const existingBookings = await storage.getBookingsByRoom(input.roomId, input.date);
      const hasConflict = existingBookings.some(b => {
        // Simple overlap check: 
        // (StartA < EndB) and (EndA > StartB)
        // Using string comparison for HH:mm is sufficient for standard times
        return (input.startTime < b.endTime) && (input.endTime > b.startTime);
      });

      if (hasConflict) {
        return res.status(409).json({ message: "This time slot is already booked" });
      }

      const booking = await storage.createBooking({
        ...input,
        userId: req.user!.id
      });
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

  // Seed data if needed
  await seedDatabase();

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
