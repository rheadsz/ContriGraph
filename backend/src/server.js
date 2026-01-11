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

// Add this after the /health route
app.get('/api/issues', async (req, res) => {
  const session = neo4jDriver.session();
  try {
    const result = await session.executeRead(tx =>
      tx.run(`
        MATCH (i:Issue)-[:RELATES_TO]->(f:File)
        RETURN i.id AS id, i.title AS title, i.url AS url, f.path AS filePath
        ORDER BY i.id DESC
        LIMIT 20
      `)
    );

    const issues = result.records.map(record => ({
      id: record.get('id'),
      title: record.get('title'),
      url: record.get('url'),
      filePath: record.get('filePath'),
    }));

    res.json({ issues });
  } catch (error) {
    console.error('Neo4j query failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch issues' });
  } finally {
    await session.close();
  }
});


// Start server
app.listen(PORT, () => {
  console.log("Backend server running on http://localhost:${PORT}");
});