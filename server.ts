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
const USERS_FILE = path.join(UPLOADS_DIR, "users.json");
const SETTINGS_FILE = path.join(UPLOADS_DIR, "settings.json");

interface UserRecord {
  id: string;
  username: string;
  password?: string;
  role: 'administrator' | 'normal';
  fullName: string;
  avatar: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface WallpaperConfig {
  id: string;
  name: string;
  url: string;
  blur: number;
  overlayOpacity: number;
  brightness: number;
  updatedBy: string;
  updatedAt: string;
}

interface SettingsRecord {
  activeWallpaper: WallpaperConfig;
  presets: Array<{ id: string; name: string; url: string; category: string }>;
}

// Initial default users
const DEFAULT_USERS: UserRecord[] = [
  {
    id: "user-admin-1",
    username: "akbar293838",
    password: "27112009",
    role: "administrator",
    fullName: "System Administrator",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    createdAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "user-normal-1",
    username: "user",
    password: "user123",
    role: "normal",
    fullName: "John Normal User",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    createdAt: "2026-08-01T10:00:00.000Z",
  }
];

// Initial default settings
const DEFAULT_SETTINGS: SettingsRecord = {
  activeWallpaper: {
    id: "wp-1",
    name: "Aurora Borealis Night",
    url: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=2000&q=80",
    blur: 0,
    overlayOpacity: 0.35,
    brightness: 0.85,
    updatedBy: "System Administrator",
    updatedAt: new Date().toISOString(),
  },
  presets: [
    {
      id: "wp-1",
      name: "Aurora Borealis Night",
      url: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=2000&q=80",
      category: "Nature"
    },
    {
      id: "wp-2",
      name: "Cyberpunk Neon City",
      url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=2000&q=80",
      category: "Cyberpunk"
    },
    {
      id: "wp-3",
      name: "Minimalist Mountain Range",
      url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80",
      category: "Landscape"
    },
    {
      id: "wp-4",
      name: "Deep Cosmic Nebula",
      url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=80",
      category: "Space"
    },
    {
      id: "wp-5",
      name: "Abstract Geometric Glass",
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80",
      category: "Abstract"
    },
    {
      id: "wp-6",
      name: "Misty Pine Forest",
      url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2000&q=80",
      category: "Nature"
    },
    {
      id: "wp-7",
      name: "Golden Sunset Ocean",
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80",
      category: "Nature"
    },
    {
      id: "wp-8",
      name: "Dark Tech Hex Matrix",
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=2000&q=80",
      category: "Cyberpunk"
    }
  ]
};

// Users helper
function getUsers(): UserRecord[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), "utf-8");
      return DEFAULT_USERS;
    }
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    let users: UserRecord[] = JSON.parse(data);

    let needsSave = false;
    const adminIndex = users.findIndex(u => u.id === "user-admin-1" || u.username === "admin" || u.username === "akbar293838");
    if (adminIndex !== -1) {
      if (users[adminIndex].username === "admin" || users[adminIndex].password === "admin123") {
        users[adminIndex].username = "akbar293838";
        users[adminIndex].password = "27112009";
        needsSave = true;
      }
    } else {
      users.unshift(DEFAULT_USERS[0]);
      needsSave = true;
    }

    if (needsSave) {
      saveUsers(users);
    }

    return users;
  } catch (err) {
    console.error("Error reading users:", err);
    return DEFAULT_USERS;
  }
}

function saveUsers(users: UserRecord[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving users:", err);
  }
}

// Cleanup wallpaper presets and active wallpaper if their underlying file was deleted
function cleanupWallpaperSettings(settings: SettingsRecord): boolean {
  try {
    const records = getMetadata();
    const validFileIds = new Set(records.map(r => r.id));
    let modified = false;

    const filteredPresets = settings.presets.filter(preset => {
      const match = preset.url.match(/\/api\/files\/([^\/]+)\/view/);
      if (match) {
        const fileId = match[1];
        if (!validFileIds.has(fileId)) {
          modified = true;
          return false;
        }
      }
      return true;
    });

    if (filteredPresets.length !== settings.presets.length) {
      settings.presets = filteredPresets;
    }

    const activeMatch = settings.activeWallpaper.url.match(/\/api\/files\/([^\/]+)\/view/);
    if (activeMatch) {
      const activeFileId = activeMatch[1];
      if (!validFileIds.has(activeFileId)) {
        const defaultPreset = settings.presets[0] || DEFAULT_SETTINGS.presets[0];
        settings.activeWallpaper = {
          id: `wp-${Date.now()}`,
          name: defaultPreset.name,
          url: defaultPreset.url,
          blur: 0,
          overlayOpacity: 0.35,
          brightness: 0.85,
          updatedBy: "System",
          updatedAt: new Date().toISOString(),
        };
        modified = true;
      }
    }

    return modified;
  } catch (err) {
    console.error("Error cleaning wallpaper settings:", err);
    return false;
  }
}

