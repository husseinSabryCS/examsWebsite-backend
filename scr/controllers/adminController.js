const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');

exports.addExam = (req, res) => {
  const { title, description, questions } = req.body;
  const examId = uuidv4();
  const userId = req.user.id; 
  
  const sqlExam = 'INSERT INTO exams (id, title, description, creator_id) VALUES (?, ?, ?, ?)';
  db.query(sqlExam, [examId, title, description, userId], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    questions.forEach(question => {
      const questionId = uuidv4();
      const sqlQuestion = 'INSERT INTO questions (id, exam_id, question_text) VALUES (?, ?, ?)';
      db.query(sqlQuestion, [questionId, examId, question.question_text], (err, result) => {
        if (err) {
          return res.status(500).send(err);
        }
        question.answers.forEach(answer => {
          const answerId = uuidv4();
          const sqlAnswer = 'INSERT INTO answers (id, question_id, answer_text, is_correct) VALUES (?, ?, ?, ?)';
          db.query(sqlAnswer, [answerId, questionId, answer.answer_text, answer.is_correct], (err) => {
            if (err) {
              return res.status(500).send(err);
            }
          });
        });
      });
    });
    res.status(200).send('Exam and questions added successfully');
  });
};

 
exports.getStudentCorrectAnswersCount = (req, res) => {
  const { examId } = req.query;
  const sql = `
    SELECT sa.student_id, COUNT(sa.id) AS correct_answers
    FROM student_answers sa
    JOIN answers a ON sa.answer_id = a.id
    WHERE sa.exam_id = ?
      AND sa.is_correct = 1
    GROUP BY sa.student_id;
  `;
  db.query(sql, [examId], (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(results);
  });
};
exports.getExamsCreatedByUser = (req, res) => {
  const userId = req.user.id; 

  // استعلم عن الامتحانات التي أنشأها المستخدم
  const sql = 'SELECT * FROM exams WHERE creator_id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.status(200).json(results);
  });
};
