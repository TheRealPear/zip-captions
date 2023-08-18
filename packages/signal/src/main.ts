import { PeerServer } from 'peer';
import { Server } from 'socket.io';
import { generateRoomId, generateUserId } from './utils';


const socketPort = process.env.SOCKET_PORT ? Number(process.env.SOCKET_PORT) : 3000;
const peerPort = process.env.PEER_PORT ? Number(process.env.PEER_PORT) : 9000;
const allowedOrigin = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:4200';
const ioServer = new Server(socketPort, { cors: { origin: allowedOrigin}, transports: ['polling', 'websocket']});
const peerServer = PeerServer({ port: peerPort });

ioServer.on('connection', (socket) => {
  console.info(`client connected: ${socket.id}`);
  
  socket.on('join', (data?: { room: string, myBroadcast?: boolean }) => {    
    const room: string = data?.room || generateRoomId();
    console.info(`socket id ${socket['userId']} joined room: ${room} as ${data?.myBroadcast ? 'host' : 'listener'}`);
    socket['roomId'] = room;
    socket.join(room);
    if (data?.myBroadcast) {
      const clientIds = Array.from(ioServer.sockets.adapter.rooms.get(room));
      const clients: string[] = clientIds.filter((id) => id !== socket.id).map((id) => ioServer.sockets.sockets.get(id)).map((socket) => socket['userId'])
      socket.send({message: 'connect clients', clients });
    } else {
      socket.broadcast.to(room).emit('message', {user: socket['userId'], message: 'user joined room', room, isHost: data?.myBroadcast });
    }
    socket.send({user: socket['userId'], message: 'room joined', room })
  });

  socket.on('setId', (data?: {id?: string}) => {
    if (data?.id) {
      socket['userId'] = data.id;
      console.log(`user ID received: ${socket['userId']}`)
    } else {
      socket['userId'] = generateUserId();
      socket.send({message: 'set user id', id: socket['userId']});
      console.log(`user ID generated: ${socket['userId']}`)
    }
  })
  
  socket.on('message', (data) => {
    console.log('socket message', data);
    if (data.user && data.message && data.room) {
      ioServer.in(data.room).emit('new messsage', { user: data.user, message: data.message });
    } else {
      console.warn('uhandled message', data);
    }
  })
  
  socket.on('disconnect', () => {
    if (socket['roomId']) {
      socket.broadcast.to(socket['roomId']).emit('message', {user: socket['userId'], message: 'user left room', room: socket['roomId']})
    }
    console.info(`client disconnected: ${socket['userId']}`);
  })
  
  socket.on('endBroadcast', (data: {room: string}) => {
    console.log('endBroadcast', data.room)
    ioServer.in(data.room).emit('endBroadcast');
  })

});

peerServer.listen(() => {
  console.log('peer server running');
});