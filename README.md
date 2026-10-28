# CodeCraftHub 🚀 (Zero DevDependencies Edition)

A lightweight REST API built with Node.js and Express to track learning roadmaps and course goals without an external database. All records are persisted using an atomic local JSON file store.

Tested entirely using Node.js built-in `node:test` and `node:assert/strict` modules—completely eliminating `jest`, `supertest`, `glob`, and `inflight` warnings.

### This project was built completely using Gemini Pro 3.8 (Backend (Node.js) and UI interface (HTML, CSS, JS)

---

## Benefits of Native Node Test Runner

- **Zero DevDependencies:** 0 test libraries to download, audit, or update.
- **No Deprecation Warnings:** Completely eliminates warnings for `inflight`, `glob`, `rimraf`, etc.
- **Fast Execution:** Boots instantaneously using Node's native V8 engine without heavy babel/transform layers.
- **Built-in `fetch` API:** Tests use standard native global `fetch`.

---

## Installation & Quick Start

1. **Install runtime dependencies:**
   ```bash
   npm install
   ```

2. **Run tests using the native runner:**
   ```bash
   npm test
   ```

3. **Start the API server (Port 5000):**
   ```bash
   npm start
   ```

The API will be live at: `http://localhost:5000/api/courses`
