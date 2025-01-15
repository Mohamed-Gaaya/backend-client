const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
  _id: {
    type: Number, // Sequential numeric ID
    required: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  logo: {
    type: String, // File path or URL to the logo image
  },
});

// Check if the model already exists to prevent overwriting it
const Brand = mongoose.models.Brand || mongoose.model("Brand", brandSchema);

module.exports = Brand;
