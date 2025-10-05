import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

// Create connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "intern_registration",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "+07:00", // WIB
});

// Helper functions
export const generateRegistrationCode = async (programId) => {
  const [program] = await db
    .promise()
    .query("SELECT name FROM programs WHERE id = ?", [programId]);

  const programCode = program[0]?.name.substring(0, 3).toUpperCase() || "REG";
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();

  return `${programCode}-${timestamp}-${random}`;
};

export const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `INV/${year}/${month}/${timestamp}${random}`;
};

export const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `RCP/${year}/${month}/${timestamp}${random}`;
};

// Test connection function
export const testConnection = async () => {
  try {
    const [rows] = await db.promise().query("SELECT 1 + 1 AS result");
    console.log("✅ Database connection test successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    return false;
  }
};

export default db;
