const jwt = require('jsonwebtoken');
require('dotenv').config();
const secretKey = process.env.SECRET_KEY;


class Token {

    static generateToken(user) {
        return jwt.sign(user, secretKey, { expiresIn: '1h' });
    }

    static verifyToken(req, res, next) {
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ message: 'Token is required' });
        }

        try {
            const decoded = jwt.verify(token, secretKey);
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({ message: 'Invalid token' });  
        }
    }
    
    
}

module.exports = Token;
     