const fs = require('fs');

const content = fs.readFileSync('sql/03_31_2026 Backup.sql', 'utf8');

// Find all insert into products statements
const insertPattern = /insert\s+into\s+`products`.*?values\s*\(([\s\S]*?)\);/gi;
let matches = [];
let match;

while ((match = insertPattern.exec(content)) !== null) {
  matches.push(match[0].substring(0, 500));
}

console.log('Found', matches.length, 'insert statements');
if (matches.length > 0) {
  console.log('First one:', matches[0].substring(0, 200));
}

// Try simpler approach - find lines with insert into products
const lines = content.split('\n');
const productInserts = lines.filter(l => l.includes("insert  into `products`"));
console.log('\nLines with product insert:', productInserts.length);
if (productInserts.length > 0) {
  console.log('First line:', productInserts[0].substring(0, 200));
}
