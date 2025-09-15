import mongoose from "mongoose";

// Define URL schema
const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },  // The original long URL
  shortUrl: { type: String, required: true, unique: true }, // The shortened URL
  date: { type: Date, default: Date.now } // Optional: date created
});

// Export the model
export default mongoose.model("Url", urlSchema);
