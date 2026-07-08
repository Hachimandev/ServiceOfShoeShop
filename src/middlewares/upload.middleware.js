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
    fileSize: 5 * 1024 * 1024, // 5 MB limit
    files: 5 // Maximum 5 images per request
  }
});

const uploadFile = multer({
  storage,
  fileFilter: generalFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB limit
    files: 5 // Maximum 5 files per request
  }
});

// Middleware to handle multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Dung lượng file vượt quá giới hạn (5MB cho ảnh, 20MB cho file)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Vượt quá số lượng file cho phép (tối đa 5 file)' });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

module.exports = {
  uploadImage,
  uploadFile,
  handleUploadError
};
