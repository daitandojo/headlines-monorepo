// apps/pipeline/src/modules/email/templates/supervisorWrapper.js (version 2.0)
/**
 * Provides the HTML shell and CSS for the supervisor report email.
 * @param {string} bodyContent - The pre-compiled HTML content of the report.
 * @param {string} subject - The email subject.
 * @returns {string} The full HTML document for the email.
 */
export function createSupervisorEmailWrapper(bodyContent, subject) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; color: #212529; }
            .container { max-width: 1200px; margin: 20px auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            h1, h2, h3, h4 { margin-top: 0; margin-bottom: 1rem; font-weight: 600; color: #343a40; }
            h1 { font-size: 28px; }
            h2 { font-size: 22px; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; margin-top: 40px; }
            p { margin-top: 0; margin-bottom: 1rem; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px; }
            th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #dee2e6; }
            th { background-color: #f1f3f5; font-weight: 600; }
            tr:nth-child(even) { background-color: #f8f9fa; }
            a { color: #007bff; text-decoration: none; }
            .alert-box { border-left-width: 4px; border-radius: 4px; padding: 20px; margin: 20px 0; }
            .alert-danger { background-color: #f8d7da; border-left-color: #f5c6cb; color: #721c24; }
            .alert-danger h2 { color: #721c24; }
            .alert-info { background-color: #cce5ff; border-left-color: #b8daff; color: #004085; }
            .alert-info h2 { color: #004085; }
            .card { border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px; background-color: #ffffff; }
            .card-header { padding: 15px; border-bottom: 1px solid #dee2e6; background-color: #f8f9fa; }
            .card-body { padding: 20px; }
            .judge-verdict { border-left: 4px solid #17a2b8; padding-left: 15px; font-style: italic; color: #495057; }
            .verdict-positive { color: #28a745; font-weight: 600; }
            .verdict-negative { color: #dc3545; font-weight: 600; }
            .dashboard { table-layout: fixed; }
            .dashboard th { width: 30%; background-color: #f8f9fa; }
            .appendix-section { margin-top: 50px; padding-top: 30px; border-top: 2px solid #adb5bd;}
        </style>
    </head>
    <body>
        <div class="container">${bodyContent}</div>
    </body>
    </html>`
}
