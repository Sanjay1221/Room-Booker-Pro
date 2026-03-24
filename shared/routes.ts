import { z } from 'zod';
import { insertUserSchema, insertMeetingRoomSchema, insertBookingSchema, meetingRooms, bookings, users } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  rooms: {
    list: {
      method: 'GET' as const,
      path: '/api/rooms',
      responses: {
        200: z.array(z.custom<typeof meetingRooms.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/rooms/:id',
      responses: {
        200: z.custom<typeof meetingRooms.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings', // Get current user's bookings
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect>()),
      },
    },
    listByRoom: {
      method: 'GET' as const,
      path: '/api/rooms/:id/bookings', // For availability checking
      input: z.object({ date: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: insertBookingSchema.omit({ roomId: true }).extend({
        members: z.number().min(1, 'Must specify at least 1 member'),
        requirements: z.array(z.string()).optional(),
        email: z.string().email('Please enter a valid email address').optional(),
      }),
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation, // or conflict
        404: errorSchemas.notFound, // No matching room
        409: errorSchemas.conflict, // Room already booked or gap overlap
      },
    },
    cancel: {
      method: 'POST' as const,
      path: '/api/bookings/:id/cancel',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
        403: errorSchemas.unauthorized,
      },
    },
    cancelAdmin: {
      method: 'POST' as const,
      path: '/api/admin/bookings/:id/cancel',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
        403: errorSchemas.unauthorized,
      },
    },
    listAll: {
      method: 'GET' as const,
      path: '/api/admin/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect>()),
        403: errorSchemas.unauthorized,
      },
    },
  },
  admin: {
    rooms: {
      update: {
        method: 'PATCH' as const,
        path: '/api/admin/rooms/:id',
        input: insertMeetingRoomSchema.partial(),
        responses: {
          200: z.custom<typeof meetingRooms.$inferSelect>(),
          404: errorSchemas.notFound,
          403: errorSchemas.unauthorized,
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/admin/rooms',
        input: insertMeetingRoomSchema,
        responses: {
          201: z.custom<typeof meetingRooms.$inferSelect>(),
          403: errorSchemas.unauthorized,
          400: errorSchemas.validation,
        },
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
