const express = require("express");
const router = express.Router();
const Product = require("../../models/Product");
const Counter = require("../../models/Counter");
const multer = require("multer");

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Only JPEG, PNG, GIF, WEBP, and AVIF are allowed."), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Ensure counter initialization
const initCounter = async () => {
  const existingCounter = await Counter.findOne({ name: "product" });
  if (!existingCounter) {
    await Counter.create({ name: "product", value: 0 });
  }
};

const getNextSequence = async (sequenceName) => {
  try {
    let counter = await Counter.findOne({ name: sequenceName });
    if (!counter) {
      await initCounter();
      counter = await Counter.findOne({ name: sequenceName });
    }

    const newId = counter.value + 1;
    counter.value = newId;
    await counter.save();
    return newId;
  } catch (err) {
    throw new Error("Failed to retrieve next sequence ID: " + err.message);
  }
};

// @route POST /api/products/add
router.post("/add", upload.array("image", 5), async (req, res) => {
  try {
    const {
      name,
      price,
      category,
      subCategory,
      brand,
      hasPromo,
      promoPrice,
      originalPrice,
      servings,
      shortDescription,
      longDescription,
      flavours,
      sizes,
      stock,
    } = req.body;

    if (!name || !price || !category || !brand || !shortDescription || !sizes || stock === undefined) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    // Parse and validate flavours and sizes
    const parsedFlavours = typeof flavours === "string" ? JSON.parse(flavours) : flavours;
    const parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;

    if (!Array.isArray(parsedFlavours) || parsedFlavours.length > 10) {
      return res.status(400).json({ error: "You can only add up to 10 flavours." });
    }
    if (!Array.isArray(parsedSizes) || parsedSizes.length > 5) {
      return res.status(400).json({ error: "You can only add up to 5 sizes." });
    }

    // Ensure prices are valid
    const parsedPrice = Number(price);
    const parsedPromoPrice = isNaN(Number(promoPrice)) ? null : Number(promoPrice);
    const parsedOriginalPrice = isNaN(Number(originalPrice)) ? null : Number(originalPrice);

    if (isNaN(parsedPrice)) {
      return res.status(400).json({ error: "Price must be a valid number." });
    }
    if (hasPromo === "true" && (parsedPromoPrice === null || parsedOriginalPrice === null)) {
      return res.status(400).json({ error: "Both promoPrice and originalPrice must be valid numbers if hasPromo is true." });
    }

    const images = req.files ? req.files.map((file) => `/uploads/${file.filename}`) : [];
    const nextId = await getNextSequence("product");

    const newProduct = new Product({
      _id: nextId,
      name,
      price: parsedPrice,
      category,
      subCategory: subCategory || null,
      brand,
      hasPromo: hasPromo === "true",
      promoPrice: parsedPromoPrice,
      originalPrice: parsedOriginalPrice,
      servings: servings ? Number(servings) : undefined,
      shortDescription,
      longDescription,
      flavours: parsedFlavours,
      sizes: parsedSizes,
      stock: Number(stock),
      images,
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added successfully", product: newProduct });
  } catch (err) {
    res.status(500).json({ error: "Failed to add product", details: err.message });
  }
});

// @route PUT /api/products/:id
router.put("/:id", upload.array("images", 5), async (req, res) => {
  try {
    const {
      name,
      price,
      category,
      subCategory,
      brand,
      hasPromo,
      promoPrice,
      originalPrice,
      servings,
      shortDescription,
      longDescription,
      flavours,
      sizes,
      stock,
    } = req.body;

    const updateData = {
      ...(name && { name }),
      ...(price && { price: Number(price) }),
      ...(category && { category }),
      ...(subCategory && { subCategory }),
      ...(brand && { brand }),
      ...(hasPromo === 'true' && { 
        hasPromo: true,
        promoPrice: Number(promoPrice),
        originalPrice: Number(originalPrice)
      }),
      ...(servings && { servings: Number(servings) }),
      ...(shortDescription && { shortDescription }),
      ...(longDescription && { longDescription }),
      ...(sizes && { sizes: typeof sizes === 'string' ? JSON.parse(sizes) : sizes }),
      ...(flavours && { flavours: typeof flavours === 'string' ? JSON.parse(flavours) : flavours }),
      ...(stock !== undefined && { stock: Number(stock) })
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({ message: "Product updated successfully", product: updatedProduct });

  } catch (err) {
    res.status(500).json({
      error: "Failed to update product",
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});
// @route DELETE /api/products/:id
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
    res.status(500).json({ error: "Failed to delete product", details: err.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get a single product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({ product });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: "Failed to fetch product", details: err.message });
  }
});

// @route   GET /api/products
// @desc    Get all products with optional filtering, sorting, and pagination
// @route   GET /api/products/:id
// @desc    Get a single product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({ product });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: "Failed to fetch product", details: err.message });
  }
});

// @route   GET /api/products
// @desc    Get all products with optional filtering, sorting, and pagination
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      brand,
      hasPromo,
      minPrice,
      maxPrice,
      flavours,
      sizes,
      sortBy = "name",
      sortOrder = "asc",
      page = 1,
      limit = 1000,
    } = req.query;

    // Build filter object
    const filter = {};
    
    // Add flexible text search across multiple fields
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (hasPromo !== undefined) filter.hasPromo = hasPromo === "true";
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }
    if (flavours) filter.flavours = { $in: flavours.split(",") };
    if (sizes) filter.size = { $in: sizes.split(",") };

    // Calculate skip value for pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Sort by uploadedDate in descending order
    const sort = { uploadedDate: -1 };

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    // Execute query with pagination
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .select(
        "_id name price category brand images hasPromo originalPrice promoPrice shortDescription stock flavours size uploadedDate"
      )
      .lean();

    res.status(200).json({
      products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products", details: err.message });
  }
});

module.exports = router;