// Settings / Wallpaper helper
function getSettings(): SettingsRecord {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), "utf-8");
      return DEFAULT_SETTINGS;
    }
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const settings: SettingsRecord = JSON.parse(data);
    if (cleanupWallpaperSettings(settings)) {
      saveSettings(settings);
    }
    return settings;
  } catch (err) {
    console.error("Error reading settings:", err);
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: SettingsRecord) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving settings:", err);
  }
}

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

// --- AUTH & USER CONTROL ENDPOINTS ---

// Login
app.post("/api/auth/login", (req, res) => {
  const { username, password, syncUsers } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  let users = getUsers();

  // If client passed syncUsers, rehydrate missing accounts
  if (Array.isArray(syncUsers) && syncUsers.length > 0) {
    let modified = false;
    for (const cu of syncUsers) {
      if (!cu || !cu.username) continue;
      const idx = users.findIndex(
        (u) => u.id === cu.id || u.username.toLowerCase() === cu.username.toLowerCase()
      );
      if (idx === -1) {
        users.push({
          id: cu.id || `user-${crypto.randomUUID().slice(0, 8)}`,
          username: cu.username,
          password: cu.password || password,
          role: cu.role === "administrator" ? "administrator" : "normal",
          fullName: cu.fullName || cu.username,
          avatar: cu.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
          createdAt: cu.createdAt || new Date().toISOString(),
        });
        modified = true;
      }
    }
    if (modified) {
      saveUsers(users);
    }
  }

  const userIndex = users.findIndex(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
  );

  if (userIndex === -1) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  // Update last login
  users[userIndex].lastLoginAt = new Date().toISOString();
  saveUsers(users);

  const { password: _, ...userWithoutPassword } = users[userIndex];
  res.json({ message: "Login successful", user: userWithoutPassword });
});

// Sync Users (Client-side persistent backup restore)
app.post("/api/users/sync", (req, res) => {
  const { users: clientUsers } = req.body;
  if (!Array.isArray(clientUsers)) {
    return res.status(400).json({ error: "Invalid sync format" });
  }

  const currentUsers = getUsers();
  let modified = false;

  for (const cu of clientUsers) {
    if (!cu || !cu.username) continue;
    const existingIndex = currentUsers.findIndex(
      (u) => u.id === cu.id || u.username.toLowerCase() === cu.username.toLowerCase()
    );

    if (existingIndex === -1) {
      currentUsers.push({
        id: cu.id || `user-${crypto.randomUUID().slice(0, 8)}`,
        username: cu.username,
        password: cu.password || "27112009",
        role: cu.role === "administrator" ? "administrator" : "normal",
        fullName: cu.fullName || cu.username,
        avatar: cu.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        createdAt: cu.createdAt || new Date().toISOString(),
      });
      modified = true;
    } else if (cu.password && currentUsers[existingIndex].password !== cu.password) {
      currentUsers[existingIndex].password = cu.password;
      modified = true;
    }
  }

  if (modified) {
    saveUsers(currentUsers);
  }

  res.json({ message: "Users synchronized", users: currentUsers });
});

// List Users
app.get("/api/users", (_req, res) => {
  const users = getUsers();
  const safeUsers = users.map(({ password: _, ...u }) => u);
  res.json(safeUsers);
});

// Create User (Admin action)
app.post("/api/users", (req, res) => {
  const { username, password, role, fullName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
    return res.status(400).json({ error: "Username already exists" });
  }

  const newUser: UserRecord = {
    id: `user-${crypto.randomUUID().slice(0, 8)}`,
    username: username.trim(),
    password: password.trim(),
    role: role === "administrator" ? "administrator" : "normal",
    fullName: fullName ? fullName.trim() : username.trim(),
    avatar: role === "administrator"
      ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
      : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ message: "User created successfully", user: safeUser, record: newUser });
});

// Update User (Admin action or self)
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { role, fullName, password } = req.body;

  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  if (role && (role === "administrator" || role === "normal")) {
    users[index].role = role;
  }
  if (fullName && typeof fullName === "string") {
    users[index].fullName = fullName.trim();
  }
  if (password && typeof password === "string" && password.trim() !== "") {
    users[index].password = password.trim();
  }

  saveUsers(users);
  const { password: _, ...safeUser } = users[index];
  res.json({ message: "User updated successfully", user: safeUser });
});

// Delete User (Admin action)
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  let users = getUsers();
  const target = users.find((u) => u.id === id);

  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }

  // Prevent deleting the main admin
  if (target.username === "akbar293838" || target.username === "admin" || target.id === "user-admin-1") {
    return res.status(400).json({ error: "Cannot delete primary System Administrator account" });
  }

  users = users.filter((u) => u.id !== id);
  saveUsers(users);
  res.json({ message: "User deleted successfully" });
});

// --- WALLPAPER ENDPOINTS ---

