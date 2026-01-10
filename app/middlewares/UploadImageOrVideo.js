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
        if (file.originalname.toLocaleLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/)) {
            if(req.params.type) {
                cb(null, `${req.params.type}-${d.getTime()}.${file.originalname.split('.').pop()}`);
            } else if(req.user_id && req.user_type == 2) {
                cb(null, `${req.user_id}_${d.getTime()}.${file.originalname.split('.').pop()}`);
            } else if(req.params.id) {
                cb(null, `${req.params.id}_${d.getTime()}.${file.originalname.split('.').pop()}`);
            } else {
                cb(null, `${d.getTime()}.${file.originalname.split('.').pop()}`);
            }
        } else {
            if(req.params.type) {
                cb(null, `${req.params.type}-${d.getTime()}.png`);
            } else if(req.user_id && req.user_type == 2) {
                cb(null, `${req.user_id}_${d.getTime()}.png`);
            } else if(req.params.id) {
                cb(null, `${req.params.id}_${d.getTime()}.png`);
            } else {
                cb(null, `${d.getTime()}.png`);
            }
        }
    }
})

const fileFilter = (req, file, cb) => {
    if (!file.originalname.toLocaleLowerCase().match(/\.(png|jpg|jpeg|webp|mp4|mov|avi|mkv|webm)$/)) {
        return cb('Only image (png, jpg, jpeg, webp) and video (mp4, mov, avi, mkv, webm) files are allowed!', false)
    }
    cb(null, true)
}

const maxSize = 500 * 1024 * 1024; // 500MB
var upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: fileFilter
})

module.exports = upload.single('file')