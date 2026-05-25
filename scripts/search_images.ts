import * as fs from 'fs';
import * as path from 'path';

function searchDirectory(dir: string, keyword: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchDirectory(fullPath, keyword);
      }
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes(keyword)) {
        console.log(`Match found in: ${fullPath}`);
      }
    }
  }
}

console.log('Searching for "<img "...');
searchDirectory(process.cwd(), '<img ');
console.log('Search complete.');
