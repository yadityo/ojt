import mysql from "mysql2";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create connection to MySQL
const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true,
});

// Read SQL schema file
const schemaPath = path.join(__dirname, "../../database/schema.sql");
const schema = fs.readFileSync(schemaPath, "utf8");

console.log("🚀 Setting up database...");

const setupDatabase = async () => {
  try {
    // Connect to MySQL
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log("✅ Connected to MySQL server");

    // Create database
    await new Promise((resolve, reject) => {
      connection.query(
        "CREATE DATABASE IF NOT EXISTS intern_registration_test",
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log("✅ Database created or already exists");

    // Use the database
    await new Promise((resolve, reject) => {
      connection.query("USE intern_registration_test", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log("✅ Using database intern_registration_test");

    // Execute schema
    await new Promise((resolve, reject) => {
      connection.query(schema, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log("✅ Database schema created successfully");

    // Close connection
    connection.end();

    console.log(
      "🌱 Database setup completed. Run 'npm run db:seed' to seed data."
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up database:", error);
    connection.end();
    process.exit(1);
  }
};

// Handle uncaught errors
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  connection.end();
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  connection.end();
  process.exit(1);
});

setupDatabase();
