const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'bmm_db'
  });

  try {
    console.log('Running migration...');
    
    // Check if username column exists
    const [columns] = await connection.query('DESCRIBE inv_users');
    const hasUsername = columns.some(col => col.Field === 'username');
    
    if (!hasUsername) {
      console.log('Adding username column...');
      await connection.query('ALTER TABLE inv_users ADD COLUMN username VARCHAR(100) AFTER id');
      console.log('Username column added.');
      
      // Update existing admin user
      console.log('Updating admin user...');
      await connection.query('UPDATE inv_users SET username = "admin" WHERE email LIKE "%admin%" OR full_name = "Admin" LIMIT 1');
      
      // Make username NOT NULL
      console.log('Making username NOT NULL...');
      await connection.query('ALTER TABLE inv_users MODIFY COLUMN username VARCHAR(100) NOT NULL');
      
      console.log('Migration completed successfully!');
    } else {
      console.log('Username column already exists.');
    }
    
    // Verify
    const [users] = await connection.query('SELECT id, username, full_name FROM inv_users LIMIT 5');
    console.log('\nUsers in database:');
    console.table(users);
    
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
