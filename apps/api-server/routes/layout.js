const express = require('express')
const authenticateJWT = require('../middleware/auth')
const router = express.Router()

router.use((req, res, next) => {
  req.db = req.app.get('db')
  next()
})

router.get('/', authenticateJWT, async (req, res) => {
  try {
     const layouts = await req.db.all(
      "SELECT * FROM layouts WHERE user_id = ?",
      [req.user.userId]
    );
    res.status(200).json(layouts);
  } catch (error) {
    console.error("Error fetching layouts:", error);
    res.status(500).send("Internal server error");
  }
});

router.post('/', authenticateJWT, async (req, res) => {
  const { name, config } = req.body;

  if (!name || !config) {
    return res.status(400).send("Layout name and config are required");
  }

  try {
    const result = await req.db.run(
      "INSERT INTO layouts (name, config_json, user_id, created_at, updated_at) VALUES (?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))",
      [name, JSON.stringify(config), req.user.userId]
    );

    res.status(201).json({
      id: result.lastID,
      name,
      config: JSON.parse(JSON.stringify(config)),
      user_id: req.user.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error creating layout:", error);
    res.status(500).send("Internal server error");
  }
});

router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const layout = await req.db.get(
      "SELECT * FROM layouts WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );

    if (!layout) {
      return res.status(404).send("Layout not found");
    }

    res.status(200).json({
      id: layout.id,
      name: layout.name,
      config: JSON.parse(layout.config_json),
      user_id: layout.user_id,
      created_at: layout.created_at,
      updated_at: layout.updated_at
    });
  } catch (error) {
    console.error("Error fetching layout:", error);
    res.status(500).send("Internal server error");
  }
});

router.put('/:id', authenticateJWT, async (req, res) => {
  const { name, config } = req.body;

  if (name === undefined && config === undefined) {
    return res.status(400).send("At least one of name or config is required");
  }

  try {
    let updates = [];
    let params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (config !== undefined) {
      updates.push("config_json = ?");
      params.push(JSON.stringify(config));
    }
    updates.push("updated_at = datetime('now', 'localtime')");
    params.push(req.params.id, req.user.userId);

    const result = await req.db.run(
      `UPDATE layouts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    if (result.changes === 0) {
      return res.status(404).send("Layout not found");
    }

    res.status(200).send("Layout updated successfully");
  } catch (error) {
    console.error("Error updating layout:", error);
    res.status(500).send("Internal server error");
  }
});

router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const result = await req.db.run(
      "DELETE FROM layouts WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );

    if (result.changes === 0) {
      return res.status(404).send("Layout not found");
    }

    res.status(200).send("Layout deleted successfully");
  } catch (error) {
    console.error("Error deleting layout:", error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router