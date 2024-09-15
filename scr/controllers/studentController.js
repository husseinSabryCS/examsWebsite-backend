const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');

  
exports.getQuestions = (req, res) => {
  const { examId } = req.params;

  // تحقق من صحة المعرف examId إذا كان UUID
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(examId)) {
    return res.status(400).send('كود الامتحان غير صحيح.');
  }

  // تحقق إذا كان الامتحان مفتوح
  const sqlCheckExam = 'SELECT is_open FROM exams WHERE id = ?';
  db.query(sqlCheckExam, [examId], (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send('Internal server error.');
    }

    // إذا لم يكن هناك سجل مطابق، أرسل رسالة بأن الامتحان غير موجود
    if (result.length === 0) {
      return res.status(404).send('Exam not found.');
    }

    // إذا كان الامتحان مغلقًا، أرسل رسالة بأن الامتحان مغلق
    if (!result[0].is_open) {
      return res.status(400).send('The exam has ended. You cannot view questions.');
    }

    // إذا كان الامتحان مفتوح، تابع للحصول على الأسئلة
    const sql = 'SELECT q.id as question_id, q.question_text, a.id as answer_id, a.answer_text FROM questions q LEFT JOIN answers a ON q.id = a.question_id WHERE q.exam_id = ?';
    db.query(sql, [examId], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).send('Internal server error.');
      }
      
      const questions = results.reduce((acc, row) => {
        const question = acc.find(q => q.question_id === row.question_id);
        if (question) {
          question.answers.push({ answer_id: row.answer_id, answer_text: row.answer_text });
        } else {
          acc.push({ question_id: row.question_id, question_text: row.question_text, answers: [{ answer_id: row.answer_id, answer_text: row.answer_text }] });
        }
        return acc;
      }, []);
      
      res.status(200).json(questions);
    });
  });
};


exports.submitAnswer = (req, res) => {
  const { examId, studentId, answers } = req.body;
  
  if (!examId || !studentId || !answers) {
    return res.status(400).send('examId, studentId, answers are required.');
  }

  // Check if the exam is open
  const sqlCheckExam = 'SELECT is_open FROM exams WHERE id = ?';
  db.query(sqlCheckExam, [examId], (err, examResult) => {
    if (err) {
      return res.status(500).send(err);
    }

    // If the exam is closed, return a message
    if (!examResult[0] || !examResult[0].is_open) {
      return res.status(400).send('The exam has ended. You cannot submit answers.');
    }

    // Check if answers were already submitted for any questions
    const sqlCheckPreviousAnswers = 'SELECT id FROM student_answers WHERE exam_id = ? AND student_id = ? AND question_id = ?';
    
    // Array to collect promises for each answer check
    const promises = [];
    
    answers.forEach(answer => {
      const { question_id, answer_id } = answer;

      promises.push(new Promise((resolve, reject) => {
        db.query(sqlCheckPreviousAnswers, [examId, studentId, question_id], (err, result) => {
          if (err) {
            reject(err);
          } else if (result.length > 0) {
            reject(`Answer for question ${question_id} already submitted by this student.`);
          } else {
            const sqlGetAnswer = 'SELECT is_correct FROM answers WHERE id = ?';
            db.query(sqlGetAnswer, [answer_id], (err, answerResult) => {
              if (err) {
                reject(err);
              } else if (!answerResult[0]) {
                reject(`Answer with id ${answer_id} not found.`);
              } else {
                const isCorrect = answerResult[0].is_correct;
                const answerId = uuidv4();
                const sql = 'INSERT INTO student_answers (id, exam_id, student_id, question_id, answer_id, is_correct) VALUES (?, ?, ?, ?, ?, ?)';
                db.query(sql, [answerId, examId, studentId, question_id, answer_id, isCorrect], (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(`Answer for question ${question_id} submitted successfully.`);
                  }
                });
              }
            });
          }
        });
      }));
    });

    // Execute all promises and handle results
    Promise.all(promises)
      .then(successMessages => {
        res.status(200).json({ message: 'Answers submitted successfully', details: successMessages });
      })
      .catch(error => { 
        res.status(400).send(error);
      });
  });
};

  
       