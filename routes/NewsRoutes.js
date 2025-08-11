const express = require('express');
const router = express.Router();
const newsController = require('../controllers/NewsController');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: './uploads/news',
    filename: (req, file, cb) => {
        cb(null, Date.now() + "~" + file.originalname);
    }
});
const upload = multer({ storage });

router.get('/', newsController.GetNews);
router.post('/', protect, upload.any(), newsController.CreateNews);
router.delete('/', protect, newsController.DeleteNews);

module.exports = router;