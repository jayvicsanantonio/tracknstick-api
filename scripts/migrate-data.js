#!/usr/bin/env node

/**
 * Data Migration Script for SQLite to D1
 *
 * This script exports data from your existing SQLite database
 * to SQL statements that can be imported into Cloudflare D1.
 *
 * Usage:
 * node scripts/migrate-data.js
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const SOURCE_DB_PATH =
  process.env.SOURCE_DB_PATH || path.join(__dirname, '../tracknstick.db');
const OUTPUT_PATH =
  process.env.OUTPUT_PATH ||
  path.join(__dirname, '../migrations/data_import.sql');
const TABLES = ['users', 'habits', 'trackers'];

// Connect to the source SQLite database
console.log(`Connecting to source database: ${SOURCE_DB_PATH}`);
const db = new sqlite3.Database(
  SOURCE_DB_PATH,
  sqlite3.OPEN_READONLY,
  (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      process.exit(1);
    }
    console.log('Connected to the SQLite database.');
  }
);

// Helper function to escape SQL values
function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? '1' : '0';

  // Escape string: replace single quotes with two single quotes
  return `'${val.toString().replace(/'/g, "''")}'`;
}

// Helper function to get table schema
async function getTableSchema(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Helper function to get table data
async function getTableData(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Generate SQL INSERT statements for a table
async function generateInsertStatements(tableName) {
  console.log(`Processing table: ${tableName}`);

  const schema = await getTableSchema(tableName);
  const data = await getTableData(tableName);

  if (data.length === 0) {
    console.log(`  Table ${tableName} is empty. Skipping.`);
    return [];
  }

  console.log(`  Found ${data.length} rows in ${tableName}`);

  const columnNames = schema.map((col) => col.name);
  const insertStatements = [];

  for (const row of data) {
    const values = columnNames.map((col) => escapeSql(row[col]));
    const insertSql = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});`;
    insertStatements.push(insertSql);
  }

  return insertStatements;
}

// Main function to export all data
async function exportData() {
  try {
    let allStatements = [];

    // Begin transaction
    allStatements.push('-- Data migration export');
    allStatements.push('-- Generated: ' + new Date().toISOString());
    allStatements.push('BEGIN TRANSACTION;');

    // Generate INSERT statements for each table
    for (const table of TABLES) {
      const insertStatements = await generateInsertStatements(table);

      if (insertStatements.length > 0) {
        allStatements.push(`\n-- Data for table ${table}`);
        allStatements.push(...insertStatements);
      }
    }

    // Commit transaction
    allStatements.push('\nCOMMIT;');

    // Write the SQL file
    fs.writeFileSync(OUTPUT_PATH, allStatements.join('\n'));
    console.log(
      `\nExport complete! ${allStatements.length} SQL statements written to ${OUTPUT_PATH}`
    );

    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  } catch (error) {
    console.error('Error during export:', error);
    process.exit(1);
  }
}

// Run the script
exportData();
