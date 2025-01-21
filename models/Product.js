const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  _id: {
    type: Number,
    required: true,
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
    type: [String],
    required: true,
  },
  hasPromo: {
    type: Boolean,
    default: false,
  },
  originalPrice: {
    type: Number,
    min: 0,
    default: null,
  },
  promoPrice: {
    type: Number,
    min: 0,
    default: null,
  },
  servings: {
    type: Number,
    min: 1,
  },
  shortDescription: {
    type: String,
    required: true,
  },
  longdescription: {
    type: String,
  },
  flavours: {
    type: [String],
    validate: {
      validator: function (v) {
        return v.length <= 10; // Ensure that no more than 10 flavours are added
      },
      message: "You can only add up to 10 flavours.",
    },
  },
  sizes: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return v.length <= 5; // Ensure that no more than 5 sizes are added
      },
      message: "You can only add up to 5 sizes.",
    },
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0, // Default value for stock is set to 0
  },
  uploadedDate: {
    type: Date,
    default: Date.now, // Automatically sets to the current date
  },
}, { timestamps: true });

// Check if the model already exists to prevent overwriting it
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

module.exports = Product;
