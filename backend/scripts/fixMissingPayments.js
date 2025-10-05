import db, { generateInvoiceNumber } from "../config/database.js";

const fixMissingPayments = async () => {
  try {
    console.log("🔧 Checking for registrations without payments...");

    const [missingPayments] = await db.promise().query(`
      SELECT r.*, p.cost, p.name as program_name 
      FROM registrations r
      JOIN programs p ON r.program_id = p.id
      LEFT JOIN payments py ON r.id = py.registration_id
      WHERE py.id IS NULL
    `);

    console.log(
      `📋 Found ${missingPayments.length} registrations without payments`
    );

    for (const registration of missingPayments) {
      const invoiceNumber = await generateInvoiceNumber();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await db.promise().query(
        `INSERT INTO payments 
         (registration_id, invoice_number, amount, due_date, status) 
         VALUES (?, ?, ?, ?, 'pending')`,
        [registration.id, invoiceNumber, registration.cost, dueDate]
      );

      console.log(
        `✅ Created payment for registration ${registration.registration_code}: ${invoiceNumber}`
      );
    }

    console.log("🎉 All missing payments have been created!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing missing payments:", error);
    process.exit(1);
  }
};

fixMissingPayments();
