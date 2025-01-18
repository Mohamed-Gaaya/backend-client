const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require("path");

const app = express();
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // For parsing JSON bodies

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/yoda', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));



const categoryRoute = require('./routes/admin/CategoryRoute'); // Adjust the path if necessary
const productRoute = require('./routes/admin/ProductRoute');
const brandRoute = require('./routes/admin/BrandRoute');
const clothesRoute = require('./routes/admin/ClothesRoute');
const accessoriesRoute = require('./routes/admin/AccessoriesRoute');

app.use("/api/categories", categoryRoute);
app.use("/api/products", productRoute);
app.use("/api/clothes", clothesRoute);
app.use("/api/accessories", accessoriesRoute);
app.use("/api/brands", brandRoute);
app.use("/uploads", express.static("uploads"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));




// Server Listen
const PORT = 5000 ;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
