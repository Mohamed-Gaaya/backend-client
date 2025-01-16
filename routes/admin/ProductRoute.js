const express = require("express");
const router = express.Router();
const Product = require("../../models/Product");
const Counter = require("../../models/Counter");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");  // Save files to the uploads directory on the server
  },
  filename: (req, file, cb) => {
    // Generate a filename using the current timestamp and the original file name
    cb(null, Date.now() + "-" + file.originalname); 
  },
});


// File filter to allow only image types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Only JPEG, PNG, GIF, and WEBP are allowed."), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Ensure the 'product' counter exists, and if not, create it
const initCounter = async () => {
  const existingCounter = await Counter.findOne({ name: 'product' });

  // If no counter exists, initialize it with the proper values
  if (!existingCounter) {
    await Counter.create({
      name: 'product',        // Set the counter name
      value: 0,             // Set the initial value to 0
      entity: 'product'       // Explicitly set the entity field
    });
  }
};

// Define the getNextSequence function to increment the counter for each new product
const getNextSequence = async (sequenceName) => {
  if (!sequenceName) {
    throw new Error("Sequence name is required");
  }

  try {
    let counter = await Counter.findOne({ name: sequenceName });
    if (!counter) {
      console.log("Counter not found. Initializing...");
      await initCounter();
      counter = await Counter.findOne({ name: sequenceName });
    }

    if (counter.deletedIds.length > 0) {
      const reusedId = counter.deletedIds.shift();
      await counter.save();
      return reusedId;
    }

    const newId = counter.value + 1;
    counter.value = newId;
    await counter.save();
    return newId;
  } catch (err) {
    console.error("Error in getNextSequence:", err.message);
    throw new Error("Failed to retrieve next sequence ID");
  }
};

// @route   POST /api/products/add
// @desc    Add a new product
router.post("/add", upload.array("image", 5), async (req, res) => {
  try {
    const { 
      name, 
      price, 
      category, 
      brand, 
      hasPromo, 
      servings, 
      description,
      promoPrice, // New field
      originalPrice, // New field
    } = req.body;

    if (!name || !price || !category || !description|| !originalPrice) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    await initCounter();
    const nextId = await getNextSequence("product");

    const newProduct = new Product({
      _id: nextId,
      name,
      price: Number(price),
      category,
      brand,
      hasPromo: hasPromo === 'true',
      promoPrice: hasPromo === "true" ? Number(promoPrice) : null, // Include promo price if hasPromo is true
      originalPrice: Number(originalPrice),
      servings: Number(servings),
      description,
      images,
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added successfully", product: newProduct });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});
// Add this route to your existing product routes file
// @route   GET /api/products/:id
// @desc    Get a single product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({ product });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: "Failed to fetch product", details: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const {
      category,
      brand,
      hasPromo,
      minPrice,
      maxPrice,
      sortBy = "name",
      sortOrder = "asc",
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (hasPromo !== undefined) filter.hasPromo = hasPromo === 'true';
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    // Calculate skip value for pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    // Execute query with pagination
    const products = await Product
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ 
      error: "Failed to fetch products", 
      details: err.message 
    });
  }
});
// @route   GET /api/brands
// @desc    Get all brands
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ products });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products", details: err.message });
  }
});

// Rest of the routes remain unchanged...
// @route   PUT /api/products/:id
router.put("/:id", upload.array("image", 5), async (req, res) => {
  const { name, description, price, category } = req.body;
  const newImages = req.files ? req.files.map((file) => `/uploads/${file.filename}`) : [];

  try {
    const existingProduct = await Product.findById(req.params.id);
if (!existingProduct) {
  return res.status(404).json({ error: "Product not found" });
}

    const updateData = {
      name,
      description,
      price,
      category,
      ...(newImages.length && { images: newImages }),
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) return res.status(404).json({ error: "Product not found" });
    res.status(200).json({ message: "Product updated successfully", product: updatedProduct });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Failed to update product", details: err.message });
  }
});


// @route   DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    await Counter.findOneAndUpdate(
      { name: "product" },
      { $push: { deletedIds: deletedProduct._id } },
      { new: true }
    );

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ error: "Failed to delete product", details: err.message });
  }
});

module.exports = router;