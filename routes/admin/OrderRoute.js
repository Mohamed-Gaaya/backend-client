const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const Counter = require('../../models/Counter');
const WebSocket = require('ws');

// Initialize WebSocket server on a different port (e.g. 5001)
const wss = new WebSocket.Server({ port: 5001 });
const connectedClients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
  connectedClients.add(ws);
  
  ws.on('close', () => {
    connectedClients.delete(ws);
  });

  // Send an initial message to verify connection
  ws.send(JSON.stringify({ type: 'connection', message: 'Connected to order notification system' }));
});

// Broadcast notification to all connected clients
const broadcastNotification = (notification) => {
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(notification));
    }
  });
};

// Function to get the next sequence number for orders
const getNextSequence = async (sequenceName) => {
  let counter = await Counter.findOne({ name: sequenceName });
  if (!counter) {
    counter = await Counter.create({ name: sequenceName, value: 0, deletedIds: [] });
  }
  counter.value += 1;
  await counter.save();
  return counter.value;
};

// Create a new order
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Remove the _id field from each order item (if present)
    orderData.items = orderData.items.map(({ _id, ...rest }) => rest);

    // Get the next order ID from the counter and set it on the order
    const nextId = await getNextSequence('order');
    orderData._id = nextId;

    // The order schema already defines a default status of 'pending'
    const newOrder = new Order(orderData);
    await newOrder.save();

    // Send notification for new order
    broadcastNotification({
      type: 'newOrder',
      order: {
        _id: newOrder._id,
        customerDetails: newOrder.customerDetails,
        total: newOrder.total,
        status: newOrder.status,
        createdAt: newOrder.createdAt
      },
      message: `New order #${newOrder._id} received from ${newOrder.customerDetails.firstName} ${newOrder.customerDetails.lastName}`
    });

    res.status(201).json(newOrder);
  } catch (err) {
    console.error("Error saving order:", err);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve orders' });
  }
});

// Get a specific order by ID (converting the ID to a Number)
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await Order.findOne({ _id: id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve order' });
  }
});

// Update an order by ID (with type conversion)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updatedOrder = await Order.findOneAndUpdate({ _id: id }, req.body, { new: true });
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If the status is updated, broadcast a notification
    if (req.body.status) {
      broadcastNotification({
        type: 'orderUpdate',
        order: {
          _id: updatedOrder._id,
          status: updatedOrder.status,
          customerDetails: updatedOrder.customerDetails
        },
        message: `Order #${updatedOrder._id} status updated to ${updatedOrder.status}`
      });
    }

    res.status(200).json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update order' });
  }
});

// Delete an order by ID (with type conversion)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deletedOrder = await Order.findOneAndDelete({ _id: id });
    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Broadcast notification for deletion
    broadcastNotification({
      type: 'orderDelete',
      orderId: req.params.id,
      message: `Order #${req.params.id} has been deleted`
    });

    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete order' });
  }
});

// WebSocket error handling
wss.on('error', (error) => {
  console.error('WebSocket Server Error:', error);
});

module.exports = router;
