var fs = require("fs");
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const PNF = require('google-libphonenumber').PhoneNumberFormat;
var parser = require('csv-parse');
var _ = require('lodash');

var header = [];
var results = [];

function Person(fullname, eid, classes, adresses, invisible, seeAll) {
    this.fullname = fullname;
    this.eid = eid;
    this.classes = classes;
    this.adresses = adresses;
    this.invisible = invisible;
    this.seeAll = seeAll;
}

function AddAdress(type, tags, adress) {
    this.type = type;
    this.tags = tags;
    this.adress = adress;
}

function TypeAndTags(type, tags) {
    this.type = type;
    this.tags = tags;
}
function IsValidEmail(email){
    var regex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    return regex.test(email);
}

fs.readFile('input.csv', function(err, data) {

    parser(data, function(err, csvLines) {

        var headerElem = _.chunk(_.head(csvLines), 1);

        let tags = [];
        let type;
        let rootElements;

        for (i = 0; i < headerElem.length; i++) {
            rootElements = headerElem[i].toString().replace(/,/g, '').split(" ");
            tags = _.drop(rootElements);
            type = _.head(rootElements);

            header.push(new TypeAndTags(type, tags.slice()));
        }

        dataFromUser = _.drop(csvLines);

        var adresses = [],
            classes = [],
            classElem = [],
            analysedEmails = [],
            invisible,
            seeAll;

        for (i = 0; i < dataFromUser.length; i++) {
            classes.splice(0, classes.length);
            classElem.splice(0, classElem.length);
            analysedEmails.splice(0, analysedEmails.length);
            adresses.splice(0, adresses.length);
            
            parsedUserData = _.chunk(dataFromUser[i], 1);

            for (j = 0; j < dataFromUser[i].length; j++) {

                switch (header[j].type) {

                    case 'fullname':
                        name = parsedUserData[j].toString();
                        break;

                    case 'eid':
                        id = parsedUserData[j].toString();
                        break;

                    case 'class':

                        if (dataFromUser != "") {
                            classElem = _.chunk(parsedUserData[j].toString().replace('/', ',').split(","), 1);

                            for (k = 0; k < classElem.length; k++) {
                                if (classElem[k].toString() != "") {
                                    classes.push(classElem[k].toString().trim());
                                }
                            }
                            break;
                        }

                    case 'see_all':
                        seeAllEntry = parsedUserData[j].toString();

                        if (seeAllEntry == "" || seeAllEntry == "0" || seeAllEntry == "no") {
                            seeAll = false;
                        } else {
                            seeAll = true;
                        }
                        break;

                    case 'invisible':

                        InvisibleEntry = parsedUserData[j].toString();

                        if (InvisibleEntry == "" || InvisibleEntry == "0" || InvisibleEntry == "no") {
                            invisible = false;
                        } else {
                            invisible = true;
                        }
                        break;

                    case 'email':
                        analysedEmails = _.chunk(parsedUserData[j].toString().replace('/', ',').split(","), 1);
                        analysedEmails.map(function(email) {
                            return email.toString().trim()
                        });

                        for (k = 0; k < analysedEmails.length; k++) {

                            if (IsValidEmail(analysedEmails[k].toString())) {

                                var index = adresses.findIndex(function(addr) {
                                    return addr.address == analysedEmails[k] && addr.type == 'email'
                                });

                                if (index != -1) {
                                    adresses[index].tags.push.apply(adresses[index].tags, header[j].tags.slice());
                                } else {
                                    adresses.push(new AddAdress(header[j].type, header[j].tags.slice(), analysedEmails[k].toString()));
                                }
                            }
                        }
                        break;

                    case 'phone':

                        let analysedNumber;
                        phoneNumber = parsedUserData[j].toString().trim();

                        try {
                            analysedNumber = phoneUtil.parse(phoneNumber, 'BR');
                        } catch (phoneErr) {
                            break;
                        }

                        if (phoneUtil.isValidNumber(analysedNumber)) {

                            var index = adresses.findIndex(function(addr) {
                                return addr.address == phoneNumber && addr.type == 'phone'
                            });
                            if (index != -1) {
                                adresses[index].tags.push.apply(adresses[index].tags, header[j].tags.slice());
                            } else {
                                adresses.push(new AddAdress(header[j].type, header[j].tags.slice(), phoneUtil.format(analysedNumber, PNF.E164).replace("+", "")));
                            }
                        }
                        break;
                }
            }

            let client = results.findIndex(function(user) {
                return user.eid == id;
            });

            if (client != -1) {

                results[client].adresses.push.apply(results[client].adresses, adresses.slice());
                results[client].classes.push.apply(results[client].classes, classes.slice());

                results[client].invisible = results[client].invisible || invisible;
                results[client].see_all = results[client].see_all || seeAll;
            } else {
                results.push(new Person(name, id, classes.slice(), adresses.slice(), invisible, seeAll));
            }
        }

        var JSONFile = JSON.stringify(results, null, 2);
        fs.writeFile('output.json', JSONFile, 'utf8', function(err) {
            if (err) {
                console.log("Error during Json job");
            }
        });
    });
})