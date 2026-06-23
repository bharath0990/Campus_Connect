const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

class ReportGenerator {
  constructor() {
    this.results = [];
    this.logs = [];
    this.startTime = null;
  }

  init() {
    this.results = [];
    this.logs = [];
    this.startTime = new Date();
    this.log('E2E Test Suite Initialized');
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logMsg = `[${timestamp}] [${level}] ${message}`;
    this.logs.push(logMsg);
    console.log(logMsg);
  }

  addResult(testName, passed, error = null) {
    const timestamp = new Date();
    const durationSeconds = this.results.length === 0 
      ? ((timestamp - this.startTime) / 1000).toFixed(2)
      : ((timestamp - new Date(this.results[this.results.length - 1].timestamp)) / 1000).toFixed(2);

    this.results.push({
      testName,
      passed,
      error: error || null,
      timestamp: timestamp.toISOString(),
      durationSeconds: parseFloat(durationSeconds)
    });
    this.log(`Result: ${testName} -> ${passed ? 'PASSED' : 'FAILED'}${error ? ` (Error: ${error})` : ''}`, passed ? 'PASS' : 'FAIL');
  }

  async generateAndPrint() {
    const endTime = new Date();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    const report = {
      total,
      passed,
      failed,
      durationSeconds: parseFloat(duration),
      results: this.results
    };

    const reportDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Save report as JSON
    fs.writeFileSync(
      path.join(reportDir, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Save execution logs
    fs.writeFileSync(
      path.join(reportDir, 'test-logs.log'),
      this.logs.join('\n')
    );

    // Save report as Excel file (xlsx)
    try {
      const wb = XLSX.utils.book_new();
      
      const summaryData = [
        ["CampusStay E2E Test Suite Execution Report"],
        [],
        ["Metric", "Value"],
        ["Total Test Cases", total],
        ["Passed Cases", passed],
        ["Failed Cases", failed],
        ["Success Rate", `${((passed / total) * 100).toFixed(1)}%`],
        ["Duration (Seconds)", parseFloat(duration)],
        ["Execution Date", endTime.toLocaleString()]
      ];
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Execution Summary");
      
      const detailHeaders = ["Test ID", "Category", "Test Case Name", "Status", "Duration (Seconds)", "Error / Details"];
      const detailRows = this.results.map((r, index) => {
        let category = "General";
        const name = r.testName.toLowerCase();
        if (name.includes("signup") || name.includes("register")) {
          category = name.includes("owner") ? "Owner Auth" : "Student Auth";
        } else if (name.includes("login") || name.includes("sign in")) {
          category = name.includes("owner") ? "Owner Auth" : "Student Auth";
        } else if (name.includes("dashboard") || name.includes("tabs")) {
          category = name.includes("owner") ? "Owner Portal" : "Student Portal";
        } else if (name.includes("chat")) {
          category = name.includes("owner") ? "Owner Portal" : "Student Portal";
        } else if (name.includes("listing") || name.includes("pg")) {
          category = "Owner Portal";
        }
        
        return [
          index + 1,
          category,
          r.testName,
          r.passed ? "PASSED" : "FAILED",
          r.durationSeconds || 0.00,
          r.error || "Execution completed successfully."
        ];
      });
      
      const wsDetails = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
      
      wsDetails['!cols'] = [
        { wch: 10 }, // Test ID
        { wch: 15 }, // Category
        { wch: 45 }, // Test Case Name
        { wch: 12 }, // Status
        { wch: 18 }, // Duration
        { wch: 50 }  // Error / Details
      ];
      
      XLSX.utils.book_append_sheet(wb, wsDetails, "Detailed Results");
      
      const excelPath = path.join(reportDir, 'test-report.xlsx');
      XLSX.writeFile(wb, excelPath);
      this.log(`Excel Report generated: ${excelPath}`);
    } catch (excelErr) {
      this.log(`Failed to generate Excel report: ${excelErr.message}`, 'ERROR');
    }

    // Build premium, responsive HTML report styled with CampusStay identity
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CampusStay E2E Test Report</title>
  <style>
    :root {
      --primary: #D32F2F;
      --primary-hover: #B71C1C;
      --green: #2E7D32;
      --green-bg: #E8F5E9;
      --red-bg: #FFEBEE;
      --bg: #F5F7FA;
      --card-bg: #FFFFFF;
      --text-main: #1A1A1A;
      --text-muted: #666666;
      --border: #E5E7EB;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text-main);
      padding: 40px 24px;
      margin: 0;
      line-height: 1.5;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: var(--card-bg);
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.04);
      border: 1px solid var(--border);
    }
    .header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      background: var(--primary);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-weight: 900;
      font-size: 16px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .summary-card {
      background: var(--bg);
      padding: 24px;
      border-radius: 16px;
      text-align: center;
      border: 1px solid var(--border);
    }
    .summary-card.passed {
      background: var(--green-bg);
      border-color: rgba(46, 125, 50, 0.15);
      color: var(--green);
    }
    .summary-card.failed {
      background: var(--red-bg);
      border-color: rgba(211, 47, 47, 0.15);
      color: var(--primary);
    }
    .summary-val {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .summary-lbl {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h2 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 20px;
      color: var(--text-main);
    }
    .results-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .results-table th {
      padding: 14px 20px;
      background: var(--bg);
      font-weight: 700;
      font-size: 13px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
    }
    .results-table td {
      padding: 20px;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .status-badge.passed {
      background: var(--green-bg);
      color: var(--green);
    }
    .status-badge.failed {
      background: var(--red-bg);
      color: var(--primary);
    }
    .error-msg {
      margin-top: 10px;
      color: var(--primary);
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      background: var(--red-bg);
      padding: 14px;
      border-radius: 10px;
      font-size: 12px;
      border: 1px solid rgba(211, 47, 47, 0.1);
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-area">
        <div class="logo-badge">CS</div>
        <h1>CampusStay E2E Automated Test Report</h1>
      </div>
      <span style="font-size: 14px; color: var(--text-muted); font-weight: 600;">Time: ${endTime.toLocaleString()}</span>
    </div>
    
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-val">${total}</div>
        <div class="summary-lbl">Total Cases</div>
      </div>
      <div class="summary-card passed">
        <div class="summary-val">${passed}</div>
        <div class="summary-lbl">Passed</div>
      </div>
      <div class="summary-card failed">
        <div class="summary-val">${failed}</div>
        <div class="summary-lbl">Failed</div>
      </div>
      <div class="summary-card">
        <div class="summary-val">${duration}s</div>
        <div class="summary-lbl">Duration</div>
      </div>
    </div>

    <h2>Detailed Test Case Execution</h2>
    <table class="results-table">
      <thead>
        <tr>
          <th>Test Case / Action</th>
          <th style="width: 140px; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${this.results.map(r => `
          <tr>
            <td>
              <strong style="font-size:15px; color:#222;">${r.testName}</strong>
              ${r.error ? `<div class="error-msg">${r.error}</div>` : ''}
            </td>
            <td style="text-align: center;">
              <span class="status-badge ${r.passed ? 'passed' : 'failed'}">
                ${r.passed ? 'Passed' : 'Failed'}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;

    fs.writeFileSync(
      path.join(reportDir, 'test-report.html'),
      htmlContent
    );
    this.log(`HTML Report generated: ${path.join(reportDir, 'test-report.html')}`);

    if (process.env.GITHUB_STEP_SUMMARY) {
      try {
        let md = `## 🌐 Selenium Web Tests — CampusStay\n\n`;
        md += `| ID | Test Name | Status |\n`;
        md += `| --- | --- | --- |\n`;
        this.results.forEach((r, index) => {
          const id = `TC-W${String(index + 1).padStart(3, '0')}`;
          const statusIcon = r.passed ? ':white_check_mark: PASS' : ':x: FAIL';
          md += `| ${id} | ${r.testName} | ${statusIcon} |\n`;
        });
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
        this.log(`Added results to GitHub Step Summary`);
      } catch (err) {
        this.log(`Failed to write to GitHub Step Summary: ${err.message}`, 'WARNING');
      }
    }

    return report;
  }
}

module.exports = new ReportGenerator();
