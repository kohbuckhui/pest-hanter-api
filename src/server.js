require('dotenv').config();
const express = require('express');
const cors = require('cors');
const submitRoute = require('./routes/submit');
const approveRoute = require('./routes/approve');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pest-hanter-api', timestamp: new Date().toISOString() });
});

app.use('/webhook', submitRoute);
app.use('/webhook', approveRoute);

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Pest Hanter API running on port ${PORT}`);
  console.log(`  POST ${process.env.BASE_URL || 'http://localhost:' + PORT}/webhook/job-submit`);
  console.log(`  GET  ${process.env.BASE_URL || 'http://localhost:' + PORT}/webhook/approve-report`);
});
