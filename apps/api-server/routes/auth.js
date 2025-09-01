const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')

require('dotenv').config()

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET;

router.use((req, res, next) => {
  req.db = req.app.get('db')
  next()
})

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send("Access token required")
  }

  const token = authHeader.split(' ')[1]

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send("Invalid or expired access token");
    }

    req.db.get("SELECT id, email, created_at FROM users WHERE id = ?", [decoded.userId])
      .then((user) => {
        if (!user) {
          return res.status(404).send("User not found");
        }
        res.status(200).json(user);
      })
      .catch((err) => {
        console.error("Error fetching user for /me:", err);
        return res.status(500).send("Internal server error");
      });
  });
});

router.post('/register', (req, res) => {
  var body = req.body

  if (!body.email || !body.password) {
    return res.status(400).send("Email and password are required")
  }

  // verify email using regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // TO BE CHANGED with design section
  if (!emailRegex.test(body.email)) {
    return res.status(400).send("Invalid email format")
  }

  // hashing password
  bcrypt.hash(body.password, 10, (err, hash) => {
    if (err) {
      console.error("Error hashing password:", err)
      return res.status(500).send("Internal server error")
    }

    // adding to db
    req.db.run("INSERT INTO users (email, password_hash) VALUES (?, ?);", [body.email, hash])
      .then((value) => {
        console.log('User inserted with ID:', value.lastID);
        return res.status(200).send("User registered successfully");
      }).catch((err) => {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).send("Email exists");
        }

        console.error("Error saving user to database:", err);
        return res.status(500).send("Internal server error");
      });
  });
})

router.post('/login', (req, res) => {
  var body = req.body

  if (!body.email || !body.password) {
    return res.status(400).send("Email and password are required")
  }

  req.db.get("SELECT * FROM users WHERE email = ?", [body.email])
    .then((user) => {
      if (!user) {
        return res.status(401).send("Invalid email or password");
      }

      bcrypt.compare(body.password, user.password_hash, (err, result) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          return res.status(500).send("Internal server error");
        }

        if (!result) {
          return res.status(401).send("Invalid email or password");
        }

        const accessToken = jwt.sign(
          { userId: user.id, email: user.email, },
          JWT_SECRET,
          { expiresIn: '15m' }
        )

        const refreshToken = crypto.randomBytes(64).toString('hex');

        req.db.run("INSERT INTO sessions (user_id, refresh_token) VALUES (?, ?);", [user.id, refreshToken])
          .then(() => {
            res.status(200).send({ accessToken, refreshToken });
          })
          .catch((err) => {
            console.error("Error saving refresh token to database:", err);
            return res.status(500).send("Internal server error");
          });
      });
    })
    .catch((err) => {
      console.error("Error fetching user:", err);
      return res.status(500).send("Internal server error");
    });
});

router.post('/logout', (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).send("Refresh token is required")
  }

  req.db.run(
    "UPDATE sessions SET revoked = 1 WHERE refresh_token = ?",
    [refreshToken]
  )
    .then(({ changes }) => {
      if (changes === 0) {
        return res.status(400).send("Session not found or already revoked");
      }
      res.status(200).send("Logged out successfully");
    })
    .catch((err) => {
      console.error("Error revoking session:", err);
      return res.status(500).send("Internal server error");
    });
})

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).send("Refresh token is required")
  }

  req.db.get(
    "SELECT * FROM sessions WHERE refresh_token = ? AND revoked = 0",
    [refreshToken]
  )
    .then((session) => {
      if (!session) {
        return res.status(401).send("Invalid refresh token");
      }

      req.db.get(
        "SELECT * FROM users WHERE id = ?",
        [session.user_id]
      ).then((user) => {
        if (!user) {
          return res.status(401).send("User not found");
        }

        // Generate new access token
        const accessToken = jwt.sign(
          { userId: user.id, email: user.email },
          JWT_SECRET,
          { expiresIn: '15m' }
        );

        res.status(200).send({ accessToken });
      }).catch((err) => {
        console.error("Error fetching user for refresh:", err);
        return res.status(500).send("Internal server error");
      })
    })
    .catch((err) => {
      console.error("Error fetching session:", err);
      return res.status(500).send("Internal server error");
    });
})

module.exports = router