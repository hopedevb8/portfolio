const fs = require('node:fs');
const path = require('node:path');

const parseEnvLine = line => {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf('=');

  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  let value = trimmedLine.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
};

const loadEnvFile = filePath => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');

  fileContent.split(/\r?\n/).forEach(line => {
    const entry = parseEnvLine(line);

    if (entry && process.env[entry.key] === undefined) {
      process.env[entry.key] = entry.value;
    }
  });
};

const rootDirectoryPath = path.join(__dirname, '..');
const nodeEnvironment = process.env.NODE_ENV || 'development';

[
  '.env',
  `.env.${nodeEnvironment}`,
  '.env.local',
  `.env.${nodeEnvironment}.local`,
].forEach(fileName => {
  loadEnvFile(path.join(rootDirectoryPath, fileName));
});
