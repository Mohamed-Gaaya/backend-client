const express = require("express");
const router = express.Router();
const Clothes = require("../../models/Clothes");

// Get all clothes
router.get("/", async (req, res) => {
  try {
    const clothes = await Clothes.find();
    res.status(200).json({ clothes });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch clothes." });
  }
});

// Add clothes
router.post("/add", async (req, res) => {
  try {
    const newClothes = new Clothes({ name: req.body.name });
    const savedClothes = await newClothes.save();
    res.status(201).json({ clothes: savedClothes });
  } catch (err) {
    res.status(500).json({ message: "Failed to add clothes." });
  }
});

// Update clothes
router.put("/:id", async (req, res) => {
  try {
    const updatedClothes = await Clothes.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    res.status(200).json({ clothes: updatedClothes });
  } catch (err) {
    res.status(500).json({ message: "Failed to update clothes." });
  }
});

// Delete clothes
router.delete("/:id", async (req, res) => {
  try {
    await Clothes.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Clothes deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete clothes." });
  }
});

module.exports = router;
