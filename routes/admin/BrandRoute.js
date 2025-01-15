const express = require("express");
const router = express.Router();
const Brand = require("../../models/Brand");
const Counter = require("../../models/Counter");
const multer = require("multer");
const path = require("path");

// Set up storage engine for multer
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

// Ensure the 'brand' counter exists, and if not, create it
const initCounter = async () => {
  const existingCounter = await Counter.findOne({ name: 'brand' });

  // If no counter exists, initialize it with the proper values
  if (!existingCounter) {
    await Counter.create({
      name: 'brand',        // Set the counter name
      value: 0,             // Set the initial value to 0
      entity: 'brand'       // Explicitly set the entity field
    });
  }
};



// Define the getNextSequence function to increment the counter for each new brand
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



// @route   POST /api/brands/add
// @desc    Add a new brand
// @route   POST /api/brands/add
// @desc    Add a new brand
router.post("/add", upload.single("image"), async (req, res) => {
  const { name, description, uploadedAt } = req.body; // Optionally allow overriding uploadedAt
  const logo = req.file ? req.file.filename : null;

  try {
    // Check if the brand already exists
    const existingBrand = await Brand.findOne({ name });
    if (existingBrand) {
      return res.status(400).json({ error: "Brand already exists" });
    }

    // Ensure the 'brand' counter exists and initialize if needed
    await initCounter();

    // Get the next sequential ID for the brand
    const nextId = await getNextSequence("brand");

    // Create a new brand
    const newBrand = new Brand({
      _id: nextId,
      name,
      description,
      logo,
      uploadedAt: uploadedAt || Date.now(), // Use provided value or default to now
    });

    await newBrand.save();
    res.status(201).json({ message: "Brand added successfully", brand: newBrand });
  } catch (err) {
    console.error("Error adding brand:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// @route   GET /api/brands
// @desc    Get all brands
router.get("/", async (req, res) => {
  try {
    const brands = await Brand.find();
    res.status(200).json({ brands });
  } catch (err) {
    console.error("Error fetching brands:", err);
    res.status(500).json({ error: "Failed to fetch brands", details: err.message });
  }
});





router.put("/:id", upload.single("image"), async (req, res) => {
  const { name, description, uploadedAt } = req.body;
  const logo = req.file ? req.file.filename : undefined;

  try {
    // First check if the brand exists
    const brandToUpdate = await Brand.findById(req.params.id);
    if (!brandToUpdate) {
      return res.status(404).json({ error: "Brand not found" });
    }

    // Only check for duplicate name if name is being changed
    if (name !== brandToUpdate.name) {
      const existingBrand = await Brand.findOne({ name });
      if (existingBrand) {
        return res.status(400).json({ error: "Brand name already exists" });
      }
    }

    // Create update object
    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(uploadedAt && { uploadedAt })
    };

    // Only add logo if new file was uploaded
    if (logo) {
      updateData.logo = logo;
    }

    // Update the brand
    const updatedBrand = await Brand.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({ 
      message: "Brand updated successfully", 
      brand: updatedBrand 
    });

  } catch (err) {
    console.error("Error updating brand:", err);
    // Send more specific error messages
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: "Validation Error", details: err.message });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid Brand ID format" });
    }
    res.status(500).json({ error: "Server error while updating brand" });
  }
});


// @route   DELETE /api/brands/:id
// @desc    Delete a brand
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Find and delete the brand by ID
    const deletedBrand = await Brand.findByIdAndDelete(id);

    if (!deletedBrand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    // Add the deleted brand's ID to the 'deletedIds' list in the counter
    await Counter.findOneAndUpdate(
      { name: "brand" },
      { $push: { deletedIds: id } },  // Push the deleted ID to the array
      { new: true }
    );

    res.status(200).json({ message: "Brand deleted successfully" });
  } catch (err) {
    console.error("Error deleting brand:", err);
    res.status(500).json({ error: "Failed to delete brand", details: err.message });
  }
});

module.exports = router;
