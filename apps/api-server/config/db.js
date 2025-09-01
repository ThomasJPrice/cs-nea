const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const path = require('path')
  
async function initDB() {
  const db = await open({
    filename: path.resolve(__dirname, '../../../shared/database.db'),
    driver: sqlite3.Database
  })

  return db
}

module.exports = { initDB }