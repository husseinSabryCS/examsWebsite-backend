const express = require('express');
const router = express.Router();
const Token = require('../middlewares/verifyToken');
const adminController = require('../controllers/adminController');

router.post('/add-exam', Token.verifyToken,adminController.addExam);
router.get('/getSudentsGrad',Token.verifyToken, adminController.getStudentCorrectAnswersCount);
router.get('/getExamsCreatedByUser/',Token.verifyToken, adminController.getExamsCreatedByUser);
router.delete('/exams/:examId', Token.verifyToken, adminController.deleteExam);
router.put('/exams/close', Token.verifyToken, adminController.closeExam);
router.put('/exams/close/schedule', Token.verifyToken, adminController.scheduleExamClosure);
router.put('/exams/open', Token.verifyToken, adminController.openExam);
router.get('/exams/:examId/results', Token.verifyToken, adminController.getExamResults);
module.exports = router;
