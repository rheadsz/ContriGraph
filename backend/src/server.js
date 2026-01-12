// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const neo4j = require('neo4j-driver');
const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const { extractIntent, buildCypherQuery } = require('./queryProcessor');

// Enabled CORS (so frontend can call backend)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Get all issues
app.get('/api/issues', async (req, res) => {
  const session = neo4jDriver.session();
  try {
    const result = await session.executeRead(tx =>
      tx.run(`
        MATCH (i:Issue)-[:RELATES_TO]->(f:File)
        OPTIONAL MATCH (i)-[:ASSIGNED_TO]->(u:User)
        WITH i, collect(DISTINCT f.path)[0] AS filePath, collect(DISTINCT u.username) AS assignees
        RETURN DISTINCT i.id AS id, i.title AS title, i.url AS url, filePath, 
               i.repo AS repo, i.isAvailable AS isAvailable, i.state AS state,
               i.updatedAt AS updatedAt, assignees
        ORDER BY id DESC
        LIMIT 100
      `)
    );

    const issues = result.records.map(record => ({
      id: record.get('id'),
      title: record.get('title'),
      url: record.get('url'),
      filePath: record.get('filePath'),
      repo: record.get('repo'),
      isAvailable: record.get('isAvailable'),
      state: record.get('state'),
      updatedAt: record.get('updatedAt'),
      assignees: record.get('assignees').filter(a => a !== null),
    }));

    res.json({ issues });
  } catch (error) {
    console.error('Neo4j query failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch issues' });
  } finally {
    await session.close();
  }
});

// Get available repositories
app.get('/api/repos', async (req, res) => {
  const session = neo4jDriver.session();
  try {
    const result = await session.executeRead(tx =>
      tx.run(`
        MATCH (i:Issue)
        RETURN DISTINCT i.repo AS repo
        ORDER BY repo
      `)
    );

    const repos = result.records.map(record => record.get('repo'));
    res.json({ repos });
  } catch (error) {
    console.error('Failed to fetch repos:', error.message);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  } finally {
    await session.close();
  }
});

// Get graph data for a specific issue
app.get('/api/issues/:issueId/graph', async (req, res) => {
  const { issueId } = req.params;
  const session = neo4jDriver.session();
  
  try {
    const result = await session.executeRead(tx =>
      tx.run(`
        MATCH (i:Issue {id: $issueId})-[:RELATES_TO]->(f:File)
        OPTIONAL MATCH (i)-[:ASSIGNED_TO]->(u:User)
        OPTIONAL MATCH (i)-[:HAS_LABEL]->(l:Label)
        OPTIONAL MATCH (other:Issue)-[:RELATES_TO]->(f)
        WHERE other.id <> $issueId
        WITH i, f, collect(DISTINCT u.username) AS assignees, 
             collect(DISTINCT l.name) AS labels,
             collect(DISTINCT {id: other.id, title: other.title, isAvailable: other.isAvailable}) AS relatedIssues
        RETURN i.id AS issueId, i.title AS issueTitle, i.url AS issueUrl, 
               i.isAvailable AS isAvailable, f.path AS filePath,
               assignees, labels, relatedIssues
      `, { issueId: parseInt(issueId) })
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const record = result.records[0];
    res.json({
      issue: {
        id: record.get('issueId'),
        title: record.get('issueTitle'),
        url: record.get('issueUrl'),
        isAvailable: record.get('isAvailable'),
      },
      file: {
        path: record.get('filePath'),
      },
      assignees: record.get('assignees').filter(a => a !== null),
      labels: record.get('labels').filter(l => l !== null),
      relatedIssues: record.get('relatedIssues').filter(ri => ri.id !== null),
    });
  } catch (error) {
    console.error('Failed to fetch issue graph:', error.message);
    res.status(500).json({ error: 'Failed to fetch issue graph' });
  } finally {
    await session.close();
  }
});

// Analytics endpoint for visualizations
app.get('/api/analytics', async (req, res) => {
  const session = neo4jDriver.session();
  try {
    // Get issue distribution by labels
    const labelStats = await session.executeRead(tx =>
      tx.run(`
        MATCH (i:Issue)-[:HAS_LABEL]->(l:Label)
        RETURN l.name AS label, count(i) AS count
        ORDER BY count DESC
        LIMIT 10
      `)
    );

    // Get file frequency (most referenced files)
    const fileStats = await session.executeRead(tx =>
      tx.run(`
        MATCH (i:Issue)-[:RELATES_TO]->(f:File)
        RETURN f.path AS file, count(i) AS issueCount
        ORDER BY issueCount DESC
        LIMIT 10
      `)
    );

    // Get availability stats
    const availabilityStats = await session.executeRead(tx =>
      tx.run(`
        MATCH (i:Issue)
        RETURN 
          count(CASE WHEN i.isAvailable = true THEN 1 END) AS available,
          count(CASE WHEN i.isAvailable = false THEN 1 END) AS claimed
      `)
    );

    // Get graph data for network visualization
    const graphData = await session.executeRead(tx =>
      tx.run(`
        MATCH (i:Issue)-[:RELATES_TO]->(f:File)
        OPTIONAL MATCH (i)-[:ASSIGNED_TO]->(u:User)
        RETURN i.id AS issueId, i.title AS issueTitle, i.isAvailable AS isAvailable,
               f.path AS filePath, collect(u.username) AS assignees
        LIMIT 50
      `)
    );

    res.json({
      labels: labelStats.records.map(r => ({
        name: r.get('label'),
        count: r.get('count').toNumber(),
      })),
      files: fileStats.records.map(r => ({
        name: r.get('file'),
        count: r.get('issueCount').toNumber(),
      })),
      availability: {
        available: availabilityStats.records[0]?.get('available').toNumber() || 0,
        claimed: availabilityStats.records[0]?.get('claimed').toNumber() || 0,
      },
      graph: graphData.records.map(r => ({
        issueId: r.get('issueId'),
        issueTitle: r.get('issueTitle'),
        isAvailable: r.get('isAvailable'),
        filePath: r.get('filePath'),
        assignees: r.get('assignees').filter(a => a !== null),
      })),
    });
  } catch (error) {
    console.error('Analytics query failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  } finally {
    await session.close();
  }
});

// Conversational AI query endpoint
app.post('/api/query', async (req, res) => {
  const { repo, query } = req.body;

  if (!repo || !query) {
    return res.status(400).json({ error: 'Repository and query are required' });
  }

  const session = neo4jDriver.session();
  try {
    // Step 1: Extract intent using Qwen AI
    console.log(`Processing query: "${query}" for repo: ${repo}`);
    const intent = await extractIntent(query);

    // Step 2: Build Cypher query based on intent
    const { cypher, params } = buildCypherQuery(repo, intent);
    console.log('Generated Cypher:', cypher);
    console.log('Parameters:', params);

    // Step 3: Execute query
    const result = await session.executeRead(tx => tx.run(cypher, params));

    const issues = result.records.map(record => ({
      id: record.get('id'),
      title: record.get('title'),
      url: record.get('url'),
      filePath: record.get('filePath'),
      comments: record.get('comments'),
      isAvailable: record.get('isAvailable'),
      assignees: record.get('assignees') ? record.get('assignees').filter(a => a !== null) : [],
    }));

    res.json({
      issues,
      intent,
      explanation: intent.explanation,
      count: issues.length,
    });
  } catch (error) {
    console.error('Query processing failed:', error.message);
    res.status(500).json({ error: 'Failed to process query', details: error.message });
  } finally {
    await session.close();
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});