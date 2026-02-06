import { db } from "./db";
import {
  users, meetingRooms, bookings,
  type User, type InsertUser,
  type MeetingRoom, type InsertMeetingRoom,
  type Booking, type InsertBooking
} from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Rooms
  getMeetingRooms(): Promise<MeetingRoom[]>;
  getMeetingRoom(id: number): Promise<MeetingRoom | undefined>;
  createMeetingRoom(room: InsertMeetingRoom): Promise<MeetingRoom>;

  // Bookings
  getBookingsByUser(userId: number): Promise<Booking[]>;
  getBookingsByRoom(roomId: number, date?: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking & { userId: number }): Promise<Booking>;
  cancelBooking(id: number, userId: number): Promise<Booking | undefined>;
  getBooking(id: number): Promise<Booking | undefined>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getMeetingRooms(): Promise<MeetingRoom[]> {
    return await db.select().from(meetingRooms);
  }

  async getMeetingRoom(id: number): Promise<MeetingRoom | undefined> {
    const [room] = await db.select().from(meetingRooms).where(eq(meetingRooms.id, id));
    return room;
  }

  async createMeetingRoom(room: InsertMeetingRoom): Promise<MeetingRoom> {
    const [newRoom] = await db.insert(meetingRooms).values(room).returning();
    return newRoom;
  }

  async getBookingsByUser(userId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.userId, userId));
  }

  async getBookingsByRoom(roomId: number, date?: string): Promise<Booking[]> {
    let query = db.select().from(bookings).where(and(
      eq(bookings.roomId, roomId),
      eq(bookings.status, "confirmed")
    ));

    if (date) {
      query.where(and(
        eq(bookings.roomId, roomId),
        eq(bookings.status, "confirmed"),
        eq(bookings.date, date)
      ));
    }

    return await query;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(booking: InsertBooking & { userId: number }): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values({
      ...booking,
      status: "confirmed"
    }).returning();
    return newBooking;
  }

  async cancelBooking(id: number, userId: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(
      and(eq(bookings.id, id), eq(bookings.userId, userId))
    );

    if (!booking) return undefined;

    const [updated] = await db.update(bookings)
      .set({ status: "cancelled" })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
