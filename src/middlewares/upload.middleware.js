const multer = require('multer');

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Accept only image files
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Accept all files
const generalFileFilter = (req, file, cb) => {
  cb(null, true);
};

const uploadImage = multer({ 
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  }
});

const uploadFile = multer({
  storage,
  fileFilter: generalFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB limit
  }
});

module.exports = {
  uploadImage,
  uploadFile
};
