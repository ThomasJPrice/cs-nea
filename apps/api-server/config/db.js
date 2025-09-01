const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const path = require('path')
const logger = require('./logger')
  
async function initDB() {
  const db = await open({
    filename: path.resolve(__dirname, '../../../shared/database.db'),
    driver: sqlite3.Database
  })
  logger.info('Database connection opened');
  return db
}

module.exports = { initDB }