const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const cron = require('node-cron');
////////////////////////////////
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

exports.deleteExam = (req, res) => {
  const { examId } = req.params;
  if (!examId) {
    return res.status(400).send('Exam ID is required.');
  }

  // تحقق مما إذا كان المستخدم هو من أنشأ الامتحان
  const sqlCheckCreator = 'SELECT creator_id FROM exams WHERE id = ?';
  db.query(sqlCheckCreator, [examId], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }

    if (result.length === 0) {
      return res.status(404).send('Exam not found.');
    }

    if (result[0].creator_id !== req.user.id) {
      return res.status(403).send('You are not authorized to delete this exam.');
    }

    // حذف الإجابات، الأسئلة، وأخيراً الامتحان
    const sqlDeleteAnswers = 'DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE exam_id = ?)';
    db.query(sqlDeleteAnswers, [examId], (err) => {
      if (err) {
        return res.status(500).send(err);
      }

      const sqlDeleteQuestions = 'DELETE FROM questions WHERE exam_id = ?';
      db.query(sqlDeleteQuestions, [examId], (err) => {
        if (err) {
          return res.status(500).send(err);
        }

        const sqlDeleteExam = 'DELETE FROM exams WHERE id = ?';
        db.query(sqlDeleteExam, [examId], (err) => {
          if (err) {
            return res.status(500).send(err);
          }

          res.status(200).send('Exam deleted successfully.');
        });
      });
    });
  });
};

exports.getExamResults = (req, res) => {
  const { examId } = req.params;
  const userId = req.user.id; // الحصول على معرف المستخدم من التوكن

  if (!examId) {
    return res.status(400).send('Exam ID is required.');
  }

  // التحقق من أن المستخدم الحالي هو منشئ الامتحان
  const sqlCheckCreator = 'SELECT creator_id FROM exams WHERE id = ?';
  db.query(sqlCheckCreator, [examId], (err, examResult) => {
    if (err) {
      return res.status(500).send(err);
    }

    if (examResult.length === 0) {
      return res.status(404).send('Exam not found.');
    }

    if (examResult[0].creator_id !== userId) {
      return res.status(403).send('You are not authorized to access this exam.');
    }

    // جلب نتائج الامتحان
    const sqlGetResults = `
      SELECT sa.student_id, COUNT(sa.id) AS correct_answers
      FROM student_answers sa
      JOIN answers a ON sa.answer_id = a.id
      WHERE sa.exam_id = ?
        AND sa.is_correct = 1
      GROUP BY sa.student_id;
    `;

    db.query(sqlGetResults, [examId], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }

      if (results.length === 0) {
        return res.status(404).send('No results found for this exam.');
      }

      // إنشاء ملف Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Exam Results');

      // إضافة العناوين
      worksheet.columns = [
        { header: 'Student ID', key: 'student_id', width: 25 },
        { header: 'Total Correct Answers', key: 'correct_answers', width: 20 }
      ];

      // إضافة البيانات
      results.forEach(result => {
        worksheet.addRow(result);
      });

      // إعداد الرد لتنزيل الملف
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=exam_results.xlsx');

      // إرسال الملف
      workbook.xlsx.write(res)
        .then(() => {
          res.end();
        })
        .catch((error) => {
          res.status(500).send(error);
        });
    });
  });
};
exports.closeExam = (req, res) => {
  const { examId } = req.body;
  const userId = req.user.id; // الحصول على معرف المستخدم من التوكن

  if (!examId) {
    return res.status(400).send('Exam ID is required.');
  }

  // التحقق من أن المستخدم الحالي هو منشئ الامتحان
  const sqlCheckCreator = 'SELECT creator_id FROM exams WHERE id = ?';
  db.query(sqlCheckCreator, [examId], (err, examResult) => {
    if (err) {
      return res.status(500).send(err);
    }

    if (examResult.length === 0) {
      return res.status(404).send('Exam not found.');
    }

    if (examResult[0].creator_id !== userId) {
      return res.status(403).send('You are not authorized to close this exam.');
    }

    // إغلاق الامتحان
    const sqlCloseExam = 'UPDATE exams SET is_open = 0 WHERE id = ?';
    db.query(sqlCloseExam, [examId], (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }

      res.status(200).send('Exam closed successfully.');
    });
  });
};
exports.openExam = (req, res) => {
  const { examId } = req.body;
  const userId = req.user.id; // الحصول على معرف المستخدم من التوكن

  if (!examId) {
    return res.status(400).send('Exam ID is required.');
  }

  // التحقق من أن المستخدم الحالي هو منشئ الامتحان
  const sqlCheckCreator = 'SELECT creator_id FROM exams WHERE id = ?';
  db.query(sqlCheckCreator, [examId], (err, examResult) => {
    if (err) {
      return res.status(500).send(err);
    }

    if (examResult.length === 0) {
      return res.status(404).send('Exam not found.');
    }

    if (examResult[0].creator_id !== userId) {
      return res.status(403).send('You are not authorized to open this exam.');
    }

    
    const sqlCloseExam = 'UPDATE exams SET is_open = 1 WHERE id = ?';
    db.query(sqlCloseExam, [examId], (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }

      res.status(200).send('Exam opened successfully.');
    });
  });
};






exports.scheduleExamClosure = (req, res) => {
  const { examId, minutes } = req.body;
  const userId = req.user.id; // استخراج معرف المستخدم من التوكن

  if (!examId || !minutes || isNaN(minutes)) {
    return res.status(400).send('Exam ID and minutes are required and must be a number.');
  }

  // التحقق من أن المستخدم الحالي هو منشئ الامتحان
  const sqlCheckCreator = 'SELECT creator_id FROM exams WHERE id = ?';
  db.query(sqlCheckCreator, [examId], (err, examResult) => {
    if (err) {
      return res.status(500).send(err);
    }

    if (examResult.length === 0) {
      return res.status(404).send('Exam not found.');
    }

    if (examResult[0].creator_id !== userId) {
      return res.status(403).send('You are not authorized to schedule the closure of this exam.');
    }

    // حساب وقت الإغلاق بالنمط الصحيح ل cron
    const futureDate = new Date(new Date().getTime() + minutes * 60 * 1000);
    const cronTime = `${futureDate.getUTCMinutes()} ${futureDate.getUTCHours()} ${futureDate.getUTCDate()} ${futureDate.getUTCMonth() + 1} *`;

    // جدولة قفل الامتحان باستخدام node-cron
    cron.schedule(cronTime, () => {
      const sqlCloseExam = 'UPDATE exams SET is_open = 0 WHERE id = ?';
      db.query(sqlCloseExam, [examId], (err, result) => {
        if (err) {
          console.error(`Failed to close exam with ID ${examId}:`, err);
        } else {
          console.log(`Exam with ID ${examId} has been closed.`);
        }
      });
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    res.status(200).send(`Exam with ID ${examId} is scheduled to close in ${minutes} minutes.`);
  });
};
