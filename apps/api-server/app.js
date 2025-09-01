const express = require("express");
const { initDB } = require("./config/db");
const app = express()
const port = 8080

app.use(express.json())

let db;

app.get("/", (req, res) => {
  res.send("Hello World!")
})

app.use('/layouts', require('./routes/layout'))
app.use('/auth', require('./routes/auth'))
app.use('/devices', require('./routes/device'))


initDB().then(database => {
  db = database;
  app.set('db', db)
  console.log("Connected to SQLite database")

  app.listen(port, () => {
    console.log(`API server listening at http://localhost:${port}`)
  })
})