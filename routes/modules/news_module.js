var database = require(__dirname.replace('modules', 'database'));
/*
function getNews(callback) {
    var connection = database.getConnection();

    var sql = "SELECT id, title, description, DATE_FORMAT(date, \"%d-%m-%Y %H:%i\") AS date FROM news"
    connection.query(sql, function (error, results) {
        if (!error) {
            callback(results);
        }
    })
}*/

function toDate(date) {
    var stripeArgs = date.split("-");
    var day = stripeArgs[0];
    var month = stripeArgs[1]-1;
    var thirdArg = stripeArgs[2].split(" ");
    var year = thirdArg[0];
    var timeInArgs = thirdArg[1].split(":");
    var hour = timeInArgs[0];
    var minutes = timeInArgs[1];

    return new Date(year, month, day, hour, minutes);
}

function getNews(from, to, callback) {
    var connection = database.getConnection();

    var sql = "SELECT id, title, description, DATE_FORMAT(date, \"%d-%m-%Y %H:%i\") AS date FROM news";
    connection.query(sql, function (error, results) {
        if (!error) {
            if (results.length > 0) {
                if (!((to - from) < 0) && !((to - from) > 5)) {
                    var sortedResults = results.sort(function (a, b) {
                        var aDate = toDate(a.date);
                        var bDate = toDate(b.date);

                        return bDate-aDate;
                    });

                    var list = [];
                    for (var index in sortedResults) {
                        if (index >= from && index <= to) {
                            list[list.length] = sortedResults[index];
                        }
                    }

                    return callback(list);
                }
            }
        }

        return callback();
    });
}

exports.getNews = getNews;




