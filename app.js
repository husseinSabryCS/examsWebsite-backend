const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./scr/models/db'); 
const adminRoutes = require('./scr/routes/adminRoutes');
const studentRoutes = require('./scr/routes/studentRoutes');
const authRoutes = require('./scr/routes/authRoutes');
const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());

app.use(bodyParser.json());  

app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
