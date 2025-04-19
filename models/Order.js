const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  flavour: { type: String },
  size: { type: String },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  image: { type: String }
}, { _id: false }); // Disables individual _id for subdocuments

const orderSchema = new mongoose.Schema({
  // Use Number for the _id (set via the counter)
  _id: { type: Number },
  items: [orderItemSchema],
  customerDetails: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    postalCode: { type: String, required: true },
    governorate: { type: String, required: true },
    city: { type: String, required: true }
  },
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, required: true },
  total: { type: Number, required: true },
  // The status field is added to enable order adjustments (default is 'pending')
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
