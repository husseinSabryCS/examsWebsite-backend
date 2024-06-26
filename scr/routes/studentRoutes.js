const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');


router.get('/exams/:examId', studentController.getQuestions);
router.post('/submit-answer', studentController.submitAnswer);

   
module.exports = router;
       