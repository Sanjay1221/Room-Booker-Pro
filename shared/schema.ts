import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const meetingRooms = pgTable("meeting_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  location: text("location").notNull(),
  features: text("features"), // e.g., "Projector, Whiteboard"
  imageUrl: text("image_url"),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  roomId: integer("room_id").notNull().references(() => meetingRooms.id),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:mm
  endTime: text("end_time").notNull(), // HH:mm
  status: text("status").notNull().default("confirmed"), // confirmed, cancelled
  purpose: text("purpose"),
});

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users);
export const insertMeetingRoomSchema = createInsertSchema(meetingRooms);
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, userId: true, status: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type MeetingRoom = typeof meetingRooms.$inferSelect;
export type InsertMeetingRoom = z.infer<typeof insertMeetingRoomSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Request types
export type CreateBookingRequest = InsertBooking;
export type UpdateBookingRequest = Partial<InsertBooking>;

// Response types
export type MeetingRoomResponse = MeetingRoom;
export type BookingResponse = Booking & { roomName?: string }; // Enriched with room info if needed

// Query params
export interface BookingQueryParams {
  roomId?: number;
  date?: string;
}
