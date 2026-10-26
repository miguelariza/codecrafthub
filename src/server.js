const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('===============================================');
  console.log(` CodeCraftHub API is running on port ${PORT}`);
  console.log(` URL: http://localhost:${PORT}/api/courses`);
  console.log('===============================================');
});
