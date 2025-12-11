/**
 * File Validation Utilities
 *
 * Security-focused file validation for uploads:
 * - File type validation (whitelist approach)
 * - File size limits
 * - MIME type verification
 * - Extension validation
 *
 * Following OWASP best practices for file upload security.
 */

// Allowed file types and their configurations
export const FILE_CONFIGS = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif'] as string[],
    allowedMimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
    ] as string[],
  },
  pdf: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['.pdf'] as string[],
    allowedMimeTypes: ['application/pdf'] as string[],
  },
  text: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedExtensions: ['.txt'] as string[],
    allowedMimeTypes: ['text/plain'] as string[],
  },
  csv: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.csv'] as string[],
    allowedMimeTypes: ['text/csv', 'application/csv'] as string[],
  },
  xml: {
    maxSize: 50 * 1024 * 1024, // 50MB (legal documents can be large)
    allowedExtensions: ['.xml'] as string[],
    allowedMimeTypes: ['application/xml', 'text/xml'] as string[],
  },
};

export type FileType = keyof typeof FILE_CONFIGS;

// Maximum files per upload request
export const MAX_FILES_PER_UPLOAD = 10;

/**
 * Validation error class
 */
export class FileValidationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'FileValidationError';
  }
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string, fileType: FileType): void {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const config = FILE_CONFIGS[fileType];

  if (!config.allowedExtensions.includes(extension)) {
    throw new FileValidationError(
      `Invalid file extension: ${extension}. Allowed: ${config.allowedExtensions.join(', ')}`,
      'INVALID_EXTENSION'
    );
  }
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType: string, fileType: FileType): void {
  const config = FILE_CONFIGS[fileType];

  if (!config.allowedMimeTypes.includes(mimeType)) {
    throw new FileValidationError(
      `Invalid MIME type: ${mimeType}. Allowed: ${config.allowedMimeTypes.join(', ')}`,
      'INVALID_MIME_TYPE'
    );
  }
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, fileType: FileType): void {
  const config = FILE_CONFIGS[fileType];

  if (size > config.maxSize) {
    const maxSizeMB = Math.round(config.maxSize / 1024 / 1024);
    const actualSizeMB = (size / 1024 / 1024).toFixed(2);
    throw new FileValidationError(
      `File too large: ${actualSizeMB}MB. Maximum: ${maxSizeMB}MB`,
      'FILE_TOO_LARGE'
    );
  }

  if (size === 0) {
    throw new FileValidationError('File is empty', 'EMPTY_FILE');
  }
}

/**
 * Detect file type from MIME type
 */
export function detectFileType(mimeType: string): FileType | null {
  if (FILE_CONFIGS.image.allowedMimeTypes.includes(mimeType)) {
    return 'image';
  }
  if (FILE_CONFIGS.pdf.allowedMimeTypes.includes(mimeType)) {
    return 'pdf';
  }
  if (FILE_CONFIGS.text.allowedMimeTypes.includes(mimeType)) {
    return 'text';
  }
  if (FILE_CONFIGS.csv.allowedMimeTypes.includes(mimeType)) {
    return 'csv';
  }
  if (FILE_CONFIGS.xml.allowedMimeTypes.includes(mimeType)) {
    return 'xml';
  }
  return null;
}

/**
 * Comprehensive file validation
 *
 * @param file - File object to validate
 * @returns File type if valid
 * @throws FileValidationError if validation fails
 */
export function validateFile(file: {
  name: string;
  type: string;
  size: number;
}): FileType {
  // Detect file type from MIME type
  const fileType = detectFileType(file.type);

  if (!fileType) {
    throw new FileValidationError(
      `Unsupported file type: ${file.type}. Only images (PNG, JPG, WEBP, GIF), PDFs, CSV, TXT, and XML files are allowed.`,
      'UNSUPPORTED_FILE_TYPE'
    );
  }

  // Validate extension
  validateFileExtension(file.name, fileType);

  // Validate MIME type
  validateMimeType(file.type, fileType);

  // Validate size
  validateFileSize(file.size, fileType);

  return fileType;
}

/**
 * Validate multiple files
 *
 * @param files - Array of files to validate
 * @returns Array of file types
 * @throws FileValidationError if any validation fails
 */
export function validateFiles(
  files: Array<{ name: string; type: string; size: number }>
): FileType[] {
  if (files.length === 0) {
    throw new FileValidationError('No files provided', 'NO_FILES');
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    throw new FileValidationError(
      `Too many files. Maximum: ${MAX_FILES_PER_UPLOAD}`,
      'TOO_MANY_FILES'
    );
  }

  return files.map(file => validateFile(file));
}

/**
 * Sanitize filename for storage
 *
 * Removes special characters and ensures safe filename
 */
export function sanitizeFilename(filename: string): string {
  // Get extension
  const lastDotIndex = filename.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  const nameWithoutExt = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;

  // Remove special characters, keep only alphanumeric, dash, underscore
  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .toLowerCase()
    // Remove consecutive underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_|_$/g, '');

  // Ensure name is not empty
  const finalName = sanitizedName || 'file';

  return finalName + extension.toLowerCase();
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
