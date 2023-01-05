const express = require("express");
const { Image } = require("../../db/models");

const router = express.Router();

router.post(
  '/:userId',
  async (req, res) => {
    const { userId } = req.params;
  }
);

router.get(
  '/:userId',
  async (req, res) => {
    const images = await Image.findAll({where: { userId: req.params["userId"] }});
  }
);

module.exports = router;