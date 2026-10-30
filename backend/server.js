require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PinataSDK } = require("pinata");
const { GoogleGenAI } = require("@google/genai");
const Certificate = require("./models/Certificate");

const app = express();
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
const upload = multer({
    storage: multer.memoryStorage()
});
const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Atlas connected successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Blockchain Certificate Backend Running"
    });
});
// AI Certificate Designer

// AI Certificate Designer
app.post("/api/ai-design", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a certificate design prompt.",
      });
    }

    const designPrompt = `
You are a professional certificate designer.

Generate a certificate design configuration based on the user's prompt.

Return ONLY valid JSON with these fields:
{
  "title": "Certificate of Achievement",
  "backgroundColor": "#FDFBF5",
  "primaryColor": "#1E3A5F",
  "accentColor": "#C9A227",
  "textColor": "#222222",
  "borderStyle": "elegant",
  "fontStyle": "classic",
  "decoration": "minimal",
  "layout": "centered"
}

Rules:
- Use valid hexadecimal colors.
- Choose colors suitable for the user's prompt.
- Keep all fields as strings.
- Do not include Markdown or explanations.

User prompt: ${prompt.trim()}
`;

    let response;

    // Retry temporary Gemini service errors
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: designPrompt,
        });

        break;
      } catch (error) {
        console.error(`Gemini attempt ${attempt} failed:`, error.status);

        if (error.status !== 503 || attempt === 3) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, attempt * 2000)
        );
      }
    }

    const text = response.text;

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    const jsonText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const design = JSON.parse(jsonText);

    return res.json({
      success: true,
      design,
    });
  } catch (error) {
    console.error("AI design error:", error.status, error.message);

    const status = error.status === 503 ? 503 : 500;

    return res.status(status).json({
      success: false,
      message:
        status === 503
          ? "Gemini AI is temporarily busy. Please try again shortly."
          : "Unable to generate the design. Please try again.",
    });
  }
});


// Frontend connection test
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Frontend connected to backend successfully"
    });
});

// Create certificate
app.post("/api/certificates", async (req, res) => {
    try {
        const certificate = new Certificate(req.body);

        const savedCertificate = await certificate.save();

        res.status(201).json(savedCertificate);
    } catch (error) {
        res.status(400).json({
            message: "Error creating certificate",
            error: error.message
        });
    }
});
app.put("/api/certificates/:certificateId", async (req, res) => {
    try {
        const { certificateId } = req.params;
        const { blockchainTransactionHash } = req.body;

        const updatedCertificate = await Certificate.findOneAndUpdate(
            { certificateId: certificateId },
            { blockchainTransactionHash: blockchainTransactionHash },
            { new: true }
        );

        if (!updatedCertificate) {
            return res.status(404).json({
                message: "Certificate not found"
            });
        }

        res.json(updatedCertificate);

    } catch (error) {
        console.error("Error updating transaction hash:", error);

        res.status(500).json({
            message: "Failed to update transaction hash",
            error: error.message
        });
    }
});
// Search certificates by ID, student name, course, hash, or IPFS CID
app.get("/api/certificates/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Please enter a search term.",
      });
    }

    // Escape special regex characters in the search input
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escapedQuery, "i");

    const certificates = await Certificate.find({
      $or: [
        { certificateId: searchRegex },
        { studentName: searchRegex },
        { course: searchRegex },
        { certificateHash: searchRegex },
        { ipfsCID: searchRegex },
      ],
    })
      .select(
        "certificateId studentName course issueDate ipfsCID certificateHash blockchainTransactionHash"
      )
      .sort({ issueDate: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      count: certificates.length,
      certificates,
    });
  } catch (error) {
    console.error("Certificate search error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to search certificates.",
    });
  }
});
app.get("/api/certificates/:certificateId", async (req, res) => {
    try {
        const certificate = await Certificate.findOne({
            certificateId: req.params.certificateId
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: "Certificate not found"
            });
        }

        res.json({
    success: true,
    certificateId: certificate.certificateId,
    ipfsCID: certificate.ipfsCID || "",
    certificateHash: certificate.certificateHash || "",
    blockchainTransactionHash:
        certificate.blockchainTransactionHash || ""
});

    } catch (error) {
        console.error("Get certificate error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch certificate"
        });
    }
});
app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No PDF file uploaded"
            });
        }

        if (req.file.mimetype !== "application/pdf") {
            return res.status(400).json({
                message: "Only PDF files are allowed"
            });
        }

        const file = new File(
            [req.file.buffer],
            req.file.originalname,
            {
                type: req.file.mimetype
            }
        );

        const result = await pinata.upload.public.file(file);

        console.log("IPFS upload successful");
        console.log("CID:", result.cid);

        res.json({
            success: true,
            cid: result.cid,
            name: result.name
        });

    } catch (error) {
        console.error("IPFS upload error:", error);

        res.status(500).json({
            message: "IPFS upload failed",
            error: error.message
        });
    }
});
// Start server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});