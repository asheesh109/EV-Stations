const express = require('express');
const { body, validationResult } = require('express-validator');
const ChargingStation = require('../models/ChargingStation');
const auth = require('../middleware/Auth');


const router = express.Router();


router.get('/', auth, async (req, res) => {
  try {
    const { status, connectorType, minPower, maxPower } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (connectorType) filter.connectorType = connectorType;
    if (minPower || maxPower) {
      filter.powerOutput = {};
      if (minPower) filter.powerOutput.$gte = Number(minPower);
      if (maxPower) filter.powerOutput.$lte = Number(maxPower);
    }

    const stations = await ChargingStation.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: stations.length,
      data: stations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.get('/:id', auth, async (req, res) => {
  try {
    const station = await ChargingStation.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!station) {
      return res.status(404).json({ message: 'Charging station not found' });
    }

    res.json({
      success: true,
      data: station
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.post('/', [
  auth,
  body('name').notEmpty().trim(),
  body('location.latitude').isFloat({ min: -90, max: 90 }),
  body('location.longitude').isFloat({ min: -180, max: 180 }),
  body('location.address').notEmpty().trim(),
  body('powerOutput').isFloat({ min: 0 }),
  body('connectorType').isIn(['Type1', 'Type2', 'CCS', 'CHAdeMO']),
  body('status').isIn(['Available', 'Occupied', 'Out of Service'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const station = new ChargingStation({
      ...req.body,
      createdBy: req.user.id 
    });

    const savedStation = await station.save();
    
   
    await savedStation.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Charging station created successfully',
      data: savedStation
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});




router.put('/:id', [
  auth,
  body('name').optional().notEmpty().trim(),
  body('location.latitude').optional().isFloat({ min: -90, max: 90 }),
  body('location.longitude').optional().isFloat({ min: -180, max: 180 }),
  body('location.address').optional().notEmpty().trim(),
  body('powerOutput').optional().isFloat({ min: 0 }),
  body('connectorType').optional().isIn(['Type1', 'Type2', 'CCS', 'CHAdeMO']),
  body('status').optional().isIn(['Available', 'Occupied', 'Out of Service'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const station = await ChargingStation.findById(req.params.id);

    if (!station) {
      return res.status(404).json({ message: 'Charging station not found' });
    }


    const updatedStation = await ChargingStation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Charging station updated successfully',
      data: updatedStation
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const station = await ChargingStation.findById(req.params.id);

    if (!station) {
      return res.status(404).json({ message: 'Charging station not found' });
    }

    await ChargingStation.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Charging station deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;