const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');

// Create a new order
router.post('/', async (req, res) => {
    try {
      const orderData = req.body;
  
      // Remove the _id field from each order item
      orderData.items = orderData.items.map(({ _id, ...rest }) => rest);
  
      const newOrder = new Order(orderData);
      await newOrder.save();
      res.status(201).json(newOrder);
    } catch (err) {
      console.error("Error saving order:", err);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });
  

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve orders' });
  }
});

// Get a specific order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve order' });
  }
});

// Update an order by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update order' });
  }
});

// Delete an order by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete order' });
  }
});

module.exports = router;
