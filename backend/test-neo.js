require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function testConnection() {
  const session = driver.session();
  try {
    const result = await session.run('RETURN "Connected to Neo4j!" AS message');
    console.log('yes', result.records[0].get('message'));
  } catch (error) {
    console.error(' Connection failed:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

testConnection();