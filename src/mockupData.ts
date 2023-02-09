export const infos = [
    { account: 'spot', percentage: '50' },
    { account: 'futures', percentage: '50' }
]

export const spotAccountInfo = {
    makerCommission: 10,
    takerCommission: 10,
    buyerCommission: 0,
    sellerCommission: 0,
    canTrade: true,
    canWithdraw: true,
    canDeposit: true,
    balances: [
      { asset: 'BTC', free: '0.00000000', locked: '0.00000000' },
      { asset: 'LTC', free: '0.00000000', locked: '0.00000000' },
      { asset: 'USDT', free: '200.23000000', locked: '0.00000000' },
    ]
  }

export const futureBalance = [
{
    "accountAlias": "SgsR",    // unique account code
    "asset": "USDT",    // asset name
    "balance": "100.35137903", // wallet balance
    "crossWalletBalance": "23.72469206", // crossed wallet balance
    "crossUnPnl": "0.00000000",  // unrealized profit of crossed positions
    "availableBalance": "23.72469206",       // available balance
    "maxWithdrawAmount": "23.72469206"     // maximum amount for transfer out
}
]