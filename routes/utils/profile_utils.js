var fs = require('fs');
var Jimp = require("jimp");

function setProfileImage(id, newAvatarDirection, fileName, x, y, w, h) {
    var direction = __dirname.replace("routes/utils", "private/images/profiles/" + id);

    if (!fs.existsSync(direction)) {
        fs.mkdirSync(direction);
    }

    replaceImage(direction, newAvatarDirection, fileName, x, y, w, h);
}

function replaceImage(direction, newAvatarDirection, fileName, x, y, w, h) {
    fs.readdir(direction, function (error, inFile) {
        var oldImage = inFile[0];

        var i = fs.createReadStream(newAvatarDirection);
        var out = fs.createWriteStream(direction + "/" + fileName);

        i.pipe(out);

        i.on('end', function () {

            if (inFile.length == 1) {
                if (oldImage != fileName) {
                    fs.unlink(direction + "/" + oldImage, function (error) {
                        console.log("error: " + error);
                        if (!error) {
                            crop(direction, fileName, x, y, w, h);
                        }
                    });
                } else {
                    crop(direction, fileName, x, y, w, h);
                }
            } else {
                crop(direction, fileName, x, y, w, h);
            }

            fs.unlinkSync(newAvatarDirection);
        });
    });
}

function crop(direction, fileName, x, y, w, h) {
    Jimp.read(direction + "/" + fileName, function (err, image) {
        console.log(err);
        if (image) {
            image.crop(x, y, w, h).write(direction + "/" + fileName);
        }
    });
}

exports.setProfileImage = setProfileImage;