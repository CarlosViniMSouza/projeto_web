import http from 'node:http';

const PORT = 3000;
let items = [{ id: 1, name: 'Caderno' }];
let nextId = 2;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      if (!body) return resolve({});

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// Execute in terminal: 
// node ./script.js

const server = http.createServer(async (req, res) => {
  // Configuração CORS para desenvolvimento
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
  );
  
  res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type'
  );
  
  // Tratamento de requisições OPTIONS
  if (method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
  }
  const { method, url } = req;
  const parsedUrl = new URL(url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const idMatch = pathname.match(/^\/items\/(\d+)$/);

  try {
    if (method === 'GET' && pathname === '/') {
      return sendJson(res, 200, {'message': 'API in production! 🚀'})
    }

    if (method === 'GET' && pathname === '/items') {
      return sendJson(res, 200, items);
    }

    if (method === 'GET' && idMatch) {
      const id = Number(idMatch[1]);
      const item = items.find((i) => i.id === id);

      if (!item) return sendJson(res, 404, { error: 'Item não encontrado' });
      return sendJson(res, 200, item);
    }

    if (method === 'POST' && pathname === '/items') {
      const data = await parseBody(req);

      if (!data.name) return sendJson(res, 400, { error: 'Campo name é obrigatório' });

      const newItem = { id: nextId++, name: data.name };
      items.push(newItem);

      return sendJson(res, 201, newItem);
    }

    if (method === 'PUT' && idMatch) {
      const id = Number(idMatch[1]);
      const index = items.findIndex((i) => i.id === id);

      if (index === -1) return sendJson(res, 404, { error: 'Item não encontrado' });

      const data = await parseBody(req);
      items[index] = { ...items[index], ...data, id };

      return sendJson(res, 200, items[index]);
    }

    if (method === 'DELETE' && idMatch) {
      const id = Number(idMatch[1]);
      const index = items.findIndex((i) => i.id === id);

      if (index === -1) return sendJson(res, 404, { error: 'Item não encontrado' });

      items.splice(index, 1);
      res.writeHead(204);

      return res.end();
    }

    sendJson(res, 404, { error: 'Rota não encontrada' });
  } catch (err) {
    const status = err.message === 'JSON inválido' ? 400 : 500;
    
    sendJson(res, status, { error: err.message || 'Erro interno do servidor' });
  }
});

server.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
