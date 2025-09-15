const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { nanoid } = require("nanoid");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
const PORT = 5004;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static("public")); // serve index.html

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/urlshortener", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schema
const urlSchema = new mongoose.Schema({
  originalUrl: String,
  shortUrl: String,
  date: { type: Date, default: Date.now },
});
const Url = mongoose.model("Url", urlSchema);

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "URL Shortener API",
      version: "1.0.0",
      description: "API for shortening URLs and viewing history",
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ["./server.js"], // docs from comments
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /shorten:
 *   post:
 *     summary: Shorten a URL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 example: https://example.com
 *     responses:
 *       200:
 *         description: Shortened URL
 */
app.post("/shorten", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  const shortId = nanoid(6);
  const shortUrl = `http://localhost:${PORT}/${shortId}`;

  const newUrl = new Url({ originalUrl: url, shortUrl });
  await newUrl.save();

  res.json({ shortUrl });
});

/**
 * @swagger
 * /history:
 *   get:
 *     summary: Get all shortened URLs history
 *     responses:
 *       200:
 *         description: List of URLs
 */
app.get("/history", async (req, res) => {
  const urls = await Url.find().sort({ date: -1 });
  res.json(urls);
});

/**
 * @swagger
 * /{shortId}:
 *   get:
 *     summary: Redirect to original URL
 *     parameters:
 *       - in: path
 *         name: shortId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to original URL
 */
app.get("/:shortId", async (req, res) => {
  const shortUrl = `http://localhost:${PORT}/${req.params.shortId}`;
  const entry = await Url.findOne({ shortUrl });

  if (entry) {
    res.redirect(entry.originalUrl);
  } else {
    res.status(404).json({ error: "Short URL not found" });
  }
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
