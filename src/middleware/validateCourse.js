const { BadRequestError } = require('../errors/appErrors');

const VALID_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateCourseInput(req, res, next) {
  const isPost = req.method === 'POST';
  const { name, targetDate, status } = req.body;
  const errors = [];

  // Required checks on POST
  if (isPost) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.push('Course "name" is required and cannot be empty.');
    }
    if (!targetDate || typeof targetDate !== 'string') {
      errors.push('Course "targetDate" is required (YYYY-MM-DD format).');
    }
  }

  // Type checks if values are supplied
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    errors.push('"name" must be a non-empty string.');
  }

  if (targetDate !== undefined) {
    if (!ISO_DATE_REGEX.test(targetDate) || isNaN(Date.parse(targetDate))) {
      errors.push('"targetDate" must be a valid date in YYYY-MM-DD format.');
    }
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    errors.push(`"status" must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  if (errors.length > 0) {
    throw new BadRequestError('Validation failed', errors);
  }

  next();
}

module.exports = { validateCourseInput };
