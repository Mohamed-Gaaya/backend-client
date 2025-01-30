const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Pack = require('../../models/Pack');
const Counter = require('../../models/Counter');
const Product = require('../../models/Product'); // Add Product model import

// Ensure counter initialization for packs
const initCounter = async () => {
  try {
    const existingCounter = await Counter.findOne({ name: 'pack' });
    if (!existingCounter) {
      await Counter.create({ name: 'pack', value: 0, deletedIds: [] });
    }
    return true;
  } catch (err) {
    console.error('Counter initialization failed:', err);
    throw err;
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
    throw new Error('Failed to retrieve next sequence ID: ' + err.message);
  }
};
// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pack-' + uniqueSuffix + path.extname(file.originalname));
  }
});
// Create the upload middleware instance
const upload = multer({ storage: storage });

// Utility function to handle and validate product IDs
const validateProducts = async (products) => {
  if (!Array.isArray(products)) {
    // If it's a string, try to parse it
    try {
      products = JSON.parse(products);
    } catch (err) {
      throw new Error('Invalid products format. Expected array of product IDs');
    }
  }
  
  // Convert all IDs to numbers and validate
  const productIds = products.map(id => {
    const numId = Number(id);
    if (isNaN(numId)) {
      throw new Error(`Invalid product ID format: ${id}`);
    }
    return numId;
  });

  // Verify products exist in database
  const existingProducts = await Product.find({ _id: { $in: productIds } });
  
  if (existingProducts.length !== productIds.length) {
    const foundIds = existingProducts.map(p => p._id);
    const missingIds = productIds.filter(id => !foundIds.includes(id));
    throw new Error(`Products not found: ${missingIds.join(', ')}`);
  }

  return productIds;
};

// @route POST /api/packs
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, products, totalValue } = req.body;

    // Enhanced validation
    if (!name || !price || !products || !totalValue) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'price', 'products', 'totalValue']
      });
    }

    // Validate and convert product IDs
    let validatedProducts;
    try {
      validatedProducts = await validateProducts(products);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const nextId = await getNextSequence('pack');

    const newPack = new Pack({
      _id: nextId,
      name,
      description: description || '',
      price: parseFloat(price),
      products: validatedProducts,
      totalValue: parseFloat(totalValue),
      image: req.file ? `/uploads/${req.file.filename}` : ''
    });

    await newPack.save();
    
    const populatedPack = await Pack.findById(newPack._id)
      .populate('products', 'name price promoPrice images');

    res.status(201).json({ 
      message: 'Pack added successfully', 
      pack: populatedPack 
    });
  } catch (err) {
    console.error('Pack creation error:', err);
    res.status(500).json({ 
      error: 'Failed to add pack', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});


router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, products, totalValue } = req.body;

    // Validate required fields
    if (!name || !price || !products || !totalValue) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'price', 'products', 'totalValue']
      });
    }

    // Validate and convert product IDs
    let validatedProducts;
    try {
      validatedProducts = await validateProducts(products);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const updateData = {
      name,
      description: description || '',
      price: parseFloat(price),
      products: validatedProducts,
      totalValue: parseFloat(totalValue)
    };

    // Only add image if a new one was uploaded
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedPack = await Pack.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('products', 'name price promoPrice images');

    if (!updatedPack) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    res.status(200).json({ 
      message: 'Pack updated successfully', 
      pack: updatedPack 
    });
  } catch (err) {
    console.error('Pack update error:', err);
    res.status(500).json({
      error: 'Failed to update pack',
      details: err.message
    });
  }
});

// @route GET /api/packs
router.get('/', async (req, res) => {
  try {
    const {
      search,
      minPrice,
      maxPrice,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};
    
    // Add text search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Price filtering
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {
        ...(minPrice && { $gte: Number(minPrice) }),
        ...(maxPrice && { $lte: Number(maxPrice) })
      };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    
    const total = await Pack.countDocuments(filter);

    const packs = await Pack.find(filter)
      .populate('products', 'name price promoPrice images')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      packs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to fetch packs', 
      details: err.message 
    });
  }
});

// @route GET /api/packs/:id
router.get('/:id', async (req, res) => {
  try {
    const pack = await Pack.findById(req.params.id)
      .populate('products', 'name price promoPrice images')
      .lean();

    if (!pack) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    res.status(200).json({ pack });
  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to fetch pack', 
      details: err.message 
    });
  }
});



// @route DELETE /api/packs/:id
router.delete('/:id', async (req, res) => {
  try {
    const deletedPack = await Pack.findByIdAndDelete(req.params.id);

    if (!deletedPack) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    await Counter.findOneAndUpdate(
      { name: 'pack' },
      { $push: { deletedIds: deletedPack._id } },
      { new: true }
    );

    res.status(200).json({ message: 'Pack deleted successfully' });
  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to delete pack', 
      details: err.message 
    });
  }
});

module.exports = router;