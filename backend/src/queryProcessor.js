// backend/src/queryProcessor.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

/**
 * Extract user intent from natural language query using Qwen AI
 */
async function extractIntent(userQuery) {
  const prompt = `You are an AI assistant helping developers find GitHub issues. Analyze this query and extract structured information.

User query: "${userQuery}"

Extract the following and respond ONLY with valid JSON:
{
  "difficulty": "beginner" | "intermediate" | "advanced" | "any",
  "area": "frontend" | "backend" | "docs" | "testing" | "api" | "any",
  "type": "bug" | "feature" | "enhancement" | "documentation" | "any",
  "keywords": ["keyword1", "keyword2"],
  "explanation": "Brief explanation of what the user wants"
}

Examples:
- "What's a good issue for a beginner?" → {"difficulty": "beginner", "area": "any", "type": "any", "keywords": [], "explanation": "User wants beginner-friendly issues"}
- "Show me frontend bugs" → {"difficulty": "any", "area": "frontend", "type": "bug", "keywords": ["frontend", "ui"], "explanation": "User wants frontend bug issues"}
- "I want to work on API documentation" → {"difficulty": "any", "area": "backend", "type": "documentation", "keywords": ["api", "docs"], "explanation": "User wants API documentation issues"}

Now analyze the user query above and respond with JSON only:`;

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'qwen2:7b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
      }
    });

    let rawResponse = response.data.response.trim();
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawResponse = jsonMatch[0];
    }

    const intent = JSON.parse(rawResponse);
    console.log('Extracted intent:', intent);
    return intent;
  } catch (error) {
    console.error('Failed to extract intent:', error.message);
    // Return default intent on error
    return {
      difficulty: 'any',
      area: 'any',
      type: 'any',
      keywords: [],
      explanation: 'Showing all available issues'
    };
  }
}

/**
 * Build Cypher query based on extracted intent
 */
function buildCypherQuery(repo, intent) {
  let conditions = ['i.repo = $repo'];
  let params = { repo };

  // Difficulty filter
  if (intent.difficulty === 'beginner') {
    conditions.push(`(
      EXISTS((i)-[:HAS_LABEL]->(:Label {name: 'good-first-issue'})) OR
      i.comments < 5
    )`);
  } else if (intent.difficulty === 'intermediate') {
    conditions.push('i.comments >= 5 AND i.comments < 15');
  } else if (intent.difficulty === 'advanced') {
    conditions.push('i.comments >= 15');
  }

  // Area filter
  if (intent.area === 'frontend') {
    conditions.push(`(
      f.path CONTAINS 'ui' OR 
      f.path CONTAINS 'component' OR 
      f.path CONTAINS 'frontend' OR
      f.path CONTAINS 'client' OR
      f.path CONTAINS 'view'
    )`);
  } else if (intent.area === 'backend') {
    conditions.push(`(
      f.path CONTAINS 'api' OR 
      f.path CONTAINS 'server' OR 
      f.path CONTAINS 'backend' OR
      f.path CONTAINS 'service' OR
      f.path CONTAINS 'controller'
    )`);
  } else if (intent.area === 'docs') {
    conditions.push(`(
      f.path CONTAINS 'doc' OR 
      f.path CONTAINS 'readme' OR
      f.path CONTAINS 'guide'
    )`);
  } else if (intent.area === 'testing') {
    conditions.push(`(
      f.path CONTAINS 'test' OR 
      f.path CONTAINS 'spec'
    )`);
  }

  // Type filter via labels
  if (intent.type !== 'any') {
    conditions.push(`EXISTS((i)-[:HAS_LABEL]->(:Label {name: $type}))`);
    params.type = intent.type;
  }

  // Keyword search in title
  if (intent.keywords && intent.keywords.length > 0) {
    const keywordConditions = intent.keywords.map((_, idx) => {
      params[`keyword${idx}`] = intent.keywords[idx].toLowerCase();
      return `toLower(i.title) CONTAINS $keyword${idx}`;
    });
    conditions.push(`(${keywordConditions.join(' OR ')})`);
  }

  const cypher = `
    MATCH (i:Issue)-[:RELATES_TO]->(f:File)
    OPTIONAL MATCH (i)-[:ASSIGNED_TO]->(u:User)
    WHERE ${conditions.join(' AND ')}
    WITH i, f, collect(u.username) AS assignees
    RETURN i.id AS id, i.title AS title, i.url AS url, f.path AS filePath, 
           i.comments AS comments, i.isAvailable AS isAvailable, assignees
    ORDER BY i.comments ASC
    LIMIT 10
  `;

  return { cypher, params };
}

module.exports = {
  extractIntent,
  buildCypherQuery
};
