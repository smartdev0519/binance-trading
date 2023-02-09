import fs from "fs";
import { parse } from "csv-parse";
import Binance from 'binance-api-node';
import { ClientType } from "../types";

const initeBinanceForEachClient = new Promise<ClientType[]>((resolve, reject) => {
	let clients:ClientType[] = [];
	fs.createReadStream("./src/assets/csv/clients1.csv")
		.pipe(parse({ delimiter: ",", from_line: 2 }))
		.on("data", function (row) {
			const apiKey = row[2].toString();
			const apiSecret = row[3].toString();
			const client = Binance({
				apiKey: apiKey,
				apiSecret: apiSecret
			});
			let data: ClientType = { client: client, info: row};
			clients.push(data);
		})
		.on("end", function () {
			resolve(clients);		
		})
		.on("error", function (error) {
			console.log(error.message);
		});
});

export	{initeBinanceForEachClient}

