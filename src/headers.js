export default {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development'
    ? 'http://localhost:1234' : 'https://productcube.io',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, session-token'
}
