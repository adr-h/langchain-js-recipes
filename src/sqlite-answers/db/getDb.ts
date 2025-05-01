import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";

sqlite3.verbose();

const scriptPath = path.join(__dirname, 'Chinook_Sqlite.sql');
const dbPath = path.join(__dirname, 'sample.db');

async function createDb() {
   console.log('Creating new DB');
   const db = new sqlite3.Database(dbPath, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);

   console.log('Migrating + seeding DB');
   // It's 2025, but the sqlite3 package still doesn't have a promise interface
   await new Promise<void>((resolve, reject) => {
      db.exec(fs.readFileSync(scriptPath, { encoding: 'utf-8'}), (err) => {
         if (err) return reject(err);

         resolve();
      })
   })

   await new Promise<void>((resolve, reject) => {
      db.close((err) => {
         if (err) return reject(err);

         resolve();
      })
   })

   console.log('Done migrating + seeding DB');
   console.log('Chinook DB was sourced from: https://github.com/lerocha/chinook-database')
}

let db: SqlDatabase;

export async function getDb() {
   // if langchain DB conn object has not been created, create it. Else, return existing.
   if (!db) {
      await createDb();

      db = await SqlDatabase.fromDataSourceParams({
         appDataSource: new DataSource({
            type: "sqlite",
            database: dbPath,
         })
      });
   }

   return db;
}
