const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  _id: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  images: {
    type: [String], // Array of image URLs or filenames
    required: true,
  },
  hasPromo: {
    type: Boolean,
    default: false,
  },
  originalPrice: {
    type: Number,
    min: 0,
    default: null, // Only needed if `hasPromo` is true
  },
  promoPrice: {
    type: Number,
    min: 0,
    default: null, // Only needed if `hasPromo` is true
  },
  servings: {
    type: Number,
    required: true,
    min: 1,
  },
  description: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Check if the model already exists to prevent overwriting it
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

module.exports = Product;