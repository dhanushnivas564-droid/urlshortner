import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { nanoid } from "nanoid";
import Url from "./models/url.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const env = process.env.NODE_ENV || 'development';

if (env === 'production') {
  dotenv.config({ path: path.resolve(__dirname, '.env.prod') });
} else {
  dotenv.config({ path: path.resolve(__dirname, '.env.local') });
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "URL Shortener API",
      version: "1.0.0",
      description: "A simple URL Shortener API"
    },
    servers: [{ url: `http://localhost:${PORT}` }]
  },
  apis: ["./server.js"]
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root route
app.get("/", (req, res) => {
  res.send("URL Shortener API is running. Visit /api-docs for Swagger UI.");
});

// POST /shorten - create short URL
/**
 * @swagger
 * /shorten:
 *   post:
 *     summary: Shorten a URL
 *     tags: [URL]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: Original URL to shorten
 *     responses:
 *       200:
 *         description: Shortened URL created
 *       400:
 *         description: URL is required
 *       500:
 *         description: Server error
 */
app.post("/shorten", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const shortId = nanoid(8);
    const shortUrl = `${process.env.BASE_URL}:${PORT}/${shortId}`;
    const newUrl = new Url({ originalUrl: url, shortUrl });
    await newUrl.save();

    res.json({ originalUrl: url, shortUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /:shortId - redirect to original URL
/**
 * @swagger
 * /{shortId}:
 *   get:
 *     summary: Redirect short URL to original URL
 *     tags: [URL]
 *     parameters:
 *       - in: path
 *         name: shortId
 *         schema:
 *           type: string
 *         required: true
 *         description: Short ID of the URL
 *     responses:
 *       302:
 *         description: Redirects to original URL
 *       404:
 *         description: URL not found
 */
app.get("/:shortId", async (req, res) => {
  const { shortId } = req.params;
  const fullShortUrl = `${process.env.BASE_URL}:${PORT}/${shortId}`;

  try {
    const urlDoc = await Url.findOne({ shortUrl: fullShortUrl });
    if (urlDoc) {
      res.redirect(urlDoc.originalUrl);
    } else {
      res.status(404).json({ error: "URL not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});
