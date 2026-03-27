import { Express } from "express";
import { storage } from "./storage";

export function setupAuth(app: Express) {
  // Mock authentication routes for deployment without auth
  app.post("/api/register", async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    // Return a static user (userId = 1)
    let user = await storage.getUser(1);
    if (!user) {
      // Auto-seed user 1 to avoid foreign key failures
      user = await storage.createUser({ username: "testadmin", password: "mockpassword", isAdmin: true });
    }
    res.status(200).json(user);
  });

  app.post("/api/logout", (req, res) => {
    res.sendStatus(200);
  });

  app.get("/api/user", async (req, res) => {
    // Return a static user (userId = 1)
    let user = await storage.getUser(1);
    if (!user) {
      try {
        // Auto-seed user 1 to avoid foreign key failures on fresh DB
        user = await storage.createUser({ username: "testadmin", password: "mockpassword", isAdmin: true });
      } catch (e) {
        return res.status(500).json({ message: "Failed to create mock user" });
      }
    }
    res.json(user);
  });
}
