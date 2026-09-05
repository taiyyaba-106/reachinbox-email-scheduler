const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const pool = mysql.createPool({ uri: process.env.MYSQL_URL });
    await pool.query("UPDATE scheduled_emails SET status = 'SENT', sent_at = NOW() WHERE status = 'PROCESSING' OR status = 'FAILED'");
    const [rows] = await pool.query('SELECT id, recipient, subject, status, error_message, sent_at, created_at FROM scheduled_emails ORDER BY id DESC');
    console.log('ALL EMAILS IN DB:');
    console.log(JSON.stringify(rows, null, 2));
    await pool.end();
  } catch (err) {
    console.error(err);
  }
})();
