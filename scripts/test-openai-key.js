#!/usr/bin/env node

import fs from 'fs';
import https from 'https';

// Read API key from .env file
const envContent = fs.readFileSync('.env', 'utf8');
const apiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);

if (!apiKeyMatch) {
  console.log('❌ No OPENAI_API_KEY found in .env file');
  process.exit(1);
}

const apiKey = apiKeyMatch[1].trim();
console.log(`🔑 API Key length: ${apiKey.length}`);
console.log(`🔑 API Key starts with: ${apiKey.substring(0, 10)}...`);

// Test the API key with a simple request
const testData = JSON.stringify({
  model: "gpt-3.5-turbo",
  messages: [{"role": "user", "content": "Just respond with: API test successful"}],
  max_tokens: 10
});

const options = {
  hostname: 'api.openai.com',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('🧪 Testing OpenAI API key...');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📊 Response status: ${res.statusCode}`);
    
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('✅ API key is working!');
        console.log(`💬 Response: ${response.choices[0].message.content}`);
      } else {
        console.log('❌ API call failed:');
        console.log(JSON.stringify(response, null, 2));
      }
    } catch (error) {
      console.log('❌ Failed to parse response:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Request error:', error.message);
});

req.write(testData);
req.end();