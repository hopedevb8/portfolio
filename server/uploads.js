const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const rootDir = path.join(__dirname, '..');
const uploadsDirectoryPath = process.env.UPLOADS_DIRECTORY_PATH
  ? path.resolve(rootDir, process.env.UPLOADS_DIRECTORY_PATH)
  : path.join(__dirname, 'uploads');
const featuredUploadsDirectoryPath = path.join(uploadsDirectoryPath, 'featured');
const maxFeaturedUploadBytes = Number(process.env.FEATURED_IMAGE_MAX_UPLOAD_BYTES || 5 * 1024 * 1024);

const supportedImageMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
]);

const contentTypeByExtension = new Map(
  [...supportedImageMimeTypes.entries()].map(([mimeType, extension]) => [extension, mimeType]),
);

const ensureDirectory = directoryPath => {
  fs.mkdirSync(directoryPath, { recursive: true });
};

const slugify = value =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const createUploadFilename = (fileName, extension) => {
  const baseName = slugify(path.parse(fileName).name) || 'featured-project';
  const suffix = crypto.randomBytes(6).toString('hex');
  return `${baseName}-${Date.now()}-${suffix}${extension}`;
};

const parseDataUrl = dataUrl => {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,([a-z0-9+/=]+)$/i);

  if (!match) {
    throw new Error('Featured image payload must be a valid base64 data URL.');
  }

  return {
    mimeType: match[1].toLowerCase(),
    rawBase64: match[2],
  };
};

const normalizeFeaturedUploadPayload = payload => {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new Error('Upload payload must be a JSON object.');
  }

  const fileName = String(payload.fileName || '').trim();
  const { mimeType, rawBase64 } = parseDataUrl(payload.dataUrl);
  const extension = supportedImageMimeTypes.get(mimeType);

  if (!fileName) {
    throw new Error('Featured image upload must include a file name.');
  }

  if (!extension) {
    throw new Error('Featured image must be JPG, PNG, WebP, GIF, or AVIF.');
  }

  const buffer = Buffer.from(rawBase64, 'base64');

  if (!buffer.length) {
    throw new Error('Featured image upload is empty.');
  }

  if (buffer.length > maxFeaturedUploadBytes) {
    throw new Error(`Featured image must be ${Math.floor(maxFeaturedUploadBytes / (1024 * 1024))}MB or smaller.`);
  }

  return {
    buffer,
    fileName,
    mimeType,
    extension,
  };
};

const storeFeaturedUpload = payload => {
  const upload = normalizeFeaturedUploadPayload(payload);
  ensureDirectory(featuredUploadsDirectoryPath);

  const storedFileName = createUploadFilename(upload.fileName, upload.extension);
  const absoluteFilePath = path.join(featuredUploadsDirectoryPath, storedFileName);
  fs.writeFileSync(absoluteFilePath, upload.buffer);

  return {
    fileName: storedFileName,
    mimeType: upload.mimeType,
    bytes: upload.buffer.length,
    imageUrl: `/uploads/featured/${storedFileName}`,
    absoluteFilePath,
  };
};

const isManagedFeaturedUploadPath = imageUrl => /^\/uploads\/featured\/[^/]+$/i.test(String(imageUrl || ''));

const resolveManagedUploadFilePath = imageUrl => {
  if (!isManagedFeaturedUploadPath(imageUrl)) {
    return null;
  }

  const fileName = path.basename(imageUrl);
  const absoluteFilePath = path.resolve(featuredUploadsDirectoryPath, fileName);

  if (!absoluteFilePath.startsWith(featuredUploadsDirectoryPath)) {
    return null;
  }

  return absoluteFilePath;
};

const readUploadedAsset = imageUrl => {
  const absoluteFilePath = resolveManagedUploadFilePath(imageUrl);

  if (!absoluteFilePath || !fs.existsSync(absoluteFilePath)) {
    return null;
  }

  const extension = path.extname(absoluteFilePath).toLowerCase();
  const mimeType = contentTypeByExtension.get(extension) || 'application/octet-stream';

  return {
    absoluteFilePath,
    mimeType,
    buffer: fs.readFileSync(absoluteFilePath),
  };
};

const deleteManagedFeaturedUpload = imageUrl => {
  const absoluteFilePath = resolveManagedUploadFilePath(imageUrl);

  if (!absoluteFilePath || !fs.existsSync(absoluteFilePath)) {
    return false;
  }

  fs.unlinkSync(absoluteFilePath);
  return true;
};

module.exports = {
  uploadsDirectoryPath,
  maxFeaturedUploadBytes,
  storeFeaturedUpload,
  readUploadedAsset,
  isManagedFeaturedUploadPath,
  deleteManagedFeaturedUpload,
};
