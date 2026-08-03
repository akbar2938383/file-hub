import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import JSZip from "jszip";
import { createServer as createViteServer } from "vite";

interface FileRecord {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadDate: string;
  category: 'image' | 'document' | 'audio' | 'video' | 'archive' | 'code' | 'folder' | 'other';
  tags: string[];
  description?: string;
  downloadCount: number;
  uploadedBy?: string;
  uploadedByRole?: 'administrator' | 'normal';
  isFolder?: boolean;
  folderPath?: string;
  relativePath?: string;
  itemCount?: number;
}

const app = express();
const PORT = 3000;

// Ensure upload directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const TEMP_CHUNKS_DIR = path.join(UPLOADS_DIR, "temp_chunks");
if (!fs.existsSync(TEMP_CHUNKS_DIR)) {
  fs.mkdirSync(TEMP_CHUNKS_DIR, { recursive: true });
}

const METADATA_FILE = path.join(UPLOADS_DIR, "metadata.json");
const USERS_FILE = path.join(UPLOADS_DIR, "users.json");
const SETTINGS_FILE = path.join(UPLOADS_DIR, "settings.json");
const DELETED_IDS_FILE = path.join(UPLOADS_DIR, "deleted_ids.json");

function getDeletedIds(): Set<string> {
  try {
    if (!fs.existsSync(DELETED_IDS_FILE)) {
      return new Set();
    }
    const data = fs.readFileSync(DELETED_IDS_FILE, "utf-8");
    const arr = JSON.parse(data);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (err) {
    console.error("Error reading deleted ids:", err);
    return new Set();
  }
}

function addDeletedIds(ids: string[]) {
  try {
    const current = getDeletedIds();
    ids.forEach((id) => current.add(id));
    fs.writeFileSync(DELETED_IDS_FILE, JSON.stringify(Array.from(current), null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving deleted ids:", err);
  }
}

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
  isLive?: boolean;
  liveType?: string;
  videoUrl?: string;
}

interface SettingsRecord {
  activeWallpaper: WallpaperConfig;
  presets: Array<{
    id: string;
    name: string;
    url: string;
    category: string;
    isLive?: boolean;
    liveType?: string;
    videoUrl?: string;
  }>;
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
    isLive: false,
    liveType: "aurora",
    videoUrl: ""
  },
  presets: [
    {
      id: "wp-live-1",
      name: "✨ Live Aurora Boreal Wave",
      url: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=2000&q=80",
      category: "Live Animated",
      isLive: true,
      liveType: "aurora"
    },
    {
      id: "wp-live-2",
      name: "🌌 Live Cosmic Star Particles",
      url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=80",
      category: "Live Animated",
      isLive: true,
      liveType: "particles"
    },
    {
      id: "wp-live-3",
      name: "🔮 Live Deep Nebula Glow",
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80",
      category: "Live Animated",
      isLive: true,
      liveType: "nebula"
    },
    {
      id: "wp-live-4",
      name: "💻 Live Digital Matrix Rain",
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=2000&q=80",
      category: "Live Animated",
      isLive: true,
      liveType: "matrix"
    },
    {
      id: "wp-live-5",
      name: "🌊 Live Fluid Wave Flow",
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80",
      category: "Live Animated",
      isLive: true,
      liveType: "waves"
    },
    {
      id: "wp-live-6",
      name: "🌐 Live Synthwave Cyber Grid",
      url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=2000&q=80",
      category: "Live Animated",
      isLive: true,
      liveType: "cybergrid"
    },
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
    const records: FileRecord[] = JSON.parse(data);
    let modified = false;

    records.forEach((r) => {
      if (r.folderPath) {
        const cleanFolderPath = r.folderPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        if (cleanFolderPath !== r.folderPath) {
          r.folderPath = cleanFolderPath;
          modified = true;
        }
      } else if (r.folderPath === undefined || r.folderPath === null) {
        r.folderPath = '';
        modified = true;
      }

      if (!r.isFolder && r.originalName) {
        const cleanName = path.basename(r.originalName.replace(/\\/g, '/'));
        if (cleanName !== r.originalName) {
          r.originalName = cleanName;
          modified = true;
        }
      }
    });

    if (modified) {
      saveMetadata(records);
    }

    return records;
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
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max per file
    fieldSize: 100 * 1024 * 1024,
    files: 200,
  },
});

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

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
  const { role, fullName, password, avatar } = req.body;

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
  if (avatar && typeof avatar === "string" && avatar.trim() !== "") {
    users[index].avatar = avatar.trim();
  }

  saveUsers(users);
  const { password: _, ...safeUser } = users[index];
  res.json({ message: "User updated successfully", user: safeUser });
});

