const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  creator: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  id: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d+$/.test(v); // Ensure the ID is numeric
      },
      message: props => `${props.value} is not a valid Geometry Dash level ID!`
    }
},

  difficulty: {
    type: String,
    required: true,
    enum: [
      'auto', 'easy', 'normal', 'hard', 'harder', 'insane',
      'easy demon', 'medium demon', 'hard demon', 'insane demon', 
      'extreme demon', 'impossible level'
    ]
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'denied'],
    default: 'pending',
    index: true
  }, 
  images: [{
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: true
    }
  }],
  thumbnail: {
    url: {
      type: String,
      default: '../images/level1.png'
    },
    public_id: String
  }
  ,
  videoLink: {
    type: String
  },
  type: {
    type: String,
    enum: ['level', 'layout', 'platformer', 'challenge'],
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  validateBeforeSave: true
});

// Add compound index for common queries
levelSchema.index({ status: 1, type: 1 });

// Add middleware to clean data before saving
levelSchema.pre('save', function(next) {
  if (this.title) this.title = this.title.trim();
  if (this.creator) this.creator = this.creator.trim();
  if (this.id) this.id = this.id.trim();
  next();
});

levelSchema.pre('remove', async function(next) {
  try {
    const { cloudinary } = require('../config/cloudinary');
    
    // Delete all images
    for (const image of this.images) {
      await cloudinary.uploader.destroy(image.public_id);
    }
    
    // Delete thumbnail if it exists and is not the default
    if (this.thumbnail.public_id) {
      await cloudinary.uploader.destroy(this.thumbnail.public_id);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Level', levelSchema);