var fs = require('fs');
var path = require('path');
var Jimp = require("jimp");

function mainFolder() {
    var list = __dirname.split(path.sep);

    var newPath = '';
    for (var index in list) {
        if (index != 0) {
            newPath += '/';
        }

        newPath += list[index];
    }

    return newPath;
}

function setProfileImage(id, newAvatarDirection, fileName, x, y, w, h) {
    //var direction = __dirname.replace("routes/utils", "private/images/profiles/" + id);

    var direction = path.join(mainFolder().replace("routes/utils", ''), "private/images/profiles/" + id);
    console.log(direction)

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