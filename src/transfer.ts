import fs from "fs";
import { parse } from "csv-parse";
import { initeBinanceForEachClient } from "./init/binanceInit";
import { bitcoinToFiat } from "bitcoin-conversion";
import {SPOT, FUTURE, TRANSFERTYPE} from "./constant";
import { ClientType } from "./types";
import {spotAccountInfo, futureBalance} from "./mockupData"
import { delayTwo } from "./utils/delay";

type TransferAmountInfo = { from :string, to: string, amount: number } | null;
type TransferInfoType = {data: TransferAmountInfo, error: string | null, client: Object };
type CSVInfoType = {account: string, percentage: number};

const REQUESTID = {
    spotAccountInfo: "0001",
    futureBalance: "0002",
    universalTransfer: "0003"
}

const main = async() => {
    try {
        let clients:ClientType[];
        clients = await initeBinanceForEachClient;
        let infoFromCsv:CSVInfoType[] = await getTransferInfoFromCsvFile;
        console.log("info", infoFromCsv);
        clients.map((client:ClientType) => moneyTransfer(client, infoFromCsv));
    } catch(error) {
        console.log(error);
    };
}

const moneyTransfer = async(client: ClientType, csv:CSVInfoType[]) => {
    try {
        let transferInfo = await getTransferInfo(client, csv);  
        if(!transferInfo || transferInfo == null) return; 

        if(transferInfo.data !== null) {
            // let type = "";
            // if(transferInfo.data.to === FUTURE) {
            //     type = TRANSFERTYPE.fromSpotToFuture;
            // } else {
            //     type = TRANSFERTYPE.fromFutureToSpot;
            // }

            // let data = {type: type, asset: 'USDT', amount: transferInfo.data.amount};
            // console.log("data", data);

            // let result = await handleBinanceApiRequest(REQUESTID.universalTransfer, client.client, data);
            // if(result === null || result === undefined) console.log("Failed transfering money.");
            // else console.log("Succesfully transfering money.");
            let res1 = await sendRequest(REQUESTID.futureBalance, client.client);
            console.log("res-future", res1);
            let res2 = await sendRequest(REQUESTID.spotAccountInfo, client.client);
            console.log("res-spot", res2); 
        } else {
            console.log(transferInfo.error, transferInfo.client);
            return;
        }
        
    } catch(error) {
        console.log(error);
    }
}

const sendRequest = async(id, client, data?) => {
    let result = null;
    switch(id) {
        case REQUESTID.futureBalance:
            result = await client.futuresAccountBalance();
            break;
        case REQUESTID.spotAccountInfo:
            result = await client.accountInfo();
            break;
        case REQUESTID.universalTransfer:
            result = await client.universalTransfer(data);
        default: 
            result = null;
    }
    return result;
}

const handleBinanceApiRequest = async(requestId, client, data?) => {
    let count = 0;
    let result = null;
    while(result == null) {
        try{    
            count++;
            console.log("request-"+requestId+":", count);
            if(count > 3) return; 

            result = await sendRequest(requestId, client, data);
            
        } catch(error) {
            if(error.code == 0) {
                console.log('error:', error.message);
                await delayTwo();
                continue;
            } else if(error.code == -5013) {
                console.log(error.code, error.message);
                return;
            } else{
                console.log(error.message);
                return;
            }
        }
    }
    return result;
}

const getBlanceFromAccount = async(account, client) => {
    let balance:number | null = null;
    switch(account) {
        case FUTURE:
            let resultFuture: [] | null | undefined = null;
            
            resultFuture = await handleBinanceApiRequest(REQUESTID.futureBalance, client);
            if(resultFuture === null || resultFuture === undefined) resultFuture = [];

            if(resultFuture.length > 0) {
                balance = getUsdtBalanceFromFutureAccountInfo(resultFuture);
            }
            break;
        case SPOT:
            let resultSpot: {} | null | undefined = null;
            
            resultSpot = await handleBinanceApiRequest(REQUESTID.spotAccountInfo, client);
            if(resultSpot === null || resultSpot === undefined) resultSpot = {};

            if(Object.keys(resultSpot).length > 0) {
                balance = getUsdtBalanceFromSpotAccountInfo(resultSpot);
            }
            break;
    }
    return balance;
}

const getTransferInfoFromCsvFile = new Promise<CSVInfoType[]>((resolve) => {
    let infos:CSVInfoType[] = [];

    fs.createReadStream("./src/assets/csv/config_transfers.csv")
		.pipe(parse({ delimiter: ",", from_line: 2 }))
		.on("data", function (row) {
            let info:CSVInfoType = {account: row[0].toString(), percentage: Number(row[1])};
            infos.push(info);

		})
		.on("end", function () {
			resolve(infos);		
		})
		.on("error", function (error) {
			console.log(error.message);
		});
})

const getTransferInfo = async(client:ClientType, csv: CSVInfoType[]) => {
    try{
        let result: TransferInfoType;
        result = {data: null, error: null, client: client.info};
        let infos:CSVInfoType[] = csv;
        
        let spotBalance: any = await getBlanceFromAccount(SPOT, client.client);
        // let spotBalance: any = 300;

        if(spotBalance === null) {
            result.error = "Failed to get balance from spot account.";
            return result;
        }
        console.log("spotBalance", spotBalance);

        let futureBalance:any = await getBlanceFromAccount(FUTURE, client.client);
        // let futureBalance:any = 200;

        if(futureBalance === null) {
            result.error = "Failed to get balance from future account.";
            return result;
        };
        console.log("futureBalance", futureBalance);

        let clcRes:TransferAmountInfo = clcTransferAmountInfo(spotBalance, futureBalance, infos);
        if(clcRes === null) {
            result.error = "Spot and Future balance are equal or zero. Otherwise failed reading csv file";
            return result;
        }
        result.data = clcRes;
        return result;
    } catch(error) {
        console.log(error);
    }
    
}

const convertBTCToUSDT = async(money) => {
    try{
        return await bitcoinToFiat(money, 'USD');
    } catch(error) {
        console.log(error);
    }
}

const clcTransferAmountInfo = (spot, future, infos):TransferAmountInfo => {
    let result:TransferAmountInfo;

    let spotPero:number | null = getPrecentageFromInfos(SPOT, infos);
    if(spotPero === null) return null;

    let sum = parseFloat(spot) + parseFloat(future);
    if( sum  == 0 ) return null;

    let spotAmount = sum * spotPero / 100;

    if(spotAmount > spot) {
        result = {to: SPOT, from: FUTURE, amount: spotAmount - spot}
        
    } else if(spotAmount < spot) {
        result = { to: FUTURE, from: SPOT, amount: spot - spotAmount};
    } else {
        return null;
    }

    return result;
}

const getPrecentageFromInfos = (account, infos):number | null => {
    let percentage = null;
    
    infos.map((info) => {
        if(info.account === account) 
        percentage = info.percentage;
    });
    return percentage;
}

const getUsdtBalanceFromSpotAccountInfo = (accounInfo):number | null => {
    let result: number | null = null;

    let balances = accounInfo.balances;
    balances.map((balance) => {
        if(balance.asset == "USDT") {
            result = balance.free;
        }
    });
    
    return result;
}

const getUsdtBalanceFromFutureAccountInfo = (balances): number | null => {
    let result: number | null = null;

    balances.map((balance) => {
        if(balance.asset === "USDT") {
            result = balance.balance;
        }
    })

    return result;
}

main();