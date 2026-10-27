process.env.NODE_ENV = 'test';

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs/promises');

// Isolate test database to a dedicated directory
const TEST_DATA_DIR = path.join(__dirname, '../data');
const TEST_FILE_PATH = path.join(TEST_DATA_DIR, 'courses.json');

const app = require('../src/app');

describe('CodeCraftHub Full Test Suite (Native node:test runner)', () => {
  let server;
  let baseUrl;

  const initialCourses = [
    {
      id: 'course_test_1',
      name: 'Node Fundamentals',
      description: 'Express and JSON storage',
      targetDate: '2026-12-01',
      status: 'In Progress',
      created_at: '2026-10-01T00:00:00.000Z',
      updated_at: '2026-10-01T00:00:00.000Z'
    }
  ];

  // 1. Start ephemeral HTTP server on open port
  before(async () => {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/courses`;
        resolve();
      });
    });
  });

  // 2. Clean up test server and test storage file
  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    try {
      await fs.unlink(TEST_FILE_PATH);
    } catch {
      // Ignore if file was already removed
    }
  });

  // 3. Reset disk state to predictable fixture before each test
  beforeEach(async () => {
    await fs.writeFile(TEST_FILE_PATH, JSON.stringify(initialCourses, null, 2), 'utf-8');
  });

  // -------------------------------------------------------------------------
  // Happy Paths & Security Headers
  // -------------------------------------------------------------------------
  describe('Happy Paths & Security Headers', () => {
    test('GET /api/courses returns course list with Helmet headers and no x-powered-by', async () => {
      const res = await fetch(baseUrl);
      const data = await res.json();

      assert.equal(res.status, 200);
      assert.equal(Array.isArray(data), true);
      assert.equal(data.length, 1);
      assert.equal(res.headers.get('x-powered-by'), null);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    });

    test('GET /api/courses/:id returns single course', async () => {
      const res = await fetch(`${baseUrl}/course_test_1`);
      const data = await res.json();

      assert.equal(res.status, 200);
      assert.equal(data.id, 'course_test_1');
      assert.equal(data.name, 'Node Fundamentals');
    });

    test('POST /api/courses creates record and sets timestamps', async () => {
      const payload = {
        name: 'Mastering Go',
        description: 'Concurrency patterns',
        targetDate: '2026-12-25',
        status: 'Not Started'
      };

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      assert.equal(res.status, 201);
      assert.equal(data.name, payload.name);
      assert.ok(data.id);
      assert.ok(data.created_at);
      assert.equal(data.created_at, data.updated_at);
    });

    test('PUT /api/courses/:id updates status and updates updated_at timestamp', async () => {
      const res = await fetch(`${baseUrl}/course_test_1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });
      const data = await res.json();

      assert.equal(res.status, 200);
      assert.equal(data.status, 'Completed');
      assert.notEqual(data.updated_at, '2026-10-01T00:00:00.000Z');
    });

    test('DELETE /api/courses/:id removes the course', async () => {
      const res = await fetch(`${baseUrl}/course_test_1`, { method: 'DELETE' });
      assert.equal(res.status, 204);

      // Verify deletion from disk
      const checkRes = await fetch(`${baseUrl}/course_test_1`);
      assert.equal(checkRes.status, 404);
    });
  });

  // -------------------------------------------------------------------------
  // Error Handling Validation
  // -------------------------------------------------------------------------
  describe('Error Handling Validation', () => {
    test('POST returns 400 when name is missing', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: '2026-12-01' })
      });
      const data = await res.json();

      assert.equal(res.status, 400);
      assert.equal(data.success, false);
      assert.ok(data.details.includes('Course "name" is required and cannot be empty.'));
    });

    test('POST returns 400 when date format is invalid', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Docker 101', targetDate: '31/12/2026' })
      });
      const data = await res.json();

      assert.equal(res.status, 400);
      assert.ok(data.details.includes('"targetDate" must be a valid date in YYYY-MM-DD format.'));
    });

    test('POST returns 400 when status is not allowed', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Docker 101', targetDate: '2026-12-31', status: 'Pending' })
      });
      const data = await res.json();

      assert.equal(res.status, 400);
      assert.match(data.details[0], /status/);
    });

    test('GET returns 404 for unknown ID', async () => {
      const res = await fetch(`${baseUrl}/unknown_id_999`);
      const data = await res.json();

      assert.equal(res.status, 404);
      assert.match(data.error, /was not found/);
    });

    test('GET returns 500 when storage file is corrupted', async () => {
      // Intentionally write invalid JSON to the disk storage file
      await fs.writeFile(TEST_FILE_PATH, '{ corrupted-json-data: ', 'utf-8');

      const res = await fetch(baseUrl);
      const data = await res.json();

      assert.equal(res.status, 500);
      assert.equal(data.success, false);
      assert.match(data.error, /corrupted/i);
    });
  });
});