var path = require('path');

mainFolder = function() {
    var list = __dirname.split(path.sep);

    var newPath = '';
    for (var index in list) {
        if (index != 0) {
            newPath += '/';
        }

        newPath += list[index];
    }

    return newPath.replace('routes/utils', '');
}

exports.mainFolder = mainFolder;