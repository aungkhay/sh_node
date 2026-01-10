const multer = require('multer');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = req.uploadDir;

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
})

const fileFilter = (req, file, cb) => {
    if (!file.originalname.toLowerCase().match(/\.(xlsx|xls)$/)) {
        return cb("Only .xlsx or .xls files are allowed!", false);
    }
    cb(null, true);
};

const maxSize = 50 * 1024 * 1024; // 50MB
var upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: fileFilter
})

module.exports = upload.single('file')