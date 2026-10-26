const express = require('express');
const router = express.Router();
const { readCourses, writeCourses } = require('../utils/fileHandler');
const { validateCourseInput } = require('../middleware/validateCourse');
const { NotFoundError } = require('../errors/appErrors');

// 1. GET all courses
router.get('/', async (req, res, next) => {
  try {
    const courses = await readCourses();
    res.status(200).json(courses);
  } catch (err) {
    next(err);
  }
});

// 2. GET course by ID
router.get('/:id', async (req, res, next) => {
  try {
    const courses = await readCourses();
    const course = courses.find((c) => c.id === req.params.id);

    if (!course) {
      throw new NotFoundError(`Course with id '${req.params.id}' was not found.`);
    }

    res.status(200).json(course);
  } catch (err) {
    next(err);
  }
});

// 3. POST new course
router.post('/', validateCourseInput, async (req, res, next) => {
  try {
    const { name, description, targetDate, status } = req.body;
    const courses = await readCourses();
    const now = new Date().toISOString();

    const newCourse = {
      id: `course_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      description: description ? description.trim() : '',
      targetDate,
      status: status || 'Not Started',
      created_at: now,
      updated_at: now
    };

    courses.push(newCourse);
    await writeCourses(courses);

    res.status(201).json(newCourse);
  } catch (err) {
    next(err);
  }
});

// 4. PUT update existing course
router.put('/:id', validateCourseInput, async (req, res, next) => {
  try {
    const courses = await readCourses();
    const index = courses.findIndex((c) => c.id === req.params.id);

    if (index === -1) {
      throw new NotFoundError(`Course with id '${req.params.id}' was not found.`);
    }

    const { name, description, targetDate, status } = req.body;

    courses[index] = {
      ...courses[index],
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(targetDate && { targetDate }),
      ...(status && { status }),
      updated_at: new Date().toISOString()
    };

    await writeCourses(courses);
    res.status(200).json(courses[index]);
  } catch (err) {
    next(err);
  }
});

// 5. DELETE course
router.delete('/:id', async (req, res, next) => {
  try {
    const courses = await readCourses();
    const index = courses.findIndex((c) => c.id === req.params.id);

    if (index === -1) {
      throw new NotFoundError(`Course with id '${req.params.id}' was not found.`);
    }

    courses.splice(index, 1);
    await writeCourses(courses);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
