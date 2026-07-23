const fs = require('fs');
const code = fs.readFileSync('website/app.js', 'utf8');

let stack = [];
let inStr = null;
let escape = false;

const lines = code.split('\n');
lines.forEach((line, lineIdx) => {
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (c === '\\') {
      escape = true;
      continue;
    }

    if (inStr) {
      if (c === inStr) {
        inStr = null;
      }
      continue;
    }

    if (c === "'" || c === '"' || c === '`') {
      inStr = c;
      continue;
    }

    // Ignore line comments
    if (c === '/' && line[i+1] === '/') {
      break;
    }

    if (c === '{' || c === '(' || c === '[') {
      stack.push({ char: c, line: lineIdx + 1, col: i + 1 });
    } else if (c === '}' || c === ')' || c === ']') {
      if (stack.length === 0) {
        console.log(`Unmatched closing '${c}' at line ${lineIdx + 1}, col ${i + 1}`);
      } else {
        const top = stack.pop();
        const pairs = { '}': '{', ')': '(', ']': '[' };
        if (top.char !== pairs[c]) {
          console.log(`Mismatch '${c}' at line ${lineIdx + 1}, col ${i + 1}. Expected match for '${top.char}' from line ${top.line}`);
        }
      }
    }
  }
});

console.log('Total unclosed:', stack.length);
if (stack.length > 0) {
  console.log('Unclosed elements:', stack);
}
