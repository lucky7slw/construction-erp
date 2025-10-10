import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import type { MultipartFile } from '@fastify/multipart';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export class FileStorage {
  private uploadDir: string;

  constructor(uploadDir: string = UPLOAD_DIR) {
    this.uploadDir = uploadDir;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
      throw error;
    }
  }

  async saveFile(file: MultipartFile, projectId: string): Promise<{ filename: string; filepath: string; size: number }> {
    const filename = `${Date.now()}-${file.filename}`;
    const projectDir = path.join(this.uploadDir, projectId);

    // Create project directory if it doesn't exist
    await fs.mkdir(projectDir, { recursive: true });

    const filepath = path.join(projectDir, filename);
    const writeStream = createWriteStream(filepath);

    await pipeline(file.file, writeStream);

    const stats = await fs.stat(filepath);

    return {
      filename,
      filepath: path.relative(this.uploadDir, filepath),
      size: stats.size,
    };
  }

  async deleteFile(filepath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filepath);
    await fs.unlink(fullPath);
  }

  getFileUrl(filepath: string): string {
    // For local storage, return a relative URL path
    // In production, this would be a cloud storage URL
    return `/files/${filepath}`;
  }

  async getFileStream(filepath: string) {
    const fullPath = path.join(this.uploadDir, filepath);
    return fs.readFile(fullPath);
  }
}

export const fileStorage = new FileStorage();
