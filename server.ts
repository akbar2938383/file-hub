import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import { createServer as createViteServer } from "vite";

interface FileRecord {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadDate: string;
  category: 'image' | 'document' | 'audio' | 'video' | 'archive' | 'code' | 'other';
  tags: string[];
  description?: string;
  downloadCount: number;
}

const app = express();
const PORT = 3000;

// Ensure upload directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const METADATA_FILE = path.join(UPLOADS_DIR, "metadata.json");

// Helper to read metadata
function getMetadata(): FileRecord[] {
  try {
    if (!fs.existsSync(METADATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(METADATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading metadata:", err);
    return [];
  }
}

// Helper to save metadata
function saveMetadata(records: FileRecord[]) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving metadata:", err);
  }
}

// Category detector
function detectCategory(mimeType: string, filename: string): FileRecord['category'] {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  
  if (["pdf", "doc", "docx", "txt", "rtf", "odt", "pages", "xls", "xlsx", "csv", "ppt", "pptx"].includes(ext)) {
    return "document";
  }
  if (["zip", "tar", "gz", "7z", "rar", "bz2", "xz"].includes(ext)) {
    return "archive";
  }
  if (["js", "ts", "jsx", "tsx", "html", "css", "json", "py", "java", "c", "cpp", "go", "rs", "php", "sh", "sql", "xml", "yaml", "yml"].includes(ext)) {
    return "code";
  }
  return "other";
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueId.slice(0, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max per file
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API ROUTES ---

// 1. Get all files with filtering & search
app.get("/api/files", (req, res) => {
  const { search, category, sort } = req.query;
  let records = getMetadata();

  if (category && typeof category === "string" && category !== "all") {
    records = records.filter((r) => r.category === category);
  }

  if (search && typeof search === "string" && search.trim() !== "") {
    const term = search.toLowerCase().trim();
    records = records.filter(
      (r) =>
        r.originalName.toLowerCase().includes(term) ||
        (r.description && r.description.toLowerCase().includes(term)) ||
        r.tags.some((t) => t.toLowerCase().includes(term))
    );
  }

  // Sorting
  if (sort === "name") {
    records.sort((a, b) => a.originalName.localeCompare(b.originalName));
  } else if (sort === "size_desc") {
    records.sort((a, b) => b.size - a.size);
  } else if (sort === "size_asc") {
    records.sort((a, b) => a.size - b.size);
  } else if (sort === "downloads") {
    records.sort((a, b) => b.downloadCount - a.downloadCount);
  } else {
    // default: date_desc
    records.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }

  res.json(records);
});

// 2. Storage Stats
app.get("/api/files/stats", (_req, res) => {
  const records = getMetadata();
  const totalFiles = records.length;
  const totalSize = records.reduce((acc, r) => acc + r.size, 0);
  const totalDownloads = records.reduce((acc, r) => acc + r.downloadCount, 0);

  const categoryBreakdown: Record<string, { count: number; size: number }> = {
    image: { count: 0, size: 0 },
    document: { count: 0, size: 0 },
    video: { count: 0, size: 0 },
    audio: { count: 0, size: 0 },
    archive: { count: 0, size: 0 },
    code: { count: 0, size: 0 },
    other: { count: 0, size: 0 },
  };

  records.forEach((r) => {
    if (categoryBreakdown[r.category]) {
      categoryBreakdown[r.category].count += 1;
      categoryBreakdown[r.category].size += r.size;
    } else {
      categoryBreakdown.other.count += 1;
      categoryBreakdown.other.size += r.size;
    }
  });

  res.json({
    totalFiles,
    totalSize,
    totalDownloads,
    categoryBreakdown,
  });
});

// 3. Upload File(s)
app.post("/api/files/upload", upload.array("files", 20), (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const existingRecords = getMetadata();
  const newRecords: FileRecord[] = [];

  for (const file of files) {
    const category = detectCategory(file.mimetype || "application/octet-stream", file.originalname);
    const record: FileRecord = {
      id: crypto.randomUUID(),
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype || "application/octet-stream",
      uploadDate: new Date().toISOString(),
      category,
      tags: [],
      description: "",
      downloadCount: 0,
    };
    newRecords.push(record);
  }

  const updatedRecords = [...newRecords, ...existingRecords];
  saveMetadata(updatedRecords);

  res.status(201).json({
    message: `${newRecords.length} file(s) uploaded successfully`,
    uploadedFiles: newRecords,
  });
});

// 4. Create Direct Text Note / Snippet file
app.post("/api/files/create-text", (req, res) => {
  const { title, content, extension = "txt", description = "" } = req.body;
  if (!title || typeof content !== "string") {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const cleanTitle = title.endsWith(`.${extension}`) ? title : `${title}.${extension}`;
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filePath, content, "utf-8");
  const stats = fs.statSync(filePath);

  const category = detectCategory("text/plain", cleanTitle);
  const record: FileRecord = {
    id: crypto.randomUUID(),
    originalName: cleanTitle,
    filename,
    size: stats.size,
    mimeType: extension === "md" ? "text/markdown" : extension === "json" ? "application/json" : "text/plain",
    uploadDate: new Date().toISOString(),
    category,
    tags: ["text-note"],
    description,
    downloadCount: 0,
  };

  const existingRecords = getMetadata();
  saveMetadata([record, ...existingRecords]);

  res.status(201).json({ message: "File created successfully", file: record });
});

// 5. Download File by ID
app.get("/api/files/:id/download", (req, res) => {
  const { id } = req.params;
  const records = getMetadata();
  const recordIndex = records.findIndex((r) => r.id === id);

  if (recordIndex === -1) {
    return res.status(404).json({ error: "File not found" });
  }

  const record = records[recordIndex];
  const filePath = path.join(UPLOADS_DIR, record.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Physical file missing on server" });
  }

  // Increment download count
  records[recordIndex].downloadCount += 1;
  saveMetadata(records);

  res.download(filePath, record.originalName, (err) => {
    if (err) {
      console.error("Error sending download:", err);
    }
  });
});

// 6. Preview / View File Content Inline
app.get("/api/files/:id/view", (req, res) => {
  const { id } = req.params;
  const records = getMetadata();
  const record = records.find((r) => r.id === id);

  if (!record) {
    return res.status(404).send("File not found");
  }

  const filePath = path.join(UPLOADS_DIR, record.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File missing on server");
  }

  // Set header to render inline
  res.setHeader("Content-Type", record.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(record.originalName)}"`);
  fs.createReadStream(filePath).pipe(res);
});

// 7. Get File Content as JSON (for text/code previewing directly)
app.get("/api/files/:id/content", (req, res) => {
  const { id } = req.params;
  const records = getMetadata();
  const record = records.find((r) => r.id === id);

  if (!record) {
    return res.status(404).json({ error: "File not found" });
  }

  const filePath = path.join(UPLOADS_DIR, record.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File missing on server" });
  }

  // Only allow reading if size is reasonably small (< 5MB)
  if (record.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: "File too large for inline text viewing" });
  }

  try {
    const text = fs.readFileSync(filePath, "utf-8");
    res.json({ content: text, record });
  } catch (err) {
    res.status(500).json({ error: "Failed to read text file content" });
  }
});

// 8. Update File Metadata (rename, description, tags)
app.put("/api/files/:id", (req, res) => {
  const { id } = req.params;
  const { originalName, description, tags } = req.body;

  const records = getMetadata();
  const index = records.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "File not found" });
  }

  if (originalName && typeof originalName === "string") {
    records[index].originalName = originalName.trim();
    records[index].category = detectCategory(records[index].mimeType, originalName);
  }
  if (typeof description === "string") {
    records[index].description = description.trim();
  }
  if (Array.isArray(tags)) {
    records[index].tags = tags.map((t) => t.trim()).filter(Boolean);
  }

  saveMetadata(records);
  res.json({ message: "File metadata updated", file: records[index] });
});

// 9. Delete File
app.delete("/api/files/:id", (req, res) => {
  const { id } = req.params;
  const records = getMetadata();
  const record = records.find((r) => r.id === id);

  if (record) {
    const filePath = path.join(UPLOADS_DIR, record.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error deleting physical file:", err);
      }
    }
  }

  const remainingRecords = records.filter((r) => r.id !== id);
  saveMetadata(remainingRecords);

  res.json({ message: "File deleted successfully" });
});

// 10. Bulk Delete
app.post("/api/files/bulk-delete", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No file IDs provided" });
  }

  let records = getMetadata();
  let deletedCount = 0;

  for (const id of ids) {
    const record = records.find((r) => r.id === id);
    if (record) {
      const filePath = path.join(UPLOADS_DIR, record.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(e);
        }
      }
      deletedCount++;
    }
  }

  records = records.filter((r) => !ids.includes(r.id));
  saveMetadata(records);

  res.json({ message: `${deletedCount} file(s) deleted successfully` });
});


// Start server with Vite middleware or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
