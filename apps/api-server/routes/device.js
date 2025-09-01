const express = require('express')
const router = express.Router()

const jwt = require('jsonwebtoken');
const authenticateJWT = require('../middleware/auth');
require('dotenv').config()

const DEVICE_SECRET = process.env.DEVICE_SECRET;

router.use((req, res, next) => {
  req.db = req.app.get('db')
  next()
})

router.post('/register', async (req, res) => {
  // device endpoint - check secret
  const providedSecret = req.headers['x-device-secret'];
  if (providedSecret !== DEVICE_SECRET) {
    return res.status(401).send("Invalid device secret");
  }

  try {
    const name = `Display${Math.floor(1000 + Math.random() * 9000)}`

    let pairingCode;
    let exists = true;

    while (exists) {
      pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
      const device = await req.db.get("SELECT * FROM devices WHERE pairing_code = ?", [pairingCode]);
      exists = !!device;
    }

    const device = await req.db.run(
      "INSERT INTO devices (name, pairing_code, updated_at) VALUES (?, ?, datetime('now', 'localtime'))",
      [name, pairingCode]
    )

    res.status(201).json({
      id: device.id,
      name,
      pairing_code: pairingCode
    })

  } catch (error) {
    console.error("Error registering device:", error);
    res.status(500).send("Internal server error");
  }
})

router.post('/pair', authenticateJWT, async (req, res) => {
  const { pairing_code } = req.body;

  if (!pairing_code) {
    return res.status(400).send("Pairing code is required");
  }

  try {
    const device = await req.db.get(
      "SELECT * FROM devices WHERE pairing_code = ?",
      [pairing_code]
    )

    if (!device) {
      return res.status(404).send("Device not found");
    }

    await req.db.run(
      "UPDATE devices SET user_id = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
      [req.user.userId, device.id]
    )

    res.status(200).json({
      id: device.id,
      name: device.name,
      paired: true
    })
  } catch (error) {
    console.error("Error pairing device:", error);
    res.status(500).send("Internal server error");
  }
})

router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const device = await req.db.get(
      "SELECT * FROM devices WHERE id = ? AND user_id = ?",
      [id, req.user.userId]
    );

    if (!device) {
      return res.status(404).send("Device not found");
    }

    res.status(200).json({
      id: device.id,
      name: device.name,
      current_layout_id: device.current_layout_id,
      paired: !!device.user_id
    });
  } catch (error) {
    console.error("Error fetching device:", error);
    res.status(500).send("Internal server error");
  }
});

router.post('/:id/disconnect', authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const device = await req.db.get(
      "SELECT * FROM devices WHERE id = ? AND user_id = ?",
      [id, req.user.userId]
    );

    if (!device) {
      return res.status(404).send("Device not found");
    }

    await req.db.run(
      "UPDATE devices SET user_id = NULL, updated_at = datetime('now', 'localtime') WHERE id = ?",
      [device.id]
    );

    res.status(200).json({
      id: device.id,
      name: device.name,
      paired: false
    });
  } catch (error) {
    console.error("Error disconnecting device:", error);
    res.status(500).send("Internal server error");
  }
});

router.put('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { name, current_layout_id } = req.body;

  try {
    const device = await req.db.get(
      "SELECT * FROM devices WHERE id = ? AND user_id = ?",
      [id, req.user.userId]
    );

    if (!device) {
      return res.status(404).send("Device not found");
    }

    let updates = [];
    let params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (current_layout_id !== undefined) {
      updates.push("current_layout_id = ?");
      params.push(current_layout_id);
    }
    updates.push("updated_at = datetime('now', 'localtime')");

    params.push(device.id);

    await req.db.run(
      `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.status(200).json({
      id: device.id,
      name: name !== undefined ? name : device.name,
      current_layout_id: current_layout_id !== undefined ? current_layout_id : device.current_layout_id
    });
  } catch (error) {
    console.error("Error updating device:", error);
    res.status(500).send("Internal server error");
  }
});

router.get('/', authenticateJWT, async (req, res) => {
  try {
    const devices = await req.db.all(
      "SELECT * FROM devices WHERE user_id = ?",
      [req.user.userId]
    );
    res.status(200).json(devices);
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router