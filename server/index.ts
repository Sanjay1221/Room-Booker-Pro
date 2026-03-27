process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 Unhandled Rejection:", err);
});
import 'dotenv/config';
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const existingRooms = await storage.getMeetingRooms();
    
    // Map of default images for our standard rooms
    const defaultImages: Record<string, string> = {
      "Alpha Room": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
      "Beta Suite": "https://images.unsplash.com/photo-1517502884422-41ea31631ff2?auto=format&fit=crop&q=80&w=800",
      "Gamma Boardroom": "https://images.unsplash.com/photo-1505409859467-3a796fd5798e?auto=format&fit=crop&q=80&w=800",
      "Delta Pod": "https://images.unsplash.com/photo-1596484552834-6a58f850d0d1?auto=format&fit=crop&q=80&w=800",
      "Omega Hall": "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800"
    };

    if (existingRooms.length === 0) {
      console.log("Seeding initial meeting rooms...");
      const sampleRooms = [
        { name: "Alpha Room", capacity: 4, location: "1st Floor", features: "Whiteboard, Soundproof", imageUrl: defaultImages["Alpha Room"] },
        { name: "Beta Suite", capacity: 10, location: "2nd Floor", features: "Projector, Video Conferencing, Large Screen", imageUrl: defaultImages["Beta Suite"] },
        { name: "Gamma Boardroom", capacity: 20, location: "3rd Floor", features: "Projector, Video Conferencing, Whiteboard, Soundproof, Large Screen", imageUrl: defaultImages["Gamma Boardroom"] },
        { name: "Delta Pod", capacity: 2, location: "1st Floor", features: "Soundproof", imageUrl: defaultImages["Delta Pod"] },
        { name: "Omega Hall", capacity: 50, location: "Ground Floor", features: "Projector, Video Conferencing, Whiteboard, Large Screen, Soundproof", imageUrl: defaultImages["Omega Hall"] }
      ];
      for (const r of sampleRooms) {
        await storage.createMeetingRoom(r);
      }
      console.log("Seeded", sampleRooms.length, "rooms.");
    } else {
      // Temporary migration to patch missing images in existing deployments
      let updatedCount = 0;
      for (const room of existingRooms) {
        if (!room.imageUrl && defaultImages[room.name]) {
          await storage.updateMeetingRoom(room.id, { imageUrl: defaultImages[room.name] });
          updatedCount++;
        }
      }
      if (updatedCount > 0) {
        console.log(`Updated images for ${updatedCount} existing rooms.`);
      }
    }

    await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log("Server running on port " + PORT));


  } catch (error) {
    console.error("❌ Server failed to start:", error);
  }
})();
