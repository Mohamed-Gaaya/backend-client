const mongoose = require('mongoose');

const packSchema = new mongoose.Schema({
  _id: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Pack name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Pack price is required'],
    min: [0, 'Price cannot be negative']
  },
  image: {
    type: String,  // Store the image path
    default: ''
  },
  products: [{
    type: Number,
    ref: 'Product',
    required: [true, 'At least one product is required']
  }],
  totalValue: {
    type: Number,
    required: [true, 'Total value is required'],
    min: [0, 'Total value cannot be negative']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
packSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Pack', packSchema);