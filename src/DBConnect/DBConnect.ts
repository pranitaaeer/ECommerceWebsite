import mongoose from "mongoose";
import { DBNAME } from "../utils/dbName.js";
export const connectDB = async (uri: string) => {
  try {
    const db = await mongoose.connect(uri, { dbName: DBNAME });
    console.log(`✅ Database connected: ${db.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

