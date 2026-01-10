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
        var d = new Date();
        if(req.params.type) {
            cb(null, `${req.params.type}-${d.getTime()}.png`);
        } else {
            cb(null, `${req.user_id}_${d.getTime()}.png`);
        }
    }
})

const fileFilter = (req, file, cb) => {
    if (!file.originalname.toLocaleLowerCase().match(/\.(png|jpg|jpeg|webp|xlsx|doc|pdf)$/)) {
        return cb('only .png, .jpeg, .webp, .jpg, .xlsx, .doc and .pdf extensions are allowed!', false)
    }
    cb(null, true)
}

const maxSize = 10 * 1024 * 1024; // 10MB
var upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: fileFilter
})

module.exports = upload.single('file')