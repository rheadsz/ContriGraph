// src/ingest.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'langchain-ai';
const REPO_NAME = 'langchain';

async function fetchIssues() {
  console.log('Fetching issues from GitHub...');
  
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
        params: {
          state: 'open',
          per_page: 30,               // Start small for testing
        },
      }
    );

    const issues = response.data.map(issue => ({
      id: issue.number,
      title: issue.title,
      body: issue.body || '',
      url: issue.html_url,
      labels: issue.labels.map(l => l.name),
    }));

    console.log(`Fetched ${issues.length} issues`);
    return issues;
  } catch (error) {
    console.error(' Failed to fetch issues:', error.response?.data?.message || error.message);
    process.exit(1);
  }
}

// Run it
fetchIssues().then(issues => {
  console.log('\nSample issue:');
  console.log(JSON.stringify(issues[0], null, 2));
});