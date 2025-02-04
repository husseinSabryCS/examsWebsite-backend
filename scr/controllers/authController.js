// controllers/authController.js
const bcrypt = require('bcrypt');
const Token = require('../middlewares/verifyToken');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');

// تسجيل الدخول
exports.login = (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
      if (err) {
          return res.status(500).send(err);
      }
      if (results.length === 0) {
          return res.status(400).send('Invalid email or password');
      }
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
          return res.status(400).send('Invalid email or password');
      }
      
      // توليد التوكن JWT
      const token = Token.generateToken({ email: user.email, id: user.id });
      
      // إرجاع التوكن كجزء من الاستجابة
      res.status(200).json({ token });
  });
};

// التسجيل
exports.register = (req, res) => {
  const {name, email, password } = req.body;
  const sqlCheckEmail = 'SELECT * FROM users WHERE email = ?';
  db.query(sqlCheckEmail, [email], async (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (results.length > 0) {
      return res.status(400).send('Email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const sqlInsertUser = 'INSERT INTO users (id,name, email, password) VALUES (?, ?, ?,?)';
    db.query(sqlInsertUser, [userId,name, email, hashedPassword], (err) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.status(201).send('User registered successfully');
    });
  });
};
