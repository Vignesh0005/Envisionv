const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Installing Python dependencies...');
  execSync('pip install -r backend/requirements.txt', { stdio: 'inherit' });
  console.log('Python dependencies installed successfully');
} catch (error) {
  console.error('Failed to install Python dependencies:', error);
  process.exit(1);
}