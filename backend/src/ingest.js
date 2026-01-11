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

async function extractFilePath(issue){
    const prompt = `You are an expert Python developer. Analyze this GitHub issue and respond ONLY with the most relevant source code file path in the LangChain repository. Use Unix-style relative paths ending with .py. If no file is clearly mentioned, respond "unknown".

Examples:
- Input: "Redis cache TTL bug" → Output: langchain/cache/redis.py
- Input: "Docs typo" → Output: unknown

Now analyze:

Title: ${issue.title}
Body: ${issue.body || ''}

Output:`;

    try{
        //using Ollama's HTTP API which runs on localhost:11434 by default
        const response = await axios.post('http://localhost:11434/api/generate',{
            model: 'qwen2:7b',
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.7,
               
            }
        });

    let rawResponse = response.data.response.trim();

    // Clean common artifacts
    rawResponse = rawResponse
      .split('\n')[0]
      .replace(/^[>"'\s]+|[>"'\s]+$/g, '')
      .replace(/```.*$/, '');

    // Validate: must be a clean .py path
    if (
      rawResponse === 'unknown' ||
      rawResponse.includes(' ') ||
      rawResponse.length > 80 ||
      !rawResponse.endsWith('.py')
    ) {
      return 'unknown';
    }
        
    console.log(`Issue #${issue.id}: ${rawResponse}`);
    return rawResponse;

    } catch (error){
        console.error(`Failed to process issue #${issue.id}:`, error.message);
        return 'unknown';
    }



}



// Run it
fetchIssues().then(async (issues) => {
  console.log('\n Extracting file paths with Qwen...\n');
  
  // Processing first 5 issues as a test
  const sampleIssues = issues.slice(0, 5);
  for (const issue of sampleIssues) {
    await extractFilePath(issue);
  }
});

