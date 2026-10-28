// tests/spa.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const htmlPath = fs.existsSync(path.resolve(__dirname, '../index.html'))
  ? path.resolve(__dirname, '../index.html')
  : path.resolve(__dirname, '../index_2.html');

const clientJsPath = fs.existsSync(path.resolve(__dirname, '../public/client.js'))
  ? path.resolve(__dirname, '../public/client.js')
  : path.resolve(__dirname, '../client.js');

const rawHtml = fs.readFileSync(htmlPath, 'utf-8');
const scriptSource = fs.readFileSync(clientJsPath, 'utf-8');

const bodyContentMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
const bodyHtmlWithoutScript = (bodyContentMatch ? bodyContentMatch[1] : rawHtml)
  .replace(/<script[\s\S]*?<\/script>/gi, '');

describe('CodeCraftHub SPA UI Unit & Integration Tests', () => {
  let originalFetch;

  const waitForCondition = async (predicate, timeout = 1500) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (predicate()) return;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error('Condition timed out');
  };

  const setupSPA = (mockFetchHandler) => {
    globalThis.fetch = vi.fn(mockFetchHandler);
    document.body.innerHTML = bodyHtmlWithoutScript;

    const runner = new Function(scriptSource);
    runner.call(window);

    document.dispatchEvent(new Event('DOMContentLoaded'));
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // =========================================================================
  // SUITE 1: Initial Document & Static Layout
  // =========================================================================
  describe('Initial Document & Static Layout', () => {
    it('renders the header title and key container panels', () => {
      setupSPA(async () => ({ ok: true, json: async () => [] }));

      const headerTitle = document.querySelector('header.header h1');
      expect(headerTitle.textContent).toContain('CodeCraftHub:');
      expect(document.getElementById('add-course-form')).not.toBeNull();
      expect(document.getElementById('courses-table')).not.toBeNull();
      expect(document.getElementById('toast-container')).not.toBeNull();
    });

    it('populates default target date with a 30-day future date on DOMContentLoaded', () => {
      setupSPA(async () => ({ ok: true, json: async () => [] }));

      const targetDateInput = document.getElementById('new-target-date');
      const expected = new Date();
      expected.setDate(expected.getDate() + 30);
      const yyyy = expected.getFullYear();
      const mm = String(expected.getMonth() + 1).padStart(2, '0');
      const dd = String(expected.getDate()).padStart(2, '0');

      expect(targetDateInput.value).toBe(`${yyyy}-${mm}-${dd}`);
    });

    it('displays the empty state when no courses are returned', async () => {
      setupSPA(async () => ({ ok: true, json: async () => [] }));

      const emptyState = document.getElementById('empty-state');
      const coursesTable = document.getElementById('courses-table');
      const courseCount = document.getElementById('course-count');

      await waitForCondition(() => !emptyState.classList.contains('u-hidden'));

      expect(emptyState.classList.contains('u-hidden')).toBe(false);
      expect(coursesTable.classList.contains('u-hidden')).toBe(true);
      expect(courseCount.textContent).toBe('0 courses');
    });
  });

  // =========================================================================
  // SUITE 2: Course Catalog Rendering (GET)
  // =========================================================================
  describe('Course Catalog Rendering (GET)', () => {
    const mockCourses = [
      {
        id: 'c1',
        name: 'Distributed Systems with Go',
        description: 'Consensus & Raft',
        targetDate: '2026-12-01T00:00:00.000Z',
        status: 'In Progress',
        created_at: '2026-10-01T12:00:00.000Z',
        updated_at: '2026-10-05T15:30:00.000Z'
      },
      {
        id: 'c2',
        name: 'Rust Memory Internals',
        description: 'Lifetimes and Borrow Checker',
        targetDate: '2026-11-15T00:00:00.000Z',
        status: 'Completed',
        created_at: '2026-09-01T10:00:00.000Z',
        updated_at: '2026-09-20T11:00:00.000Z'
      }
    ];

    it('renders populated rows when courses exist', async () => {
      setupSPA(async () => ({ ok: true, json: async () => mockCourses }));

      const tableBody = document.getElementById('courses-body');
      await waitForCondition(() => tableBody.querySelectorAll('tr').length === 2);

      const rows = tableBody.querySelectorAll('tr');
      const counter = document.getElementById('course-count');

      expect(rows.length).toBe(2);
      expect(counter.textContent).toBe('2 courses');
      expect(tableBody.innerHTML).toContain('Distributed Systems with Go');
      expect(tableBody.innerHTML).toContain('Rust Memory Internals');
    });

    it('applies the appropriate CSS badge class based on status', async () => {
      setupSPA(async () => ({ ok: true, json: async () => mockCourses }));

      const tableBody = document.getElementById('courses-body');
      await waitForCondition(() => tableBody.querySelectorAll('tr').length === 2);

      const badges = document.querySelectorAll('.status-pill');
      expect(badges[0].classList.contains('status-in-progress')).toBe(true);
      expect(badges[1].classList.contains('status-completed')).toBe(true);
    });

    it('displays error banner and toast on API failure', async () => {
      setupSPA(async () => {
        throw new Error('Network disconnected');
      });

      const banner = document.getElementById('api-error-banner');
      const bannerMsg = document.getElementById('api-error-message');

      await waitForCondition(() => banner.style.display === 'flex');

      const toast = document.querySelector('.toast.error');
      expect(banner.style.display).toBe('flex');
      expect(bannerMsg.textContent).toContain('Network disconnected');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('Network disconnected');
    });
  });

  // =========================================================================
  // SUITE 3: Course Creation (POST)
  // =========================================================================
  describe('Course Creation (POST)', () => {
    it('shows error toast when submitting empty mandatory fields', () => {
      setupSPA(async () => ({ ok: true, json: async () => [] }));

      document.getElementById('new-name').value = '';
      document.getElementById('new-description').value = '';

      const form = document.getElementById('add-course-form');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      const toast = document.querySelector('.toast.error');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toBe('Please complete all required fields.');
    });

    it('sends POST payload and reloads list on valid submission', async () => {
      let postMade = false;

      setupSPA(async (url, options = {}) => {
        if (options.method === 'POST') {
          postMade = true;
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: 'c3', name: 'Observability & Metrics' })
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => (postMade ? [
            {
              id: 'c3',
              name: 'Observability & Metrics',
              description: 'OpenTelemetry & Prometheus',
              targetDate: '2026-11-20',
              status: 'Not Started'
            }
          ] : [])
        };
      });

      const emptyState = document.getElementById('empty-state');
      await waitForCondition(() => !emptyState.classList.contains('u-hidden'));

      document.getElementById('new-name').value = 'Observability & Metrics';
      document.getElementById('new-description').value = 'OpenTelemetry & Prometheus';
      document.getElementById('new-target-date').value = '2026-11-20';
      document.getElementById('new-status').value = 'Not Started';

      const form = document.getElementById('add-course-form');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      const tableBody = document.getElementById('courses-body');
      await waitForCondition(() => tableBody.textContent.includes('Observability & Metrics'));

      const postCall = globalThis.fetch.mock.calls.find(
        ([, opts]) => opts && opts.method === 'POST'
      );

      expect(postCall).toBeDefined();
      expect(postCall[0]).toBe('http://localhost:5000/api/courses');
      expect(JSON.parse(postCall[1].body)).toEqual({
        name: 'Observability & Metrics',
        description: 'OpenTelemetry & Prometheus',
        targetDate: '2026-11-20',
        status: 'Not Started'
      });

      const toastSuccess = document.querySelector('.toast.success');
      expect(toastSuccess).not.toBeNull();
      expect(toastSuccess.textContent).toContain('Course goal added successfully!');
    });
  });

  // =========================================================================
  // SUITE 4: Course Update (PUT) and Edit Modal
  // =========================================================================
  describe('Course Update (PUT) and Edit Modal', () => {
    const singleCourse = [
      {
        id: 'c100',
        name: 'Initial Name',
        description: 'Initial Description',
        targetDate: '2026-12-15T00:00:00.000Z',
        status: 'Not Started'
      }
    ];

    it('opens and pre-fills modal upon clicking Edit button', async () => {
      setupSPA(async () => ({ ok: true, json: async () => singleCourse }));

      const tableBody = document.getElementById('courses-body');
      await waitForCondition(() => tableBody.querySelectorAll('tr').length === 1);

      const editButton = document.querySelector('.btn-action-edit');
      expect(editButton).not.toBeNull();

      editButton.click();

      const modal = document.getElementById('edit-modal');
      expect(modal.classList.contains('open')).toBe(true);
      expect(document.getElementById('edit-id').value).toBe('c100');
      expect(document.getElementById('edit-name').value).toBe('Initial Name');
      expect(document.getElementById('edit-description').value).toBe('Initial Description');
      expect(document.getElementById('edit-target-date').value).toBe('2026-12-15');
      expect(document.getElementById('edit-status').value).toBe('Not Started');
    });

    it('submits updated values via PUT and closes modal', async () => {
      let putMade = false;

      setupSPA(async (url, options = {}) => {
        if (options.method === 'PUT') {
          putMade = true;
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true })
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => singleCourse
        };
      });

      const tableBody = document.getElementById('courses-body');
      await waitForCondition(() => tableBody.querySelectorAll('tr').length === 1);

      document.querySelector('.btn-action-edit').click();

      const modal = document.getElementById('edit-modal');
      expect(modal.classList.contains('open')).toBe(true);

      document.getElementById('edit-name').value = 'Updated Name';
      document.getElementById('edit-status').value = 'In Progress';

      const editForm = document.getElementById('edit-course-form');
      editForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      await waitForCondition(() => !modal.classList.contains('open') && document.querySelector('.toast.success') !== null);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/courses/c100',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Name',
            description: 'Initial Description',
            targetDate: '2026-12-15',
            status: 'In Progress'
          })
        })
      );

      expect(modal.classList.contains('open')).toBe(false);
      const toast = document.querySelector('.toast.success');
      expect(toast.textContent).toContain('Course updated successfully!');
    });

    it('closes edit modal when Cancel button is clicked', async () => {
      setupSPA(async () => ({ ok: true, json: async () => singleCourse }));

      const tableBody = document.getElementById('courses-body');
      await waitForCondition(() => tableBody.querySelectorAll('tr').length === 1);

      document.querySelector('.btn-action-edit').click();
      const modal = document.getElementById('edit-modal');
      expect(modal.classList.contains('open')).toBe(true);

      document.getElementById('btn-cancel-edit').click();
      expect(modal.classList.contains('open')).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 5: Course Deletion (DELETE) and Confirmation Modal
  // =========================================================================
  describe('Course Deletion (DELETE) and Confirmation Modal', () => {
    const singleCourse = [
      {
        id: 'c200',
        name: 'Target for Deletion',
        description: 'Will be removed',
        targetDate: '2026-12-31',
        status: 'Not Started'
      }
    ];

    it('opens delete confirmation modal with course name', async () => {
      setupSPA(async () => ({ ok: true, json: async () => singleCourse }));

      const tableBody = document.getElementById('courses-body');
      await waitForCondition(() => tableBody.querySelectorAll('tr').length === 1);

      const deleteButton = document.querySelector('.btn-action-delete');
      expect(deleteButton).not.toBeNull();
      deleteButton.click();

      const modal = document.getElementById('delete-modal');
      const namePrompt = document.getElementById('delete-course-name');

      expect(modal.classList.contains('open')).toBe(true);
      expect(namePrompt.textContent).toContain('Target for Deletion');
    });

    it('executes DELETE request on confirmation and refreshes state', async () => {
      let deleteMade = false;

      setupSPA(async (url, options = {}) => {
        if (options.method === 'DELETE') {
          deleteMade = true;
          return { ok: true, json: async () => ({ success: true }) };
        }
        return {
          ok: true,
          json: async () => (deleteMade ? [] : singleCourse)
        };
      });

      const tableBody = document.getElementById('courses-body');
      await waitForCondition(() => tableBody.querySelectorAll('tr').length === 1);

      document.querySelector('.btn-action-delete').click();
      document.getElementById('btn-confirm-delete').click();

      await waitForCondition(() => deleteMade);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/courses/c200',
        expect.objectContaining({ method: 'DELETE' })
      );

      const modal = document.getElementById('delete-modal');
      expect(modal.classList.contains('open')).toBe(false);

      const toast = document.querySelector('.toast.success');
      expect(toast.textContent).toContain('Course removed successfully');
    });

    it('dismisses modal when Escape key is pressed', async () => {
      setupSPA(async () => ({ ok: true, json: async () => singleCourse }));

      const tableBody = document.getElementById('courses-body');
      await waitForCondition(() => tableBody.querySelectorAll('tr').length === 1);

      document.querySelector('.btn-action-delete').click();
      const modal = document.getElementById('delete-modal');
      expect(modal.classList.contains('open')).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(modal.classList.contains('open')).toBe(false);
    });
  });
});