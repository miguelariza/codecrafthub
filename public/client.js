// public/client.js
'use strict';

const API_BASE_URL = 'http://localhost:5000/api/courses';

// DOM Elements
const addCourseForm = document.getElementById('add-course-form');
const editCourseForm = document.getElementById('edit-course-form');

// --- Step 3: Hard-code Form Submission Fallback Prevention ---
// POST /api/courses
if (addCourseForm) {
  addCourseForm.addEventListener('submit', async (e) => {
    // 1. Prevent default native browser refresh
    e.preventDefault();
    e.stopPropagation();

    // 2. Read and trim input values
    const name = document.getElementById('new-name').value.trim();
    const description = document.getElementById('new-description').value.trim();
    const targetDate = document.getElementById('new-target-date').value;
    const status = document.getElementById('new-status').value;

    if (!name || !description || !targetDate || !status) {
      showToast('Please complete all required fields.', 'error');
      return;
    }

    const btnAddCourse = document.getElementById('btn-add-course');
    setButtonLoading(btnAddCourse, true);

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, targetDate, status })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = parseBackendError(result, `HTTP ${response.status}`);
        throw new Error(detail);
      }

      showToast('Course goal added successfully!', 'success');
      addCourseForm.reset();
      setDefaultFutureDate();
      await fetchCourses();
    } catch (err) {
      console.error('Add course error:', err);
      showToast(`Failed to create: ${err.message}`, 'error');
    } finally {
      setButtonLoading(btnAddCourse, false, 'Add Course');
    }
  });
}

if (editCourseForm) {
  editCourseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}

let coursesList = [];
let pendingDeleteId = null;

const editModal = document.getElementById('edit-modal');
const deleteModal = document.getElementById('delete-modal');
const coursesTable = document.getElementById('courses-table');
const coursesBody = document.getElementById('courses-body');
const tableLoader = document.getElementById('table-loader');
const emptyState = document.getElementById('empty-state');
const courseCount = document.getElementById('course-count');
const apiErrorBanner = document.getElementById('api-error-banner');
const apiErrorMessage = document.getElementById('api-error-message');
const toastContainer = document.getElementById('toast-container');
const deleteCourseNameSpan = document.getElementById('delete-course-name');

const btnAddCourse = document.getElementById('btn-add-course');
const btnSaveEdit = document.getElementById('btn-save-edit');
const btnRefresh = document.getElementById('btn-refresh');
const btnRetryBanner = document.getElementById('btn-retry-banner');
const btnCloseEdit = document.getElementById('btn-close-edit');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const btnCloseDelete = document.getElementById('btn-close-delete');
const btnCancelDelete = document.getElementById('btn-cancel-delete');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');

// Helper: Set default date to 30 days in future to satisfy strict backend validators
function setDefaultFutureDate() {
    const targetDateInput = document.getElementById('new-target-date');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const yyyy = futureDate.getFullYear();
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const dd = String(futureDate.getDate()).padStart(2, '0');
    targetDateInput.value = `${yyyy}-${mm}-${dd}`;
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
    });
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '—';
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return dateTimeString;
    return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.2s ease-in';
    setTimeout(() => toast.remove(), 250);
    }, 5000);
}

function setBannerError(message) {
    if (!message) {
    apiErrorBanner.style.display = 'none';
    } else {
    apiErrorMessage.textContent = message;
    apiErrorBanner.style.display = 'flex';
    }
}

function setButtonLoading(button, isLoading, normalText = 'Submit') {
    if (isLoading) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Processing...';
    } else {
    button.disabled = false;
    button.innerHTML = `<span>${normalText}</span>`;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

// Parse backend error messages regardless of structure
function parseBackendError(result, fallback) {
    if (!result) return fallback;
    if (result.message) return result.message;
    if (Array.isArray(result.errors)) {
    return result.errors.map(e => e.msg || e.message || e).join('; ');
    }
    if (result.error) return typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
    return fallback;
}

// GET /api/courses
async function fetchCourses() {
    tableLoader.classList.remove('u-hidden');
    coursesTable.classList.add('u-hidden');
    emptyState.classList.add('u-hidden');
    setBannerError(null);

    try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
    }
    const data = await response.json();
    
    // Accommodate array directly, data.courses, or data.data
    if (Array.isArray(data)) {
        coursesList = data;
    } else if (Array.isArray(data.courses)) {
        coursesList = data.courses;
    } else if (Array.isArray(data.data)) {
        coursesList = data.data;
    } else {
        coursesList = [];
    }

    renderCourses();
    } catch (err) {
    setBannerError(`Failed to load courses: ${err.message}. Check backend status.`);
    showToast(`Could not load courses (${err.message})`, 'error');
    } finally {
    tableLoader.classList.add('u-hidden');
    }
}

// PUT /api/courses/:id
editCourseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value.trim();
    const description = document.getElementById('edit-description').value.trim();
    const targetDate = document.getElementById('edit-target-date').value;
    const status = document.getElementById('edit-status').value;

    if (!name || !description || !targetDate || !status) {
    showToast('Please complete all required fields.', 'error');
    return;
    }

    setButtonLoading(btnSaveEdit, true);

    try {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, targetDate, status })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const detail = parseBackendError(result, `HTTP ${response.status}`);
        throw new Error(detail);
    }

    showToast('Course updated successfully!', 'success');
    closeEditModal();
    await fetchCourses();
    } catch (err) {
    showToast(`Failed to update: ${err.message}`, 'error');
    } finally {
    setButtonLoading(btnSaveEdit, false, 'Save Changes');
    }
});

