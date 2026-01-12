// src/ingest.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function fetchIssues(repoOwner, repoName) {
  console.log(`Fetching issues from ${repoOwner}/${repoName}...`);
  
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
        params: {
          state: 'open',
          per_page: 100,
        },
      }
    );

    const issues = response.data.map(issue => ({
      id: issue.number,
      title: issue.title,
      body: issue.body || '',
      url: issue.html_url,
      labels: issue.labels.map(l => l.name),
      comments: issue.comments || 0,
      repo: `${repoOwner}/${repoName}`,
      assignees: issue.assignees.map(a => a.login),
      state: issue.state,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
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

const neo4j = require('neo4j-driver')
const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function saveToNeo4j(issue, filePath) {
  const session = neo4jDriver.session();
  try {
    await session.executeWrite(tx =>
      tx.run(
        `
        MERGE (i:Issue {id: $issueId, repo: $repo})
          ON CREATE SET i.title = $title, i.url = $url, i.comments = $comments,
                        i.state = $state, i.createdAt = $createdAt, i.updatedAt = $updatedAt,
                        i.isAvailable = $isAvailable
          ON MATCH SET i.title = $title, i.url = $url, i.comments = $comments,
                       i.state = $state, i.updatedAt = $updatedAt,
                       i.isAvailable = $isAvailable
        MERGE (f:File {path: $filePath})
        MERGE (i)-[:RELATES_TO]->(f)
        
        WITH i
        UNWIND $labels AS labelName
        MERGE (l:Label {name: labelName})
        MERGE (i)-[:HAS_LABEL]->(l)
        
        WITH i
        UNWIND CASE WHEN size($assignees) > 0 THEN $assignees ELSE [null] END AS assignee
        FOREACH (a IN CASE WHEN assignee IS NOT NULL THEN [assignee] ELSE [] END |
          MERGE (u:User {username: a})
          MERGE (i)-[:ASSIGNED_TO]->(u)
        )
        `,
        {
          issueId: issue.id,
          repo: issue.repo,
          title: issue.title,
          url: issue.url,
          comments: issue.comments,
          state: issue.state,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          isAvailable: issue.assignees.length === 0,
          filePath: filePath,
          labels: issue.labels,
          assignees: issue.assignees,
        }
      )
    );
    console.log(`Saved Issue #${issue.id} → ${filePath}`);
  } catch (error) {
    console.error(`Failed to save Issue #${issue.id}:`, error.message);
  } finally {
    await session.close();
  }
}





// Configuration: Add more repositories here
const REPOS = [
  { owner: 'langchain-ai', name: 'langchain' },
  // Add more repos as needed
];

async function ingestRepository(repoOwner, repoName) {
  console.log(`\n=== Processing ${repoOwner}/${repoName} ===\n`);
  
  const issues = await fetchIssues(repoOwner, repoName);
  console.log('\nExtracting file paths with Qwen...\n');
  
  const sampleIssues = issues.slice(0, 30);
  for (const issue of sampleIssues) {
    const filePath = await extractFilePath(issue);
    if (filePath !== 'unknown') {
      await saveToNeo4j(issue, filePath);
    }
  }
}

// Main execution
(async () => {
  try {
    for (const repo of REPOS) {
      await ingestRepository(repo.owner, repo.name);
    }
    
    await neo4jDriver.close();
    console.log('\n=== Ingestion complete for all repositories! ===');
  } catch (error) {
    console.error('Ingestion failed:', error);
    await neo4jDriver.close();
    process.exit(1);
  }
})();

