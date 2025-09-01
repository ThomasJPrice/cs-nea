const express = require("express");
const { initDB } = require("./config/db");
const logger = require("./config/logger");
const app = express()
const port = 8080

app.use(express.json())

let db;

app.get("/", (req, res) => {
  logger.info("GET /");
  res.send("Hello World!")
})

app.use('/layouts', require('./routes/layout'))
app.use('/auth', require('./routes/auth'))
app.use('/devices', require('./routes/device'))


initDB().then(database => {
  db = database;
  app.set('db', db)
  logger.info("Connected to SQLite database")

  app.listen(port, () => {
    logger.info(`API server listening at http://localhost:${port}`)
  })
})