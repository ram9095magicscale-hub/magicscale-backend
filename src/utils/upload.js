import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // create folder if needed
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
export const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // ✅ Limit: 1 MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.png', '.jpg', '.jpeg', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Only .png, .jpg, .jpeg, and .pdf files are allowed'));
    }
    cb(null, true);
  },

});
