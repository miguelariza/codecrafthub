const fs = require('fs/promises');
const path = require('path');
const { StorageError } = require('../errors/appErrors');

const DATA_DIR = path.join(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'courses.json');

/**
 * Initializes data/ directory and courses.json automatically if absent.
 */
async function initFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(FILE_PATH);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeCourses([]);
    } else {
      throw new StorageError('Could not initialize storage directory or file', err.message);
    }
  }
}

/**
 * Reads and parses JSON courses safely.
 */
async function readCourses() {
  await initFile();
  try {
    const rawData = await fs.readFile(FILE_PATH, 'utf-8');
    return JSON.parse(rawData || '[]');
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new StorageError('Storage corrupted: courses.json contains malformed JSON data');
    }
    throw new StorageError('Failed to read database file from disk', err.message);
  }
}

/**
 * Atomically writes data to avoid truncation during unexpected server stops.
 */
async function writeCourses(courses) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempPath = `${FILE_PATH}.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;

  try {
    await fs.writeFile(tempPath, JSON.stringify(courses, null, 2), 'utf-8');
    await fs.rename(tempPath, FILE_PATH);
  } catch (err) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignored if temp file was never written
    }
    throw new StorageError('Failed to save data atomically to disk', err.message);
  }
}

module.exports = { readCourses, writeCourses };
