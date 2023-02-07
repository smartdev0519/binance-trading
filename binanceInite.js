const fs = require("fs");
const { parse } = require("csv-parse");
const Binance = require('binance-api-node').default;

const initeBinanceForEachClient = new Promise((resolve, reject) => {
	let clients = [];
	fs.createReadStream("./clients1.csv")
		.pipe(parse({ delimiter: ",", from_line: 2 }))
		.on("data", function (row) {
			const apiKey = row[2];
			const apiSecret = row[3];
			const client = Binance({
				apiKey: apiKey,
				apiSecret: apiSecret
			});
			clients.push({client: client, info: row});
		})
		.on("end", function () {
			resolve(clients);		
		})
		.on("error", function (error) {
			console.log(error.message);
		});
});

module.exports = {
	initeBinanceForEachClient
}
