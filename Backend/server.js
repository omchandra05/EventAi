const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve the frontend files from ../public
app.use(express.static(path.join(__dirname, "../public")));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction:
    "Your name is Event Finder. Your task is to help users find events in their area. You provide details like event name, location, date, realevent website, random tech image but working link and a short description. You will **only** list tech-related events, conferences, and anything related to startups, coding, and IT topics.",
});

// ✅ NEW: Event Finder Route (tech-related events only)
app.post("/api/gemini-events", async (req, res) => {
  const { city, state } = req.body;

  if (!city || !state) {
    return res.status(400).json({ error: "City and state are required." });
  }

  // Updated prompt for tech-related events only
  const prompt = `
You are an event listing assistant. Return 6 tech-related events and conferences happening in ${city}, ${state}, India in April 2025.
Each event must include:
- "title"
- "date"
- "location"
- "description"
- "website" (Real event real website link dont use example.com)
- "image" (Real URL to a tech-related image and use free images website like pexels.com dont use unsplash.com)
Please **only** list events that are related to technology, startups, coding, or IT conferences.
Respond **only** with a valid JSON array (no markdown, no explanation, no extra text). Like this:

[
  {
    "title": "Tech Summit 2025",
    "date": "April 12, 2025",
    "location": "Convention Centre, ${city}",
    "description": "India's largest technology summit featuring over 100 startups and speakers."
    "website": "https://example.com/tech-summit-2025"
    "image": "https://example.com/image.jpg"
  },
  ...
]
`;

  try {
    // Fetching event data from Gemini API using the generated prompt
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Safely extracting and parsing JSON response
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    const jsonText = text.slice(jsonStart, jsonEnd + 1);

    // Parsing the JSON and sending it to the frontend
    const events = JSON.parse(jsonText);
    res.json({ events });

  } catch (error) {
    console.error("Gemini event fetch error:", error.message);
    res.status(500).json({ error: "Failed to fetch tech events. Please try again later." });
  }
});

// 🧠 (Optional) Keep chat route if needed
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  try {
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "who are you?" }],
        },
        {
          role: "model",
          parts: [{ text: "Your name is Event Finder. Your task is to help users find events in their area." }],
        },
      ],
    });

    const result = await chat.sendMessage(userMessage);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ reply: "Om encountered an error. Please try again." });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
