/**
 * Created by hejicheng on 2016/5/10.
 */

var crypto = require("crypto");

/*
	paras:
    urlQuery:url中?后的内容
    name:参数名
    return:
    参数内容
 */
function getUrlQueryString(urlQuery, name) {
	var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
	var r = urlQuery.match(reg);  //正则匹配
	var context = "";
	if (r != null)
		context = r[2];
	reg = null;
	r = null;
	return context == null || context == "" || context == "undefined" ? "" : context;
}


/*
 paras:
 date:'2016-04-22T07:29:40Z'
 return:'2016-04-22 15:29:40'
 */
function formatDate(date) {
	var d = new Date(date);
	var years = d.getFullYear();
	var month = add_zero(d.getMonth() + 1);
	var days = add_zero(d.getDate());
	var hours = add_zero(d.getHours());
	var minutes = add_zero(d.getMinutes());
	var seconds = add_zero(d.getSeconds());
	return years + "-" + month + "-" + days + " " + hours + ":" + minutes + ":" + seconds;
}
function formatZeroHour(date) {
	var d = new Date(date);
	var years = d.getFullYear();
	var month = add_zero(d.getMonth() + 1);
	var days = add_zero(d.getDate());
	var hours = add_zero(d.getHours());
	var minutes = add_zero(d.getMinutes());
	var seconds = add_zero(d.getSeconds());
	return years + "-" + month + "-" + days + " " + "00:00:00";
}
function ISOdate(date) {
	var d = new Date(date);
	var years = d.getUTCFullYear();
	var month = add_zero(d.getUTCMonth() + 1);
	var days = add_zero(d.getUTCDate());
	var hours = add_zero(d.getUTCHours());
	var minutes = add_zero(d.getUTCMinutes());
	var seconds = add_zero(d.getUTCSeconds());
	return years + "-" + month + "-" + days + " " + hours + ":" + minutes + ":" + seconds;
}



function ISOformatdate(date) {
	var d = new Date(date);
	var years = d.getUTCFullYear();
	var month = add_zero(d.getUTCMonth() + 1);
	var days = add_zero(d.getUTCDate());
	var hours = add_zero(d.getUTCHours());
	var minutes = add_zero(d.getUTCMinutes());
	var seconds = add_zero(d.getUTCSeconds());
	return years + "-" + month + "-" + days + "T" + hours + ":" + minutes + ":" + seconds + "Z";
}

function add_zero(temp) {
	if (temp < 10) return "0" + temp;
	else return temp;
}


function addDate(date, days) {
	var d = new Date(date);
	d.setDate(d.getDate() + days);
	var month = d.getMonth() + 1;
	var day = d.getDate();
	if (month < 10) {
		month = "0" + month;
	}
	if (day < 10) {
		day = "0" + day;
	}
	var hours = add_zero(d.getHours());
	var minutes = add_zero(d.getMinutes());
	var seconds = add_zero(d.getSeconds());
	var val = d.getFullYear() + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
	return val;
}
function addSeconds(date, seconds) {
	var d = new Date(date);
	d.setSeconds(d.getSeconds() + seconds);
	var month = d.getMonth() + 1;
	var day = d.getDate();
	if (month < 10) {
		month = "0" + month;
	}
	if (day < 10) {
		day = "0" + day;
	}
	var hours = add_zero(d.getHours());
	var minutes = add_zero(d.getMinutes());
	var seconds = add_zero(d.getSeconds());
	var val = d.getFullYear() + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
	return val;
}

/*
 paras:
 numberMillis:毫秒
 */
function sleep(numberMillis) {
	var now = new Date();
	var exitTime = now.getTime() + numberMillis;
	while (true) {
		now = new Date();
		if (now.getTime() > exitTime)
			return;
	}
}

/*
 数组求和
 */
function sum(list) {
	return eval(list.join("+"));
}
/*
 时间转换时间戳
 */
function transdate(endTime) {
	var date = new Date();
	date.setFullYear(endTime.substring(0, 4));
	date.setMonth(endTime.substring(5, 7) - 1);
	date.setDate(endTime.substring(8, 10));
	date.setHours(endTime.substring(11, 13));
	date.setMinutes(endTime.substring(14, 16));
	date.setSeconds(endTime.substring(17, 19));
	return Date.parse(date) / 1000;
}
// 加密
function encrypt(data) {
	var key = "jianshipingtai";
	var secretKey = new Buffer(key, "utf8");
	secretKey = crypto.createHash("md5").update(secretKey).digest("hex");
	secretKey = new Buffer(secretKey, "hex");
	iv = secretKey;
	var cipher = crypto.createCipheriv("aes-128-cbc", secretKey, iv), coder = [];
	coder.push(cipher.update(data, "utf8", "base64"));
	coder.push(cipher.final("base64"));
	return coder.join("");
}
// 解密
function decrypt(data) {
	var key = "jianshipingtai";
	var secretKey = Buffer(key, "utf8");
	secretKey = crypto.createHash("md5").update(secretKey).digest("hex");
	secretKey = new Buffer(secretKey, "hex");
	iv = secretKey;
	var cipher = crypto.createDecipheriv("aes-128-cbc", secretKey, iv), coder = [];
	coder.push(cipher.update(data, "base64", "utf8"));
	coder.push(cipher.final("utf8"));
	return coder.join("");
}
/*
var a  = '111111';
console.log(encrypt(a));
console.log(decrypt(encrypt(a)));*/
exports.getUrlQueryString = getUrlQueryString;
exports.formatDate = formatDate;
exports.addDate = addDate;
exports.sleep = sleep;
exports.ISOdate = ISOdate;
exports.ISOformatdate = ISOformatdate;
exports.addSeconds = addSeconds;
exports.sum = sum;
exports.formatZeroHour = formatZeroHour;
exports.transdate = transdate;
exports.encrypt = encrypt;
exports.decrypt = decrypt;

