
/// 여행 후기 게시글 등록하기
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);  // 파일 확장자
        cb(null, path.basename(file.originalname, ext) + '-' + Date.now() + ext); // 새 파일명(기존 파일명 + 시간 + 확장자)} else
    },
    limits : { filesize : 30 * 1024 * 1024 }, // 30KB
})

exports.upload = multer({storage : storage});

