const mediasoup = require('mediasoup');

class MediasoupService {
  constructor() {
    this.workers = [];
    this.rooms = new Map(); // { roomId: { router, peers: Map, transports: Map, producers: Map, consumers: Map } }
    
    this.initWorkers();
  }

  async initWorkers() {
    const numCPUs = require('os').cpus().length;
    const numWorkers = Math.max(1, Math.min(numCPUs, 4)); // Use 1-4 workers

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: 'warn',
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
        rtcMinPort: 10000,
        rtcMaxPort: 10100,
      });

      worker.on('died', () => {
        console.error('Mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
      console.log(`Mediasoup worker created [pid:${worker.pid}]`);
    }

    console.log(`Created ${this.workers.length} mediasoup workers`);
  }

  getWorker() {
    // Simple round-robin worker selection
    return this.workers[Math.floor(Math.random() * this.workers.length)];
  }

  async getOrCreateRouter(roomId) {
    if (!this.rooms.has(roomId)) {
      await this.createRoom(roomId);
    }
    return this.rooms.get(roomId).router;
  }

  async createRoom(roomId) {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    const worker = this.getWorker();
    const router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
          },
        },
      ],
    });

    const room = {
      router,
      peers: new Map(), // { userId: { transports: Map, producers: Map, consumers: Map } }
      transports: new Map(), // { transportId: transport }
      producers: new Map(), // { producerId: { producer, userId } }
      consumers: new Map(), // { consumerId: { consumer, userId } }
      audioLevelObserver: null,
    };

    // Create audio level observer for group calls
    room.audioLevelObserver = await router.createAudioLevelObserver({
      maxEntries: 1,
      threshold: -80,
      interval: 800,
    });

    this.rooms.set(roomId, room);
    console.log(`Created mediasoup room: ${roomId}`);
    return room;
  }

  async createTransport(roomId, direction, userId = null) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const transport = await room.router.createWebRtcTransport({
      listenIps: [
        {
          ip: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      maxIncomingBitrate: 1500000,
    });

    // Store transport in the room
    room.transports.set(transport.id, transport);

    // Add user to room if not already present
    if (userId && !room.peers.has(userId)) {
      room.peers.set(userId, {
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      });
    }

    // Add transport to user's transports if userId is provided
    if (userId && room.peers.has(userId)) {
      room.peers.get(userId).transports.set(transport.id, transport);
    }

    console.log(`Transport created: ${transport.id} (${direction}) in room ${roomId} for user ${userId}`);

    return transport;
  }

  async connectTransport(roomId, transportId, dtlsParameters) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const transport = room.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    await transport.connect({ dtlsParameters });
    console.log(`Transport connected: ${transportId} in room ${roomId}`);
  }

  async createProducer(roomId, transportId, kind, rtpParameters, userId = null) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const transport = room.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    const producer = await transport.produce({
      kind,
      rtpParameters,
    });

    // Store producer with userId for tracking
    room.producers.set(producer.id, {
      producer,
      transportId,
      kind,
      userId: userId
    });

    // Add user to room if not already present
    if (userId && !room.peers.has(userId)) {
      room.peers.set(userId, {
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      });
    }

    // Add producer to user's producers if userId is provided
    if (userId && room.peers.has(userId)) {
      room.peers.get(userId).producers.set(producer.id, producer);
    }

    console.log(`Producer created: ${producer.id} (${kind}) in room ${roomId} for user ${userId}`);
    console.log(`Total producers in room ${roomId}: ${room.producers.size}`);
    return producer;
  }

  async createConsumer(roomId, transportId, producerId, rtpCapabilities, userId = null) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const transport = room.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    const producerData = room.producers.get(producerId);
    if (!producerData) {
      console.error(`Producer not found: ${producerId}`);
      console.log(`Available producers in room ${roomId}:`, Array.from(room.producers.keys()));
      throw new Error(`Producer not found: ${producerId}`);
    }

    // Check if consumer can consume this producer
    const canConsume = room.router.canConsume({
      producerId: producerId,
      rtpCapabilities,
    });

    if (!canConsume) {
      throw new Error('Cannot consume this producer');
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    });

    // Store consumer with userId for tracking
    room.consumers.set(consumer.id, {
      consumer,
      transportId,
      producerId,
      userId: userId
    });

    // Add user to room if not already present
    if (userId && !room.peers.has(userId)) {
      room.peers.set(userId, {
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      });
    }

    // Add consumer to user's consumers if userId is provided
    if (userId && room.peers.has(userId)) {
      room.peers.get(userId).consumers.set(consumer.id, consumer);
    }

    console.log(`Consumer created: ${consumer.id} for producer ${producerId} in room ${roomId} for user ${userId}`);
    return consumer;
  }

  async pauseProducer(roomId, producerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const producerData = room.producers.get(producerId);
    if (!producerData) {
      throw new Error(`Producer not found: ${producerId}`);
    }

    await producerData.producer.pause();
    console.log(`Producer paused: ${producerId} in room ${roomId}`);
  }

  async resumeProducer(roomId, producerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const producerData = room.producers.get(producerId);
    if (!producerData) {
      throw new Error(`Producer not found: ${producerId}`);
    }

    await producerData.producer.resume();
    console.log(`Producer resumed: ${producerId} in room ${roomId}`);
  }

  async pauseConsumer(roomId, consumerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const consumerData = room.consumers.get(consumerId);
    if (!consumerData) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    await consumerData.consumer.pause();
    console.log(`Consumer paused: ${consumerId} in room ${roomId}`);
  }

  async resumeConsumer(roomId, consumerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const consumerData = room.consumers.get(consumerId);
    if (!consumerData) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    await consumerData.consumer.resume();
    console.log(`Consumer resumed: ${consumerId} in room ${roomId}`);
  }

  async closeProducer(roomId, producerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const producerData = room.producers.get(producerId);
    if (!producerData) {
      throw new Error(`Producer not found: ${producerId}`);
    }

    try {
      producerData.producer.close();
      room.producers.delete(producerId);
      
      // Remove producer from user's producers if userId exists
      if (producerData.userId && room.peers.has(producerData.userId)) {
        const userPeer = room.peers.get(producerData.userId);
        userPeer.producers.delete(producerId);
      }
      
      console.log(`Producer closed: ${producerId} in room ${roomId}`);
    } catch (error) {
      console.error(`Error closing producer ${producerId}:`, error);
      throw error;
    }
  }

  async closeConsumer(roomId, consumerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const consumerData = room.consumers.get(consumerId);
    if (!consumerData) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    try {
      consumerData.consumer.close();
      room.consumers.delete(consumerId);
      
      // Remove consumer from user's consumers if userId exists
      if (consumerData.userId && room.peers.has(consumerData.userId)) {
        const userPeer = room.peers.get(consumerData.userId);
        userPeer.consumers.delete(consumerId);
      }
      
      console.log(`Consumer closed: ${consumerId} in room ${roomId}`);
    } catch (error) {
      console.error(`Error closing consumer ${consumerId}:`, error);
      throw error;
    }
  }

  async closeTransport(roomId, transportId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const transport = room.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    transport.close();
    room.transports.delete(transportId);
    console.log(`Transport closed: ${transportId} in room ${roomId}`);
  }

  async removeUserFromRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return; // Room doesn't exist
    }

    const peer = room.peers.get(userId);
    if (!peer) {
      return; // User not in room
    }

    // Close all user's transports
    for (const [transportId, transport] of peer.transports) {
      transport.close();
      room.transports.delete(transportId);
    }

    // Close all user's producers
    for (const [producerId, producer] of peer.producers) {
      producer.close();
      room.producers.delete(producerId);
    }

    // Close all user's consumers
    for (const [consumerId, consumer] of peer.consumers) {
      consumer.close();
      room.consumers.delete(consumerId);
    }

    room.peers.delete(userId);
    console.log(`User removed from room: ${userId} in room ${roomId}`);

    // If room is empty, close it
    if (room.peers.size === 0) {
      room.router.close();
      this.rooms.delete(roomId);
      console.log(`Room closed: ${roomId}`);
    }
  }

  async getRoomProducers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }

    const producers = [];
    for (const [producerId, producerData] of room.producers) {
      producers.push({
        id: producerId,
        kind: producerData.kind,
        userId: producerData.userId,
      });
    }

    return producers;
  }

  async getRoomStats(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const stats = {
      roomId,
      peers: room.peers.size,
      transports: room.transports.size,
      producers: room.producers.size,
      consumers: room.consumers.size,
    };

    return stats;
  }

  // Helper method to add transport to room
  addTransportToRoom(roomId, transportId, transport) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.transports.set(transportId, transport);
    }
  }

  // Helper method to add user to room
  addUserToRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (room && !room.peers.has(userId)) {
      room.peers.set(userId, {
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      });
    }
  }
}

module.exports = MediasoupService; 