const fs = require("fs");
const { parse } = require("csv-parse");
const { initeBinanceForEachClient } = require("./binanceInite");
const { bitcoinToFiat } = require('bitcoin-conversion');
const {SPOT, FUTURE, TRANSFERTYPE } = require('./constant')
// const {infos} = require('./mockupData');

const main = async() => {
    let clients = await initeBinanceForEachClient;
    clients.map((client) => moneyTransfer(client));
}

const moneyTransfer = async(client) => {
    let transferInfo = await getTransferInfo(client);  
    console.log("transfreInfo", transferInfo);
    if(transferInfo !== null) {
        let type = "";
        if(transferInfo.to === FUTURE) {
            type = TRANSFERTYPE.fromSpotToFuture;
        } else {
            type = TRANSFERTYPE.fromFutureToSpot;
        }
        client.universalTransfer({type: type, asset: 'USDT', amount: transferInfo.amount});
    } else {
        return;
    }
}

const getBlanceFromAccount = async(account, client) => {
    let balance = null;
    let result;
    switch(account) {
        case FUTURE:
            result = await client.futuresAccountBalance();
            if(result.length > 0) {
                balance = result[0].balance;
            }
            break;
        case SPOT:
            result = await client.accountInfo();
            if(Object.keys(result).length > 0) {
                balance = convertBTCToUSDT(result.balances[0].free);
                
            }
            break;
    }
    return balance;
}


const getTransferInfoFromCsvFile = new Promise((resolve) => {
    let infos = [];
    fs.createReadStream("./config_transfers.csv")
		.pipe(parse({ delimiter: ",", from_line: 2 }))
		.on("data", function (row) {
			let info = {};
            info.account = row[0];
            info.percentage = row[1];
            infos.push(info);

		})
		.on("end", function () {
			resolve(infos);		
		})
		.on("error", function (error) {
			console.log(error.message);
		});
})

const getTransferInfo = async(client) => {

    let infos = await getTransferInfoFromCsvFile;
    console.log("infos", infos);
    let spotBlance = getBlanceFromAccount(SPOT, client);
    // let spotBlance = 100;

    let futureBlance = getBlanceFromAccount(FUTURE, client);
    // let futureBlance = 500;

    let clcRes = clcTransferAmountInfo(spotBlance, futureBlance, infos);
    
    return clcRes;
}

const convertBTCToUSDT = async(money) => {
    
    return await bitcoinToFiat(money, 'USD');
}
const clcTransferAmountInfo = (spot, future, infos) => {
    
    let result = {};

    let spotPero = parseFloat(getPrecentageFromInfos(SPOT, infos));

    let sum = parseFloat(spot) + parseFloat(future);
    if( sum  == 0 ) return null;

    let spotAmount = sum * spotPero / 100;

    if(spotAmount > spot) {
        result.to = SPOT;
        result.from = FUTURE;
        result.amount = spotAmount - spot;
    } else {
        result.to = FUTURE;
        result.from = SPOT;
        result.amount = spot - spotAmount;
    }

    return result;
}

const getPrecentageFromInfos = (account, infos) => {
    let percentage = null;
    infos.map((info) => {
        if(info.account === account) 
        percentage = info.percentage;
    });
    return percentage;
}

// clcTransferAmountInfo(500, 100, infos);
main();