// Get current active wallpaper & presets
app.get("/api/wallpaper", (_req, res) => {
  const settings = getSettings();
  res.json(settings);
});

// Update active wallpaper (Admin action or live preview)
app.post("/api/wallpaper", (req, res) => {
  const { url, name, blur, overlayOpacity, brightness, updatedBy } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Wallpaper URL is required" });
  }

  const settings = getSettings();
  settings.activeWallpaper = {
    id: `wp-${Date.now()}`,
    name: name || "Custom Selected Wallpaper",
    url,
    blur: typeof blur === "number" ? blur : settings.activeWallpaper.blur ?? 0,
    overlayOpacity: typeof overlayOpacity === "number" ? overlayOpacity : settings.activeWallpaper.overlayOpacity ?? 0.35,
    brightness: typeof brightness === "number" ? brightness : settings.activeWallpaper.brightness ?? 0.85,
    updatedBy: updatedBy || "Administrator",
    updatedAt: new Date().toISOString(),
  };

  saveSettings(settings);
  res.json({ message: "Wallpaper updated successfully", activeWallpaper: settings.activeWallpaper });
});

// Upload custom image as active wallpaper
app.post("/api/wallpaper/upload", upload.single("wallpaper"), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No wallpaper image provided" });
  }

  const category = detectCategory(file.mimetype || "image/jpeg", file.originalname);
  const fileRecord: FileRecord = {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    mimeType: file.mimetype || "image/jpeg",
    uploadDate: new Date().toISOString(),
    category,
    tags: ["wallpaper", "custom-background"],
    description: "Custom uploaded wallpaper",
    downloadCount: 0,
  };

  // Save to metadata as well so it appears in file manager
  const files = getMetadata();
  saveMetadata([fileRecord, ...files]);

  const wallpaperUrl = `/api/files/${fileRecord.id}/view`;
  const settings = getSettings();

  settings.activeWallpaper = {
    id: `wp-${Date.now()}`,
    name: file.originalname,
    url: wallpaperUrl,
    blur: 0,
    overlayOpacity: 0.35,
    brightness: 0.85,
    updatedBy: req.body.updatedBy || "Administrator",
    updatedAt: new Date().toISOString(),
  };

  // Add to presets
  settings.presets.unshift({
    id: `wp-preset-${Date.now()}`,
    name: file.originalname,
    url: wallpaperUrl,
    category: "Custom Upload",
  });

  saveSettings(settings);
  res.status(201).json({ message: "Custom wallpaper uploaded and activated", activeWallpaper: settings.activeWallpaper });
});

// Delete custom wallpaper preset
app.delete("/api/wallpaper/preset/:id", (req, res) => {
  const { id } = req.params;
  const settings = getSettings();

  const presetToDelete = settings.presets.find((p) => p.id === id);
  if (!presetToDelete) {
    return res.status(404).json({ error: "Wallpaper preset not found" });
  }

  // If preset points to a file in uploads, remove physical file & metadata as well
  const fileMatch = presetToDelete.url.match(/\/api\/files\/([^\/]+)\/view/);
  if (fileMatch) {
    const fileId = fileMatch[1];
    const records = getMetadata();
    const fileRecord = records.find(r => r.id === fileId);
    if (fileRecord) {
      const filePath = path.join(UPLOADS_DIR, fileRecord.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      saveMetadata(records.filter(r => r.id !== fileId));
    }
  }

  // Remove preset
  settings.presets = settings.presets.filter((p) => p.id !== id);

  // If deleted preset was active, reset active wallpaper
  if (settings.activeWallpaper.url === presetToDelete.url) {
    const fallback = settings.presets[0] || DEFAULT_SETTINGS.presets[0];
    settings.activeWallpaper = {
      id: `wp-${Date.now()}`,
      name: fallback.name,
      url: fallback.url,
      blur: 0,
      overlayOpacity: 0.35,
      brightness: 0.85,
      updatedBy: "System",
      updatedAt: new Date().toISOString(),
    };
  }

  saveSettings(settings);
  res.json({ message: "Wallpaper preset removed successfully", settings });
});

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

  // Query actual machine disk storage capacity
  let serverCapacityBytes = 30 * 1024 * 1024 * 1024; // fallback default
  let serverFreeBytes: number | undefined;

  try {
    if (typeof fs.statfsSync === "function") {
      const diskStats = fs.statfsSync(UPLOADS_DIR);
      if (diskStats.bsize && diskStats.blocks) {
        serverCapacityBytes = diskStats.bsize * diskStats.blocks;
      }
      if (diskStats.bsize && diskStats.bavail) {
        serverFreeBytes = diskStats.bsize * diskStats.bavail;
      }
    }
  } catch (err) {
    console.error("Error reading server disk capacity:", err);
  }

  res.json({
    totalFiles,
    totalSize,
    totalDownloads,
    serverCapacityBytes,
    serverFreeBytes,
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
