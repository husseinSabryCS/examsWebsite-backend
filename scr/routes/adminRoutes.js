const express = require('express');
const router = express.Router();
const Token = require('../middlewares/verifyToken');
const adminController = require('../controllers/adminController');

router.post('/add-exam', Token.verifyToken,adminController.addExam);
router.get('/getSudentsGrad',Token.verifyToken, adminController.getStudentCorrectAnswersCount);
router.get('/getExamsCreatedByUser/:userId',Token.verifyToken, adminController.getExamsCreatedByUser);
router.delete('/exams/:examId', Token.verifyToken, adminController.deleteExam);
module.exports = router;
