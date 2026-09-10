import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Written straight into apps/web/public/uploads so Next.js serves them as
// static files at /uploads/<file> with zero extra wiring. Swap for
// Cloudinary/S3 later by changing just this storage engine — everywhere else
// in the schema only ever stores the resulting URL string.
const uploadDir = path.resolve(__dirname, "../../../web/public/uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

function imageFileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed"));
}

export const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function publicUrlFor(filename: string): string {
  return `/uploads/${filename}`;
}
