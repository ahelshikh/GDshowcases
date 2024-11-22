const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const Level = require('./models/Level');
const path = require('path');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(express.json());
app.use(cookieParser());

// Connect to the database
const connectDB = async () => {
    try {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        dbName: 'GDshowcase'
      };
  
      await mongoose.connect(process.env.MONGODB_URI, options);
      console.log('MongoDB connected successfully to GDshowcase database');
      
      console.log('Current database:', mongoose.connection.db.databaseName);
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name));

    } catch (err) {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    }
};

connectDB();

// Middleware to check if the user is authenticated
const checkAuthentication = (req, res, next) => {
    const authCookie = req.cookies.authenticated;
    const accessMethod = req.cookies.accessMethod;

    console.log('Checking authentication...');
    console.log('Auth cookie:', authCookie);
    console.log('Access method:', accessMethod);

    if (authCookie === 'true' && accessMethod === 'button') {
        console.log('User authenticated through button, allowing access.');
        next(); 
    } else {
        console.log('Unauthorized access attempt!');
        res.status(401).send('Unauthorized: You must enter the correct password through the button.');
    }
};

// Serve dashboard if authenticated
app.get('/dashboard.html', checkAuthentication, (req, res) => {
    console.log('Accessing /dashboard.html');
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API to fetch levels
app.get('/api/levels', async (req, res) => {
    try {
        const { status, type } = req.query;
        const query = {};

        if (status) query.status = status;
        if (type) query.type = type;

        // Add error logging
        console.log('Fetching levels with query:', query);
        
        const levels = await Level.find(query)
            .sort({ createdAt: -1 })
            .lean() 
            .exec();
        
        console.log(`Found ${levels.length} levels`);
        
        if (!levels.length) {
            return res.json([]);
        }
        
        res.json(levels);
    } catch (error) {
        console.error('Error in /api/levels:', error);
        res.status(500).json({ 
            error: 'Failed to fetch levels',
            details: error.message 
        });
    }
});

// Get a specific level by ID
  app.get('/api/levels/:id', async (req, res) => {
    try {
      const level = await Level.findOne({ id: req.params.id });
      if (!level) {
        return res.status(404).json({ error: 'Level not found' });
      }
      res.json(level);
    } catch (error) {
      console.error('Error fetching level:', error);
      res.status(500).json({ error: 'Failed to fetch level' });
    }
  });

app.use(express.static(__dirname));

// Handle authentication
app.post('/authenticate', (req, res) => {
    const { password } = req.body;

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (password === adminPassword) {
        console.log('Password correct, setting cookies.');

        res.cookie('authenticated', 'true', { httpOnly: true });
        res.cookie('accessMethod', 'button', { httpOnly: true });
        res.sendStatus(200); 
    } else {
        console.log('Password incorrect.');
        res.sendStatus(401);
    }
});

// Update level status
app.post('/api/levels/:id/status', checkAuthentication, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
  
      const updatedLevel = await Level.findOneAndUpdate(
        { id: id },
        { status: status },
        { new: true }
      );
  
      if (!updatedLevel) {
        return res.status(404).json({ error: 'Level not found' });
      }
  
      res.json({ success: true, level: updatedLevel });
    } catch (error) {
      console.error('Error updating level status:', error);
      res.status(500).json({ error: 'Failed to update level status' });
    }
  });

  const { upload } = require('./config/cloudinary');

// Upload level data
app.post('/api/levels', upload.array('images', 5), async (req, res) => {
  try {

      if (req.files && req.files.length > 5) {
          return res.status(400).json({ error: "You can only upload up to 5 images." });
      }

  
      if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: "At least one image is required." });
      }

      const images = req.files.map(file => ({
          url: file.path,
          public_id: file.filename
      }));

  
      const thumbnail = {
          url: req.files[0].path,
          public_id: req.files[0].filename
      };

      const newLevel = new Level({
          title: req.body.title,
          creator: req.body.creator,
          id: req.body.id,
          type: req.body.type,
          difficulty: req.body.difficulty,
          videoLink: req.body.video || '',
          status: 'pending',
          images: images,
          thumbnail: thumbnail
      });

      const savedLevel = await newLevel.save();
      res.status(201).json({ success: true, level: savedLevel });
  } catch (error) {
      console.error('Error saving level:', error);
      res.status(500).json({ error: error.message || 'Failed to save level data.' });
  }
});

// Delete an image from a level
app.delete('/api/levels/:id/images/:imageId', async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const level = await Level.findOne({ id: id });
    
    if (!level) {
      return res.status(404).json({ error: 'Level not found' });
    }

    const image = level.images.find(img => img.public_id === imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await cloudinary.uploader.destroy(imageId);

    level.images = level.images.filter(img => img.public_id !== imageId);
    
    if (level.thumbnail.public_id === imageId && level.images.length > 0) {
      level.thumbnail = level.images[0];
    }

    await level.save();
    res.json({ success: true, level });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Force HTTPS
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.hostname}${req.url}`);
  }
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.put('/levels/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    fs.readFile(levelsFilePath, 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to load levels' });
        }

        const levels = JSON.parse(data);
        const levelIndex = levels.findIndex(l => l.id === id);

        if (levelIndex === -1) {
            return res.status(404).json({ message: 'Level not found' });
        }
        levels[levelIndex].status = status;

        fs.writeFile(levelsFilePath, JSON.stringify(levels, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Failed to save level' });
            }
            res.json({ message: 'Level updated successfully' });
        });
    });
});

// Delete a level and its images
app.delete('/api/levels/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const level = await Level.findOne({ id });

      if (!level) {
          return res.status(404).json({ error: 'Level not found' });
      }

      for (const image of level.images) {
          await cloudinary.uploader.destroy(image.public_id);
      }

      await level.deleteOne();

      res.json({ success: true, message: 'Submission deleted successfully.' });
  } catch (error) {
      console.error('Error deleting submission:', error);
      res.status(500).json({ error: 'Failed to delete submission.' });
  }
});
