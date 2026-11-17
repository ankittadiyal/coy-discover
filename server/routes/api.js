
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const DB_PATH = path.join(__dirname, "../data/db.json");

const readDatabase = () => {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
};

const saveDatabase = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

const publicProfile = (profile) => {
  const { likedCurrentUser, ...safeProfile } = profile;
  return safeProfile;
};

// GET /feed - Get profiles not yet swiped on
router.get("/feed", (req, res) => {
  try {
    const db = readDatabase();

    const swipedIds = new Set(
      db.swipes.map((swipe) => swipe.profileId)
    );

    const profiles = db.profiles
      .filter((profile) => !swipedIds.has(profile.id))
      .map(publicProfile);

    res.json({
      success: true,
      count: profiles.length,
      profiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load profiles",
    });
  }
});

// POST /swipe - Save like or pass
router.post("/swipe", (req, res) => {
  try {
    const { profileId, action } = req.body;

    if (!profileId || !["like", "pass"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Valid profileId and action are required",
      });
    }

    const db = readDatabase();

    const profile = db.profiles.find(
      (item) => item.id === profileId
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const alreadySwiped = db.swipes.some(
      (swipe) => swipe.profileId === profileId
    );

    if (alreadySwiped) {
      return res.status(409).json({
        success: false,
        message: "You have already swiped on this profile",
      });
    }

    db.swipes.push({
      profileId,
      action,
      createdAt: new Date().toISOString(),
    });

    let isMatch = false;

    if (action === "like" && profile.likedCurrentUser) {
      const existingMatch = db.matches.some(
        (match) => match.profileId === profileId
      );

      if (!existingMatch) {
        db.matches.push({
          profileId,
          matchedAt: new Date().toISOString(),
        });
      }

      isMatch = true;
    }

    saveDatabase(db);

    res.json({
      success: true,
      action,
      isMatch,
      match: isMatch ? publicProfile(profile) : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to process swipe",
    });
  }
});

// GET /matches - Get mutual matches only
router.get("/matches", (req, res) => {
  try {
    const db = readDatabase();

    const matches = db.matches
      .map((match) => {
        const profile = db.profiles.find(
          (item) => item.id === match.profileId
        );

        if (!profile) return null;

        return {
          ...publicProfile(profile),
          matchedAt: match.matchedAt,
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load matches",
    });
  }
});

module.exports = router;
