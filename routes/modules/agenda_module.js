var database = require(__dirname.replace('modules', 'database'));

function getDaysInMonth(month, year) {
    var date = new Date(year, month, 1, 00);
    var days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }

    days[days.length] = date;

    return days;
}

function toDate(stringDate) {
    var inArgs = stringDate.split('-');

    var mm;

    if (inArgs[1] < 9) {
        mm = '0' + inArgs[1]-1;
    } else {
        mm = inArgs[1]-1;
    }

    return new Date(inArgs[0], mm, inArgs[2], inArgs[3], inArgs[4]);
}

function checkDate(a, b) {
    if (a.getDate() == b.getDate() && a.getMonth() == b.getMonth() && a.getFullYear() == b.getFullYear()) {
        return true;
    }

    return false;
}

function intTypeToString(type) {
    switch (type) {
        case 1:
            return 'note';
        case 2:
            return 'test';
        case 3:
            return 'task';
        case 4:
            return 'preparation';
        case 5:
            return 'materials';
        case 6:
            return 'topic';
    }
}

function getMonth(day, id, className, callback) {
    var days = getDaysInMonth(day.getMonth(), day.getFullYear());

    database.getAgendaItems(id, className, function (items) {
        var itemsList = [];

        for (var index in items) {
            var object = items[index];
            var creationDate = toDate(object.creation_date);
            var deliveryDate = toDate(object.delivery_date);

            var inMonth = false;

            for (var dayIndex in days) {
                if (checkDate(days[dayIndex], deliveryDate)) {
                    inMonth = true;
                    break;
                }
            }

            if (inMonth) {
                object.creation_date = creationDate;
                object.delivery_date = deliveryDate;
                object.type = intTypeToString(object.type);

                itemsList[itemsList.length] = object;
            }
        }

        return callback(itemsList);
    });
}

exports.getMonth = getMonth;
