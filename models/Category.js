const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  _id: {
    type: Number, // Sequential numeric ID
    required: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  
},
{ timestamps: true }
);

// Check if the model already exists to prevent overwriting it
const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);

module.exports = Category;
