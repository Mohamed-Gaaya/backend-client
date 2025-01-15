const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
      default: 0,
    },
    deletedIds: {
      type: [Number], // An array of deleted category IDs
      default: [],
    },
  });
  
  const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);
  
  module.exports = Counter;
  