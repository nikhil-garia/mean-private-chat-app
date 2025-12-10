const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../utils/auth');

// =========== MEDIASOUP ROUTES =============

// Get router RTP capabilities
router.get('/router-rtp-capabilities/:roomId', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId } = req.params;
    const mediasoupService = req.app.get('mediasoupService');
    const router = await mediasoupService.getOrCreateRouter(roomId);
    const rtpCapabilities = router.rtpCapabilities;
    res.json({ rtpCapabilities });
  } catch (error) {
    console.error('Error getting router RTP capabilities:', error);
    res.status(500).json({ error: 'Failed to get router capabilities' });
  }
});

// Create WebRTC transport
router.post('/create-transport', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, direction } = req.body; // direction: 'send' or 'recv'
    const mediasoupService = req.app.get('mediasoupService');
    const transport = await mediasoupService.createTransport(roomId, direction);
    
    res.json({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters
    });
  } catch (error) {
    console.error('Error creating transport:', error);
    res.status(500).json({ error: 'Failed to create transport' });
  }
});

// Connect transport
router.post('/connect-transport', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, transportId, dtlsParameters } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    await mediasoupService.connectTransport(roomId, transportId, dtlsParameters);
    res.json({ success: true });
  } catch (error) {
    console.error('Error connecting transport:', error);
    res.status(500).json({ error: 'Failed to connect transport' });
  }
});

// Create producer
router.post('/create-producer', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, transportId, kind, rtpParameters, userId } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    const producer = await mediasoupService.createProducer(roomId, transportId, kind, rtpParameters, userId);
    
    res.json({
      id: producer.id,
      type: producer.type,
      rtpParameters: producer.rtpParameters
    });
  } catch (error) {
    console.error('Error creating producer:', error);
    res.status(500).json({ error: 'Failed to create producer' });
  }
});

// Create consumer
router.post('/create-consumer', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, transportId, producerId, rtpCapabilities, userId } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    const consumer = await mediasoupService.createConsumer(roomId, transportId, producerId, rtpCapabilities);
    
    // Update consumer with userId for tracking
    const room = mediasoupService.rooms.get(roomId);
    if (room && room.consumers.has(consumer.id)) {
      room.consumers.get(consumer.id).userId = userId;
    }
    
    res.json({
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      producerPaused: consumer.producerPaused
    });
  } catch (error) {
    console.error('Error creating consumer:', error);
    res.status(500).json({ error: 'Failed to create consumer' });
  }
});

// Pause producer
router.post('/pause-producer', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, producerId } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    await mediasoupService.pauseProducer(roomId, producerId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error pausing producer:', error);
    res.status(500).json({ error: 'Failed to pause producer' });
  }
});

// Resume producer
router.post('/resume-producer', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, producerId } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    await mediasoupService.resumeProducer(roomId, producerId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error resuming producer:', error);
    res.status(500).json({ error: 'Failed to resume producer' });
  }
});

// Pause consumer
router.post('/pause-consumer', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, consumerId } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    await mediasoupService.pauseConsumer(roomId, consumerId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error pausing consumer:', error);
    res.status(500).json({ error: 'Failed to pause consumer' });
  }
});

// Resume consumer
router.post('/resume-consumer', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, consumerId } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    await mediasoupService.resumeConsumer(roomId, consumerId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error resuming consumer:', error);
    res.status(500).json({ error: 'Failed to resume consumer' });
  }
});

// Close transport
router.post('/close-transport', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, transportId } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    await mediasoupService.closeTransport(roomId, transportId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error closing transport:', error);
    res.status(500).json({ error: 'Failed to close transport' });
  }
});

// Close producer
router.post('/close-producer', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, producerId } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    await mediasoupService.closeProducer(roomId, producerId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error closing producer:', error);
    res.status(500).json({ error: 'Failed to close producer' });
  }
});

// Close consumer
router.post('/close-consumer', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, consumerId } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    await mediasoupService.closeConsumer(roomId, consumerId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error closing consumer:', error);
    res.status(500).json({ error: 'Failed to close consumer' });
  }
});

// Get room producers
router.get('/room-producers/:roomId', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId } = req.params;
    const mediasoupService = req.app.get('mediasoupService');
    const producers = await mediasoupService.getRoomProducers(roomId);
    res.json({ producers });
  } catch (error) {
    console.error('Error getting room producers:', error);
    res.status(500).json({ error: 'Failed to get room producers' });
  }
});

// Get room stats
router.get('/room-stats/:roomId', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId } = req.params;
    const mediasoupService = req.app.get('mediasoupService');
    const stats = await mediasoupService.getRoomStats(roomId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting room stats:', error);
    res.status(500).json({ error: 'Failed to get room stats' });
  }
});

// Leave room (cleanup user resources)
router.post('/leave-room', ensureAuthenticated, async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    const mediasoupService = req.app.get('mediasoupService');
    await mediasoupService.removeUserFromRoom(roomId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

// Get all active rooms (for debugging/admin)
router.get('/active-rooms', ensureAuthenticated, async (req, res) => {
  try {
    const mediasoupService = req.app.get('mediasoupService');
    const rooms = [];
    
    for (const [roomId, room] of mediasoupService.rooms) {
      rooms.push({
        roomId,
        peers: room.peers.size,
        transports: room.transports.size,
        producers: room.producers.size,
        consumers: room.consumers.size,
      });
    }
    
    res.json({ rooms });
  } catch (error) {
    console.error('Error getting active rooms:', error);
    res.status(500).json({ error: 'Failed to get active rooms' });
  }
});

module.exports = router; 