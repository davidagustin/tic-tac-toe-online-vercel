const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server);

  io.on('connection', (socket) => {
    console.log('made socket connection', socket.id);

    // Handle chat event
    socket.on('chat room', function(data) {
      console.log('this is data', data);
      io.sockets.emit('chat room', data);
    });

    socket.on('game board', function(data) {
      console.log('game board fires', data);
      io.sockets.emit('game board', data);
    });

    socket.on('reset board', () => {
      console.log('reset board fires');
      io.sockets.emit('reset board');
    });

    socket.on('console', function(data) {
      console.log('console fires', data);
      io.sockets.emit('console', data);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 