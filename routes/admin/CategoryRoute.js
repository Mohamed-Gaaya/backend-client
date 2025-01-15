const express = require("express");
const Category = require("../../models/Category");
const Counter = require("../../models/Counter");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// Set up storage engine for multer (optional if you want to handle images)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/"); // Save files in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Unique filenames
  },
});

// Initialize multer
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5MB
});

// Ensure the 'category' counter exists, and if not, create it
const initCounter = async () => {
  const existingCounter = await Counter.findOne({ name: 'category' });

  if (!existingCounter) {
    await Counter.create({
      name: 'category',        // Set the counter name
      value: 0,                // Set the initial value to 0
      entity: 'category'       // Explicitly set the entity field
    });
  }
};

// Define the getNextSequence function to increment the counter for each new category
const getNextSequence = async (sequenceName) => {
  if (!sequenceName) {
    throw new Error("Sequence name is required");
  }

  try {
    let counter = await Counter.findOne({ name: sequenceName });
    if (!counter) {
      // Initialize the counter if not found
      console.log("Counter not found. Initializing...");
      await initCounter();  // Initialize the counter
      counter = await Counter.findOne({ name: sequenceName }); // Retrieve it again after initialization
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

// @route   POST /api/categories/add
// @desc    Add a new category
router.post("/add", upload.single("image"), async (req, res) => {
  const { name } = req.body;
  const image = req.file ? req.file.path : null;

  if (!name || name.trim() === "") {
    return res.status(400).json({ message: "Category name is required" });
  }

  try {
    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Ensure the 'category' counter exists and initialize if needed
    await initCounter();

    // Get the next sequential ID for the category
    const nextId = await getNextSequence("category");

    // Create and save the new category
    const category = new Category({ _id: nextId, name, image });
    await category.save();

    res.status(201).json({ message: "Category added successfully", category });
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// @route   GET /api/categories
// @desc    Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ categories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Failed to fetch categories", error: err.message });
  }
});

// @route   GET /api/categories/:id
// @desc    Get a single category by ID
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.status(200).json({ category });
  } catch (err) {
    console.error("Error fetching category:", err);
    res.status(500).json({ message: "Failed to fetch category", error: err.message });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update a category
router.put("/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const image = req.file ? req.file.path : undefined;

  if (!name || name.trim() === "") {
    return res.status(400).json({ message: "Category name is required" });
  }

  try {
    // Check if another category with the same name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory && existingCategory._id.toString() !== id) {
      return res.status(400).json({ message: "Category name already exists" });
    }

    // Update the category
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, ...(image && { image }) },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category updated successfully", category: updatedCategory });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ message: "Failed to update category", error: err.message });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete a category
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Find and delete the category
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Add the deleted category's ID to the deletedIds list in the counter
    await Counter.findOneAndUpdate(
      { name: "category" },
      { $push: { deletedIds: id } },
      { new: true }
    );

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ message: "Failed to delete category", error: err.message });
  }
});

module.exports = router;
