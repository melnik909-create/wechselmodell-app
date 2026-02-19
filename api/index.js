const express = require('express');
const path = require('path');

const app = express();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API route example
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Wechselmodell App is running' });
});

// All other routes serve index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
