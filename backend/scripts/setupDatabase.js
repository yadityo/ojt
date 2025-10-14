import mysql from "mysql2";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create connection to MySQL
const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true,
});

// Read SQL schema file
const schemaPath = path.join(__dirname, "schema.sql"); // Sesuaikan path ke file schema Anda
const schema = fs.readFileSync(schemaPath, "utf8");

console.log("🚀 Setting up database...");

connection.connect((err) => {
  if (err) {
    console.error("❌ Error connecting to MySQL:", err);
    process.exit(1);
  }

  console.log("✅ Connected to MySQL server");

  // Create database
  connection.query(
    "CREATE DATABASE IF NOT EXISTS intern_registration_test",
    (err) => {
      if (err) {
        console.error("❌ Error creating database:", err);
        connection.end();
        return;
      }

      console.log("✅ Database created or already exists");

      // Use the database
      connection.query("USE intern_registration_test", (err) => {
        if (err) {
          console.error("❌ Error using database:", err);
          connection.end();
          return;
        }

        console.log("✅ Using database intern_registration_test");

        // Execute schema
        connection.query(schema, (err) => {
          if (err) {
            console.error("❌ Error executing schema:", err);
            connection.end();
            return;
          }

          console.log("✅ Database schema created successfully");
          console.log("🌱 Running seed data...");

          // Import dan jalankan seed data
          import("./seedData.js")
            .then((module) => {
              module.default();
            })
            .catch((err) => {
              console.error("❌ Error running seed data:", err);
              connection.end();
            });
        });
      });
    }
  );
});