// DELETE /api/courses/:id
async function executeCourseDeletion() {
    if (!pendingDeleteId) return;

    setButtonLoading(btnConfirmDelete, true);

    try {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(pendingDeleteId)}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(parseBackendError(result, `HTTP ${response.status}`));
    }

    showToast('Course removed successfully.', 'success');
    closeDeleteModal();
    await fetchCourses();
    } catch (err) {
    showToast(`Failed to delete: ${err.message}`, 'error');
    } finally {
    setButtonLoading(btnConfirmDelete, false, 'Delete Course');
    }
}

// Helper: Map status to styling class safely
function getStatusClass(status) {
    const normalized = (status || '').toLowerCase().trim();
    if (normalized.includes('progress')) return 'status-in-progress';
    if (normalized.includes('complete')) return 'status-completed';
    return 'status-not-started';
}

function renderCourses() {
    coursesBody.innerHTML = '';
    courseCount.textContent = `${coursesList.length} ${coursesList.length === 1 ? 'course' : 'courses'}`;

    if (!coursesList || coursesList.length === 0) {
    coursesTable.classList.add('u-hidden');
    emptyState.classList.remove('u-hidden');
    return;
    }

    emptyState.classList.add('u-hidden');
    coursesTable.classList.remove('u-hidden');

    coursesList.forEach(course => {
    const tr = document.createElement('tr');

    const safeId = escapeHtml(String(course.id || ''));
    const safeName = escapeHtml(String(course.name || ''));
    const safeDesc = escapeHtml(String(course.description || ''));
    const rawStatus = (course.status || 'Not Started').trim();
    const safeStatus = escapeHtml(rawStatus);
    const statusClass = getStatusClass(rawStatus);

    tr.innerHTML = `
        <td data-label="Course">
        <div class="course-title-cell">${safeName}</div>
        <div class="course-desc-cell">${safeDesc}</div>
        <span class="mono-meta u-margin-top-xs">ID: ${safeId}</span>
        </td>
        <td data-label="Status">
        <span class="status-pill ${statusClass}">${safeStatus}</span>
        </td>
        <td data-label="Target Date">
        <span class="meta-date">${formatDate(course.targetDate)}</span>
        </td>
        <td data-label="Timestamps">
        <span class="mono-meta">Created: ${formatDateTime(course.created_at)}</span>
        <span class="mono-meta">Updated: ${formatDateTime(course.updated_at)}</span>
        </td>
        <td data-label="Actions">
        <div class="table-actions">
            <button type="button" class="btn btn-sm btn-secondary btn-action-edit" data-id="${safeId}">
            Edit
            </button>
            <button type="button" class="btn btn-sm btn-danger btn-action-delete" data-id="${safeId}">
            Remove
            </button>
        </div>
        </td>
    `;
    coursesBody.appendChild(tr);
    });
}

coursesBody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-action-edit');
    const deleteBtn = e.target.closest('.btn-action-delete');

    if (editBtn) {
    openEditModal(editBtn.getAttribute('data-id'));
    } else if (deleteBtn) {
    openDeleteModal(deleteBtn.getAttribute('data-id'));
    }
});

function openEditModal(courseId) {
    const course = coursesList.find(c => String(c.id) === String(courseId));
    if (!course) {
    showToast('Course details not found.', 'error');
    return;
    }

    document.getElementById('edit-id').value = course.id;
    document.getElementById('edit-id-display').textContent = course.id;
    document.getElementById('edit-name').value = course.name || '';
    document.getElementById('edit-description').value = course.description || '';
    
    if (course.targetDate) {
    document.getElementById('edit-target-date').value = course.targetDate.substring(0, 10);
    } else {
    document.getElementById('edit-target-date').value = '';
    }

    // Case-insensitive selection fallback
    const selectStatus = document.getElementById('edit-status');
    const currentStatus = (course.status || 'Not Started').toLowerCase().trim();
    let matched = false;
    for (let i = 0; i < selectStatus.options.length; i++) {
    if (selectStatus.options[i].value.toLowerCase().trim() === currentStatus) {
        selectStatus.selectedIndex = i;
        matched = true;
        break;
    }
    }
    if (!matched) selectStatus.value = 'Not Started';

    editModal.classList.add('open');
}

function closeEditModal() {
    editModal.classList.remove('open');
    editCourseForm.reset();
}

function openDeleteModal(courseId) {
    const course = coursesList.find(c => String(c.id) === String(courseId));
    if (!course) return;

    pendingDeleteId = course.id;
    deleteCourseNameSpan.textContent = `"${course.name}"`;
    deleteModal.classList.add('open');
}

function closeDeleteModal() {
    deleteModal.classList.remove('open');
    pendingDeleteId = null;
}

btnRefresh.addEventListener('click', fetchCourses);
btnRetryBanner.addEventListener('click', fetchCourses);
btnCloseEdit.addEventListener('click', closeEditModal);
btnCancelEdit.addEventListener('click', closeEditModal);
btnCloseDelete.addEventListener('click', closeDeleteModal);
btnCancelDelete.addEventListener('click', closeDeleteModal);
btnConfirmDelete.addEventListener('click', executeCourseDeletion);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
    if (editModal.classList.contains('open')) closeEditModal();
    if (deleteModal.classList.contains('open')) closeDeleteModal();
    }
});

editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
});

deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
});

document.addEventListener('DOMContentLoaded', () => {
    setDefaultFutureDate();
    fetchCourses();
});