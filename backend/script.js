import http from 'node:http';
import sqlite3 from 'sqlite3';

const PORT = 3000;

// BANCO SQLITE
const db = new sqlite3.Database('./sqlite.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
        return;
    }

    console.log('SQLite conectado');

    db.run(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            delivered BOOLEAN DEFAULT FALSE
        )
    `);
});

// FUNÇÕES DO SQLITE
function getAllItems() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM items', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getItemById(id) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM items WHERE id = ?',
            [id],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

function createItem(name, delivered) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO items(name, delivered) VALUES(?, ?)',
            [name, delivered],
            function (err) {
                if (err) reject(err);
                else resolve({
                    id: this.lastID,
                    name,
                    delivered
                });
            }
        );
    });
}

function updateItem(id, name, delivered) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE items SET name = ?, delivered = ? WHERE id = ?',
            [name, delivered, id],
            function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

function deleteItem(id) {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM items WHERE id = ?',
            [id],
            function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

// UTILITÁRIOS COMUNICAÇÃO HTTP
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', chunk => {
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
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8'
    });

    res.end(JSON.stringify(data));
}

// Conversor INT -> BOOL
function normalizeItem(item) {
    return {
        ...item,
        delivered: Boolean(item.delivered)
    };
}

// ROTAS API
const server = http.createServer(async (req, res) => {
    const { method, url } = req;

    res.setHeader(
        'Access-Control-Allow-Origin', '*'
    );

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type'
    );

    if (method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const parsedUrl = new URL(
        url,
        `http://localhost:${PORT}`
    );

    const pathname = parsedUrl.pathname;
    const idMatch = pathname.match(/^\/items\/(\d+)$/);

    try {
        if (method === 'GET' && pathname === '/') {
            return sendJson(res, 200, {
                message: 'API + SQLite in Prod! 🚀'
            });
        }

        if (method === 'GET' && pathname === '/items') {
            const items = await getAllItems();
            return sendJson(res, 200, items);
        }

        if (method === 'GET' && idMatch) {

            const id = Number(idMatch[1]);

            const item = await getItemById(id);

            if (!item) {
                return sendJson(res, 404, {
                    error: 'Item não encontrado'
                });
            }

            return sendJson(res, 200, normalizeItem(item));
        }

        if (method === 'POST' && pathname === '/items') {

            const data = await parseBody(req);

            if (!data.name) {
                return sendJson(res, 400, {
                    error: 'Campo name é obrigatório'
                });
            }

            if (typeof data.delivered !== 'boolean') {
                return sendJson(res, 400, {
                    error: 'Campo delivered deve ser boolean'
                });
            }

            const item = await createItem(data.name, data.delivered);

            return sendJson(res, 201, item);
        }

        if (method === 'PUT' && idMatch) {

            const id = Number(idMatch[1]);
            const data = await parseBody(req);

            if (!data.name) {
                return sendJson(res, 400, {
                    error: 'Campo nome é obrigatório'
                });
            }

            if (typeof data.delivered !== 'boolean') {
                return sendJson(res, 400, {
                    error: 'Campo delivered deve ser boolean'
                });
            }

            const updated = await updateItem(id, data.name, data.delivered);

            if (!updated) {
                return sendJson(res, 404, {
                    error: 'Item não encontrado'
                });
            }

            const item = await getItemById(id);

            return sendJson(res, 200, item);
        }

        if (method === 'DELETE' && idMatch) {

            const id = Number(idMatch[1]);

            const deleted = await deleteItem(id);

            if (!deleted) {
                return sendJson(res, 404, {
                    error: 'Item não encontrado'
                });
            }

            res.writeHead(204);
            return res.end();
        }

        sendJson(res, 404, {
            error: 'Rota não encontrada'
        });

    } catch (err) {

        const statusCode =
            err.message === 'JSON inválido'
                ? 400
                : 500;

        sendJson(res, statusCode, {
            error:
                err.message ||
                'Erro interno do servidor'
        });
    }
});

server.listen(PORT, () => {
    console.log(
        `API rodando em http://localhost:${PORT} 🚀`
    );
});