import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://roomuser:Xd1JjZm3ibtdrIcYhA8ryEKEd0hh7Abd@dpg-d72d16chg0os738i1oeg-a.oregon-postgres.render.com/roomdb_uzdq?sslmode=require",
  },
});