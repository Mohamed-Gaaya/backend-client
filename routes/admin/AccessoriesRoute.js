const express = require("express");
const router = express.Router();
const Accessories = require("../../models/Accessory");

// Get all accessories
router.get("/", async (req, res) => {
  try {
    const accessories = await Accessories.find();
    res.status(200).json({ accessories });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch accessories." });
  }
});

// Add accessories
router.post("/add", async (req, res) => {
  try {
    const newAccessories = new Accessories({ name: req.body.name });
    const savedAccessories = await newAccessories.save();
    res.status(201).json({ accessories: savedAccessories });
  } catch (err) {
    res.status(500).json({ message: "Failed to add accessories." });
  }
});

// Update accessories
router.put("/:id", async (req, res) => {
  try {
    const updatedAccessories = await Accessories.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    res.status(200).json({ accessories: updatedAccessories });
  } catch (err) {
    res.status(500).json({ message: "Failed to update accessories." });
  }
});

// Delete accessories
router.delete("/:id", async (req, res) => {
  try {
    await Accessories.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Accessories deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete accessories." });
  }
});

module.exports = router;
