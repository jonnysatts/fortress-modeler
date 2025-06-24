const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'fortress-modeler-api',
    version: '3.0.0-test'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Fortress Modeler API Test',
    status: 'running',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});