// Update User Profile Picture / Avatar via File Upload
app.post("/api/users/:id/avatar", upload.single("avatar"), (req, res) => {
  const { id } = req.params;
  const file = req.file;

  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  const recordId = `avatar-${crypto.randomUUID()}`;
  const avatarUrl = `/api/files/${recordId}/view`;
  users[index].avatar = avatarUrl;

  // Also register image in metadata so it exists in FileVault
  const category = detectCategory(file.mimetype || "image/png", file.originalname);
  const record: FileRecord = {
    id: recordId,
    originalName: `Avatar_${users[index].username}_${file.originalname}`,
    filename: file.filename,
    size: file.size,
    mimeType: file.mimetype || "image/png",
    uploadDate: new Date().toISOString(),
    category,
    tags: ["avatar", "user-pfp"],
    description: `Profile picture for @${users[index].username}`,
    downloadCount: 0,
    uploadedBy: users[index].username,
    uploadedByRole: users[index].role,
  };

  const existingRecords = getMetadata();
  saveMetadata([record, ...existingRecords]);

  saveUsers(users);
  const { password: _, ...safeUser } = users[index];
  res.json({ message: "Avatar updated successfully", user: safeUser, avatarUrl });
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

// Sync wallpaper settings from client persistent backup
app.post("/api/wallpaper/sync", (req, res) => {
  const { activeWallpaper, presets } = req.body;
  if (!activeWallpaper && !presets) {
    return res.status(400).json({ error: "Invalid sync payload" });
  }

  const current = getSettings();
  let modified = false;

  if (activeWallpaper && activeWallpaper.url) {
    // Restore active wallpaper if server was reset
    current.activeWallpaper = {
      ...current.activeWallpaper,
      ...activeWallpaper,
      updatedAt: new Date().toISOString(),
    };
    modified = true;
  }

  if (Array.isArray(presets) && presets.length > 0) {
    for (const p of presets) {
      if (!p || !p.id) continue;
      const idx = current.presets.findIndex((cp) => cp.id === p.id || cp.url === p.url);
      if (idx === -1) {
        current.presets.push(p);
        modified = true;
      }
    }
  }

  if (modified) {
    saveSettings(current);
  }

  res.json({ message: "Wallpaper settings synchronized", settings: current });
});

// Update active wallpaper (Admin action or live preview)
app.post("/api/wallpaper", (req, res) => {
  const { url, name, blur, overlayOpacity, brightness, updatedBy, isLive, liveType, videoUrl } = req.body;
  if (!url && !isLive) {
    return res.status(400).json({ error: "Wallpaper URL or Live Mode is required" });
  }

  const settings = getSettings();
  settings.activeWallpaper = {
    id: `wp-${Date.now()}`,
    name: name || (isLive ? "Live Animated Wallpaper" : "Custom Selected Wallpaper"),
    url: url || "",
    blur: typeof blur === "number" ? blur : settings.activeWallpaper.blur ?? 0,
    overlayOpacity: typeof overlayOpacity === "number" ? overlayOpacity : settings.activeWallpaper.overlayOpacity ?? 0.35,
    brightness: typeof brightness === "number" ? brightness : settings.activeWallpaper.brightness ?? 0.85,
    updatedBy: updatedBy || "Administrator",
    updatedAt: new Date().toISOString(),
    isLive: Boolean(isLive),
    liveType: liveType || "aurora",
    videoUrl: videoUrl || "",
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

// Sync file metadata records from client backup
app.post("/api/files/sync", (req, res) => {
  const { files: clientFiles } = req.body;
  if (!Array.isArray(clientFiles)) {
    return res.status(400).json({ error: "Invalid files sync format" });
  }

  const currentRecords = getMetadata();
  const deletedIds = getDeletedIds();
  let modified = false;

  for (const cf of clientFiles) {
    if (!cf || !cf.id || !cf.originalName) continue;
    // Do not restore items that were explicitly deleted
    if (deletedIds.has(cf.id)) continue;

    const existing = currentRecords.find((r) => r.id === cf.id);
    if (!existing) {
      currentRecords.push(cf);
      modified = true;
    }
  }

  if (modified) {
    saveMetadata(currentRecords);
  }

  res.json({ message: "File metadata synchronized", records: currentRecords });
});

// Rehydrate missing binary file from client IndexedDB backup
app.post("/api/files/rehydrate", upload.single("file"), (req, res) => {
  const file = req.file;
  const {
    id,
    originalName,
    filename,
    folderPath = "",
    relativePath = "",
    category,
    mimeType,
    uploadedBy = "public",
    uploadedByRole = "normal",
    description = "",
    tags,
    uploadDate,
  } = req.body;

  if (!id || !originalName) {
    return res.status(400).json({ error: "Missing required rehydration metadata" });
  }

  const existingRecords = getMetadata();
  const deletedIds = getDeletedIds();
  if (deletedIds.has(id)) {
    return res.status(400).json({ error: "File was previously deleted" });
  }

  let targetFilename = filename || (file ? file.filename : "");
  if (file && filename && file.filename !== filename) {
    const targetPath = path.join(UPLOADS_DIR, filename);
    try {
      fs.renameSync(file.path, targetPath);
      targetFilename = filename;
    } catch (e) {
      targetFilename = file.filename;
    }
  }

  const relPath = relativePath || originalName;
  const { fileFolderPath, createdFolders } = ensureFolderHierarchy(
    existingRecords,
    folderPath,
    relPath,
    uploadedBy,
    (uploadedByRole === "administrator" ? "administrator" : "normal") as "administrator" | "normal"
  );

  let parsedTags: string[] = [];
  if (tags) {
    try {
      parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
    } catch {
      parsedTags = [];
    }
  }

  const record: FileRecord = {
    id,
    originalName,
    filename: targetFilename,
    size: file ? file.size : Number(req.body.size || 0),
    mimeType: mimeType || (file ? file.mimetype : "application/octet-stream"),
    uploadDate: uploadDate || new Date().toISOString(),
    category: category || detectCategory(mimeType || "", originalName),
    tags: parsedTags,
    description: description || "",
    downloadCount: Number(req.body.downloadCount || 0),
    uploadedBy,
    uploadedByRole: (uploadedByRole === "administrator" ? "administrator" : "normal") as "administrator" | "normal",
    folderPath: fileFolderPath,
    relativePath: relPath,
  };

  const existingIndex = existingRecords.findIndex((r) => r.id === id);
  if (existingIndex !== -1) {
    existingRecords[existingIndex] = record;
  } else {
    existingRecords.unshift(record);
  }

  const updatedRecords = [...createdFolders, ...existingRecords];
  const finalRecords = updatedRecords.filter((r, idx, self) => self.findIndex((x) => x.id === r.id) === idx);
  saveMetadata(finalRecords);

  res.status(200).json({ message: "File rehydrated successfully", file: record });
});

// 1. Get all files with filtering & search
app.get("/api/files", (req, res) => {
  const { search, category, sort } = req.query;
  let records = getMetadata();

  if (category && typeof category === "string" && category !== "all") {
    // Preserve folder containers when filtering by category
    records = records.filter((r) => r.isFolder || r.category === category);
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

// Helper to ensure folder hierarchy exists for folder uploads
function ensureFolderHierarchy(
  existingRecords: FileRecord[],
  baseFolderPath: string,
  relPath: string,
  uploadedBy: string,
  uploadedByRole: 'administrator' | 'normal'
): { fileFolderPath: string; createdFolders: FileRecord[] } {
  const createdFolders: FileRecord[] = [];

  let cleanRel = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const cleanBase = baseFolderPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

  if (cleanBase) {
    if (cleanRel === cleanBase || cleanRel.startsWith(cleanBase + '/')) {
      cleanRel = cleanRel.slice(cleanBase.length).replace(/^\/+/, '');
    }
  }

  const parts = cleanRel.split('/').filter(Boolean);

  if (parts.length <= 1) {
    return { fileFolderPath: cleanBase, createdFolders };
  }

  const dirParts = parts.slice(0, -1);
  let accumulatedPath = cleanBase;

  for (let i = 0; i < dirParts.length; i++) {
    const dirName = dirParts[i];
    const parentPath = accumulatedPath;
    const existingFolder = existingRecords.find(
      (r) => r.isFolder && (r.folderPath || '') === parentPath && r.originalName.toLowerCase() === dirName.toLowerCase()
    ) || createdFolders.find(
      (r) => r.isFolder && (r.folderPath || '') === parentPath && r.originalName.toLowerCase() === dirName.toLowerCase()
    );

    const actualDirName = existingFolder ? existingFolder.originalName : dirName;
    const fullFolderPath = parentPath ? `${parentPath}/${actualDirName}` : actualDirName;

    if (!existingFolder) {
      const folderRecord: FileRecord = {
        id: `folder-${crypto.randomUUID()}`,
        originalName: dirName,
        filename: '',
        size: 0,
        mimeType: 'inode/directory',
        uploadDate: new Date().toISOString(),
        category: 'folder',
        tags: ['folder'],
        description: 'Uploaded folder container',
        downloadCount: 0,
        uploadedBy,
        uploadedByRole,
        isFolder: true,
        folderPath: parentPath,
      };
      createdFolders.push(folderRecord);
    }

    accumulatedPath = fullFolderPath;
  }

  return { fileFolderPath: accumulatedPath, createdFolders };
}

// Create Custom Folder
app.post("/api/folders/create", (req, res) => {
  const { name } = req.body;
  const parentPath = req.body.parentPath || req.body.parentFolderPath || "";
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Folder name is required" });
  }

  const cleanName = name.trim().replace(/[\/\\]/g, "_");
  const uploadedBy = (req.headers["x-username"] as string) || (req.body.uploadedBy as string) || "public";
  const uploadedByRole = (req.headers["x-user-role"] as string) || (req.body.uploadedByRole as string) || "normal";

  const folderPath = parentPath ? parentPath.trim() : "";
  const existingRecords = getMetadata();

  const exists = existingRecords.some(
    (r) => r.isFolder && (r.folderPath || "") === folderPath && r.originalName.toLowerCase() === cleanName.toLowerCase()
  );

  if (exists) {
    return res.status(400).json({ error: "A folder with this name already exists in this location" });
  }

  const folderRecord: FileRecord = {
    id: `folder-${crypto.randomUUID()}`,
    originalName: cleanName,
    filename: "",
    size: 0,
    mimeType: "inode/directory",
    uploadDate: new Date().toISOString(),
    category: "folder",
    tags: ["folder"],
    description: "User created folder",
    downloadCount: 0,
    uploadedBy,
    uploadedByRole: (uploadedByRole === "administrator" ? "administrator" : "normal") as "administrator" | "normal",
    isFolder: true,
    folderPath,
  };

  saveMetadata([folderRecord, ...existingRecords]);
  res.status(201).json({ message: "Folder created successfully", folder: folderRecord });
});

// 3. Upload File(s) or Folder(s)
app.post("/api/files/upload", upload.array("files", 200), (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const uploadedBy = (req.headers["x-username"] as string) || (req.body.uploadedBy as string) || "public";
  const uploadedByRole = (req.headers["x-user-role"] as string) || (req.body.uploadedByRole as string) || "normal";
  const baseFolderPath = (req.body.folderPath as string) || "";

  let relativePaths: string[] = [];
  if (req.body.relativePaths) {
    try {
      relativePaths = typeof req.body.relativePaths === "string" ? JSON.parse(req.body.relativePaths) : req.body.relativePaths;
    } catch (e) {
      if (Array.isArray(req.body.relativePaths)) {
        relativePaths = req.body.relativePaths;
      }
    }
  }

  const existingRecords = getMetadata();
  const newRecords: FileRecord[] = [];
  const newlyCreatedFolders: FileRecord[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = relativePaths[i] || file.originalname;

    const { fileFolderPath, createdFolders } = ensureFolderHierarchy(
      [...existingRecords, ...newlyCreatedFolders],
      baseFolderPath,
      relPath,
      uploadedBy,
      (uploadedByRole === "administrator" ? "administrator" : "normal") as "administrator" | "normal"
    );

    newlyCreatedFolders.push(...createdFolders);

    const cleanOriginalName = path.basename(file.originalname.replace(/\\/g, "/"));
    const category = detectCategory(file.mimetype || "application/octet-stream", cleanOriginalName);
    const record: FileRecord = {
      id: crypto.randomUUID(),
      originalName: cleanOriginalName,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype || "application/octet-stream",
      uploadDate: new Date().toISOString(),
      category,
      tags: [],
      description: "",
      downloadCount: 0,
      uploadedBy,
      uploadedByRole: (uploadedByRole === "administrator" ? "administrator" : "normal") as "administrator" | "normal",
      folderPath: fileFolderPath,
      relativePath: relPath,
    };
    newRecords.push(record);
  }

  const updatedRecords = [...newRecords, ...newlyCreatedFolders, ...existingRecords];
  saveMetadata(updatedRecords);

  res.status(201).json({
    message: `${newRecords.length} file(s) uploaded successfully`,
    uploadedFiles: newRecords,
    createdFolders: newlyCreatedFolders,
  });
});

// 3b. Upload File Chunk (Resumable Chunked Upload)
app.post("/api/files/upload-chunk", upload.single("chunk"), (req, res) => {
  try {
    const file = req.file;
    const { uploadId, chunkIndex, totalChunks } = req.body;

    if (!file || !uploadId || chunkIndex === undefined || totalChunks === undefined) {
      return res.status(400).json({ error: "Missing chunk upload parameters" });
    }

    const chunkDir = path.join(TEMP_CHUNKS_DIR, uploadId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    const chunkPath = path.join(chunkDir, `chunk-${chunkIndex}`);
    try {
      fs.renameSync(file.path, chunkPath);
    } catch (e) {
      fs.copyFileSync(file.path, chunkPath);
      try { fs.unlinkSync(file.path); } catch (e2) {}
    }

    res.json({ message: `Chunk ${chunkIndex} received`, chunkIndex: Number(chunkIndex) });
  } catch (err: any) {
    console.error("Error in upload-chunk endpoint:", err);
    res.status(500).json({ error: err.message || "Failed to handle file chunk" });
  }
});

// 3c. Complete Chunked Upload
app.post("/api/files/upload-complete", (req, res) => {
  try {
    const {
      uploadId,
      totalChunks,
      originalName,
      relativePath = "",
      folderPath = "",
      fileSize = 0,
      mimeType = "application/octet-stream",
    } = req.body;

    if (!uploadId || totalChunks === undefined || !originalName) {
      return res.status(400).json({ error: "Missing upload complete parameters" });
    }

    const chunkDir = path.join(TEMP_CHUNKS_DIR, uploadId);
    if (!fs.existsSync(chunkDir)) {
      return res.status(400).json({ error: "Chunk data not found or expired" });
    }

    const total = Number(totalChunks);
    for (let i = 0; i < total; i++) {
      const cp = path.join(chunkDir, `chunk-${i}`);
      if (!fs.existsSync(cp)) {
        return res.status(400).json({ error: `Missing chunk ${i}` });
      }
    }

    const uploadedBy = (req.headers["x-username"] as string) || (req.body.uploadedBy as string) || "public";
    const uploadedByRole = (req.headers["x-user-role"] as string) || (req.body.uploadedByRole as string) || "normal";

    const cleanOriginalName = path.basename(originalName.replace(/\\/g, "/"));
    const ext = path.extname(cleanOriginalName);
    const uniqueId = crypto.randomUUID();
    const finalFilename = `${Date.now()}-${uniqueId.slice(0, 8)}${ext}`;
    const finalFilePath = path.join(UPLOADS_DIR, finalFilename);

    // Synchronously stitch chunks sequentially to prevent partial writes
    if (fs.existsSync(finalFilePath)) {
      try { fs.unlinkSync(finalFilePath); } catch (e) {}
    }

    for (let i = 0; i < total; i++) {
      const cp = path.join(chunkDir, `chunk-${i}`);
      if (fs.existsSync(cp)) {
        const chunkData = fs.readFileSync(cp);
        fs.appendFileSync(finalFilePath, chunkData);
        try {
          fs.unlinkSync(cp);
        } catch (e) {}
      }
    }

    try {
      fs.rmdirSync(chunkDir, { recursive: true });
    } catch (e) {}

    const relPath = relativePath || cleanOriginalName;
    const existingRecords = getMetadata();

    const { fileFolderPath, createdFolders } = ensureFolderHierarchy(
      existingRecords,
      folderPath,
      relPath,
      uploadedBy,
      (uploadedByRole === "administrator" ? "administrator" : "normal") as "administrator" | "normal"
    );

    const stats = fs.statSync(finalFilePath);
    const category = detectCategory(mimeType, cleanOriginalName);

    const record: FileRecord = {
      id: uniqueId,
      originalName: cleanOriginalName,
      filename: finalFilename,
      size: stats.size || Number(fileSize),
      mimeType: mimeType || "application/octet-stream",
      uploadDate: new Date().toISOString(),
      category,
      tags: [],
      description: "",
      downloadCount: 0,
      uploadedBy,
      uploadedByRole: (uploadedByRole === "administrator" ? "administrator" : "normal") as "administrator" | "normal",
      folderPath: fileFolderPath,
      relativePath: relPath,
    };

    const updatedRecords = [record, ...createdFolders, ...existingRecords];
    saveMetadata(updatedRecords);

    res.status(201).json({
      message: "File upload completed successfully",
      uploadedFile: record,
      createdFolders,
    });
  } catch (err: any) {
    console.error("Error in upload-complete endpoint:", err);
    res.status(500).json({ error: err.message || "Failed to finalize chunked upload" });
  }
});

// 4. Create Direct Text Note / Snippet file
app.post("/api/files/create-text", (req, res) => {
  const { title, content, extension = "txt", description = "", folderPath = "" } = req.body;
  if (!title || typeof content !== "string") {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const uploadedBy = (req.headers["x-username"] as string) || (req.body.uploadedBy as string) || "public";
  const uploadedByRole = (req.headers["x-user-role"] as string) || (req.body.uploadedByRole as string) || "normal";

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
    uploadedBy,
    uploadedByRole: (uploadedByRole === "administrator" ? "administrator" : "normal") as "administrator" | "normal",
    folderPath,
  };

  const existingRecords = getMetadata();
  saveMetadata([record, ...existingRecords]);

  res.status(201).json({ message: "File created successfully", file: record });
});

// Bulk Download ZIP Archive
app.post("/api/files/bulk-download-zip", async (req, res) => {
  const { ids, folderPath } = req.body;
  const records = getMetadata();
  let filesToZip: FileRecord[] = [];

  if (Array.isArray(ids) && ids.length > 0) {
    const directRecords = records.filter((r) => ids.includes(r.id));
    for (const rec of directRecords) {
      if (rec.isFolder) {
        const folderFullPath = rec.folderPath ? `${rec.folderPath}/${rec.originalName}` : rec.originalName;
        const subFiles = records.filter(
          (r) => !r.isFolder && ((r.folderPath || "") === folderFullPath || (r.folderPath || "").startsWith(folderFullPath + "/"))
        );
        filesToZip.push(...subFiles);
      } else {
        filesToZip.push(rec);
      }
    }
  } else if (folderPath !== undefined) {
    const targetPath = folderPath;
    filesToZip = records.filter(
      (r) => !r.isFolder && ((r.folderPath || "") === targetPath || (r.folderPath || "").startsWith(targetPath ? targetPath + "/" : ""))
    );
  } else {
    return res.status(400).json({ error: "No files or folder specified" });
  }

  // Deduplicate
  filesToZip = filesToZip.filter((file, idx, self) => self.findIndex((f) => f.id === file.id) === idx);

  if (filesToZip.length === 0) {
    return res.status(404).json({ error: "No files found to archive" });
  }

  try {
    const zip = new JSZip();

    for (const record of filesToZip) {
      const filePath = path.join(UPLOADS_DIR, record.filename);
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        let entryPath = record.originalName;
        if (record.folderPath) {
          entryPath = `${record.folderPath}/${record.originalName}`;
        }
        zip.file(entryPath, fileBuffer);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="FileVault_Export_${timestamp}.zip"`);
    res.setHeader("Content-Length", zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error("ZIP Generation Error:", err);
    res.status(500).json({ error: "Failed to generate ZIP archive" });
  }
});

// 5. Download File or Folder by ID
app.get("/api/files/:id/download", async (req, res) => {
  const { id } = req.params;
  const records = getMetadata();
  const recordIndex = records.findIndex((r) => r.id === id);

  if (recordIndex === -1) {
    return res.status(404).json({ error: "File or folder not found" });
  }

  const record = records[recordIndex];

  // If this item is a folder, create a ZIP archive of all contained files
  if (record.isFolder || record.category === "folder" || !record.filename) {
    const folderFullPath = record.folderPath ? `${record.folderPath}/${record.originalName}` : record.originalName;
    const subFiles = records.filter(
      (r) => !r.isFolder && ((r.folderPath || "") === folderFullPath || (r.folderPath || "").startsWith(folderFullPath + "/"))
    );

    try {
      const zip = new JSZip();
      let addedAny = false;

      for (const subRecord of subFiles) {
        if (subRecord.filename) {
          const filePath = path.join(UPLOADS_DIR, subRecord.filename);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const fileBuffer = fs.readFileSync(filePath);
            let relInFolder = subRecord.folderPath ? subRecord.folderPath.slice(folderFullPath.length).replace(/^\//, "") : "";
            let zipEntryPath = relInFolder
              ? `${record.originalName}/${relInFolder}/${subRecord.originalName}`
              : `${record.originalName}/${subRecord.originalName}`;
            zip.file(zipEntryPath, fileBuffer);
            addedAny = true;
          }
        }
      }

      if (!addedAny) {
        zip.file(`${record.originalName}/.keep`, "Empty Folder Archive");
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

      // Increment download count
      records[recordIndex].downloadCount += 1;
      saveMetadata(records);

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(record.originalName)}.zip"`);
      res.setHeader("Content-Length", zipBuffer.length);
      return res.send(zipBuffer);
    } catch (err: any) {
      console.error("Folder ZIP download error:", err);
      return res.status(500).json({ error: "Failed to create ZIP for folder" });
    }
  }

  const filePath = path.join(UPLOADS_DIR, record.filename);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
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

  if (record.isFolder || record.category === "folder" || !record.filename) {
    return res.status(400).send("Folders cannot be viewed directly as inline files");
  }

  const filePath = path.join(UPLOADS_DIR, record.filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
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

  if (record.isFolder || record.category === "folder" || !record.filename) {
    return res.status(400).json({ error: "Folders cannot be viewed as text content" });
  }

  const filePath = path.join(UPLOADS_DIR, record.filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
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

/**
 * Gets the clean, normalized full path of a file or folder record.
 */
function getItemFullPath(record: FileRecord): string {
  const fp = (record.folderPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const name = (record.originalName || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!fp) return name;
  return `${fp}/${name}`;
}

/**
 * Checks if candidate is a descendant (child, grandchild, etc.) of targetFolder.
 */
function isDescendantOfFolder(candidate: FileRecord, targetFolder: FileRecord): boolean {
  if (!targetFolder.isFolder) return false;
  if (candidate.id === targetFolder.id) return false;

  const targetFullPath = getItemFullPath(targetFolder).toLowerCase();
  const candFolderPath = (candidate.folderPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();

  if (!targetFullPath || !candFolderPath) return false;

  return candFolderPath === targetFullPath || candFolderPath.startsWith(targetFullPath + "/");
}

/**
 * Checks if candidate is a parent or ancestor folder of targetItem.
 */
function isAncestorOfItem(candidate: FileRecord, targetItem: FileRecord): boolean {
  if (!candidate.isFolder) return false;
  if (candidate.id === targetItem.id) return false;

  const candidateFullPath = getItemFullPath(candidate).toLowerCase();
  const targetFolderPath = (targetItem.folderPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();

  if (!candidateFullPath || !targetFolderPath) return false;

  return targetFolderPath === candidateFullPath || targetFolderPath.startsWith(candidateFullPath + "/");
}

/**
 * Recursively resolves all items to be deleted for a list of target item IDs.
 * Verifies child/parent relationships so deleting a file or nested folder never touches parent or sibling items.
 */
function getRecursiveDeletionList(targetIds: string[], allRecords: FileRecord[]): FileRecord[] {
  const resultIds = new Set<string>();
  const recordMap = new Map<string, FileRecord>();
  allRecords.forEach((r) => recordMap.set(r.id, r));

  for (const targetId of targetIds) {
    const target = recordMap.get(targetId);
    if (!target) continue;

    // Add target itself
    resultIds.add(target.id);

    // If target is a folder, find all verified descendants recursively
    if (target.isFolder) {
      for (const record of allRecords) {
        if (isDescendantOfFolder(record, target)) {
          // Double check: candidate must NOT be an ancestor
          if (!isAncestorOfItem(record, target)) {
            resultIds.add(record.id);
          }
        }
      }
    }
  }

  // Final verification pass: Ensure no item in deletion list is an ancestor of any directly requested target
  const finalRecords: FileRecord[] = [];
  for (const id of resultIds) {
    const rec = recordMap.get(id);
    if (!rec) continue;

    let isAccidentalAncestor = false;
    for (const targetId of targetIds) {
      const target = recordMap.get(targetId);
      if (target && isAncestorOfItem(rec, target)) {
        isAccidentalAncestor = true;
        break;
      }
    }

    if (!isAccidentalAncestor) {
      finalRecords.push(rec);
    }
  }

  return finalRecords;
}

// 9. Delete File or Folder
app.delete("/api/files/:id", (req, res) => {
  const { id } = req.params;
  const requesterRole = (req.headers["x-user-role"] as string) || (req.query.userRole as string) || "normal";
  let records = getMetadata();
  const record = records.find((r) => r.id === id);

  if (!record) {
    return res.status(404).json({ error: "File or folder not found" });
  }

  // Check if target item was created by administrator and requester is normal user
  if (record.uploadedByRole === "administrator" && requesterRole !== "administrator") {
    return res.status(403).json({
      error: "This item was created by an Administrator and cannot be deleted by normal users.",
    });
  }

  // Resolve full recursive deletion list with strict parent/child relationship checks
  const itemsToDelete = getRecursiveDeletionList([record.id], records);

  // Filter out any sub-items uploaded by administrator if requester is normal user
  const permittedItemsToDelete = itemsToDelete.filter((rec) => {
    if (rec.uploadedByRole === "administrator" && requesterRole !== "administrator") {
      return false;
    }
    return true;
  });

  for (const rec of permittedItemsToDelete) {
    if (!rec.isFolder && rec.filename) {
      const filePath = path.join(UPLOADS_DIR, rec.filename);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Error deleting physical file:", err);
        }
      }
    }
  }

  const deleteSet = new Set(permittedItemsToDelete.map((r) => r.id));
  addDeletedIds(Array.from(deleteSet));
  records = records.filter((r) => !deleteSet.has(r.id));
  saveMetadata(records);

  res.json({ message: record.isFolder ? "Folder and its contents deleted successfully" : "File deleted successfully" });
});

// 10. Bulk Delete
app.post("/api/files/bulk-delete", (req, res) => {
  const { ids, userRole } = req.body;
  const requesterRole = (req.headers["x-user-role"] as string) || userRole || "normal";

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No file IDs provided" });
  }

  let records = getMetadata();
  const targetRecords = records.filter((r) => ids.includes(r.id));
  const targetIds = targetRecords.map((r) => r.id);

  if (targetIds.length === 0) {
    return res.status(404).json({ error: "No valid files found for deletion" });
  }

  // Resolve full recursive deletion list with strict parent/child relationship checks
  const itemsToDelete = getRecursiveDeletionList(targetIds, records);

  // Filter out any items uploaded by administrator if requester is not administrator
  const allowedToDelete = itemsToDelete.filter((record) => {
    if (record.uploadedByRole === "administrator" && requesterRole !== "administrator") {
      return false;
    }
    return true;
  });

  if (allowedToDelete.length === 0) {
    return res.status(403).json({
      error: "Selected file(s) were uploaded by Administrator and cannot be deleted by normal users.",
    });
  }

  const allowedIds = new Set(allowedToDelete.map((r) => r.id));
  let deletedCount = 0;

  for (const record of allowedToDelete) {
    if (!record.isFolder && record.filename) {
      const filePath = path.join(UPLOADS_DIR, record.filename);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(e);
        }
      }
    }
    deletedCount++;
  }

  addDeletedIds(Array.from(allowedIds));
  records = records.filter((r) => !allowedIds.has(r.id));
  saveMetadata(records);

  const skippedCount = targetRecords.length - targetRecords.filter((r) => allowedIds.has(r.id)).length;
  let msg = `${deletedCount} file(s) deleted successfully.`;
  if (skippedCount > 0) {
    msg += ` (${skippedCount} file(s) uploaded by Administrator were protected and skipped)`;
  }

  res.json({ message: msg });
});

// Global Express & Multer Error Handling Middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Global express error:", err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File exceeds the 500 MB upload size limit." });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(err.status || 500).json({ error: err.message || "An unexpected error occurred on the server." });
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
  server.timeout = 0;
  server.keepAliveTimeout = 300000;
  server.headersTimeout = 305000;
}

startServer();
