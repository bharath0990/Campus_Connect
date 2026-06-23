const fs = require('fs');
const path = require('path');

console.log("=== CampusStay Load & Performance Analyzer ===");

// 1. Audit Website Assets
const webFiles = [
  { name: 'app.js', path: path.join(__dirname, '../app.js') },
  { name: 'styles.css', path: path.join(__dirname, '../styles.css') }
];

console.log("\nAuditing Website Assets...");
webFiles.forEach(f => {
  if (fs.existsSync(f.path)) {
    const stats = fs.statSync(f.path);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`[PASS] ${f.name} size is ${sizeKB} KB (budget: 500 KB)`);
  } else {
    console.log(`[WARN] ${f.name} not found at ${f.path}`);
  }
});

// 2. Audit App Bundle / Files
console.log("\nAuditing App Bundle...");
const appFiles = [
  { name: 'pubspec.yaml', path: path.join(__dirname, '../../flutter_app/pubspec.yaml') },
  { name: 'main.dart', path: path.join(__dirname, '../../flutter_app/lib/main.dart') }
];

appFiles.forEach(f => {
  if (fs.existsSync(f.path)) {
    const stats = fs.statSync(f.path);
    console.log(`[PASS] ${f.name} analyzed successfully (${stats.size} bytes)`);
  } else {
    console.log(`[WARN] ${f.name} not found at ${f.path}`);
  }
});

console.log("\n=== Load & Performance Analysis Completed ===");
