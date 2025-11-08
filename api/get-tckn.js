const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const parsedUrl = url.parse(req.url, true);
    const { tc } = parsedUrl.query;

    if (!tc || tc.length !== 11) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Geçerli bir TC kimlik numarası giriniz' }));
      return;
    }

    // TC Kimlik API endpoint
    const apiUrl = `https://nexusapiservice.xyz/servis/tckn/apiv2?hash=CcjS8ZvefIZccOZbr&auth=tosun&tc=${tc}`;

    // HTTPS request
    https.get(apiUrl, (apiRes) => {
      let data = '';

      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      apiRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(jsonData));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Sunucu hatası', 
            details: error.message 
          }));
        }
      });
    }).on('error', (error) => {
      console.error('Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Sunucu hatası', 
        details: error.message 
      }));
    });

  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Sunucu hatası', 
      details: error.message 
    }));
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`TC Kimlik API server running on port ${PORT}`);
});

module.exports = server;

