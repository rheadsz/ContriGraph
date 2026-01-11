const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

async function testToken() {
  try {
    const response = await fetch(
      'https://api.github.com/repos/langchain-ai/langchain/issues?state=open&per_page=1',
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Success! First issue:');
    console.log(`Title: ${data[0].title}`);
    console.log(`URL: ${data[0].html_url}`);
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Troubleshooting steps:');
    console.log('1. Verify token exists in .env: GITHUB_TOKEN=your_token_here');
    console.log('2. Ensure token has repo scope');
    console.log('3. Check token expiration at https://github.com/settings/tokens');
  }
}

testToken();
