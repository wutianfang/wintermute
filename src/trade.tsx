import { TableInfo, getTableInfo } from "./base.js"


export class TradeDetail {
  date: Date
  currency: string
  transactionAmount: number
  balance: number // 余额
  transactionType: string // 交易摘要
  counterParty: string //对手信息
  accountName: string //账户名称。银行卡，结构化存款，信用卡
  uniqId: string // 唯d一键，主键。
  category: string // 分类
  importTime: string // 导入时间

  constructor(date: Date, currency: string, transactionAmount: number, balance: number, transactionType: string, counterParty: string, accountName: string, category: string) {
    this.date = date;
    this.currency = currency;
    this.transactionAmount = transactionAmount;
    this.balance = balance;
    this.transactionType = transactionType;
    this.counterParty = counterParty;
    this.accountName = accountName;
    this.uniqId = [accountName, formateDate(date, false), String(transactionAmount), String(balance), counterParty, accountName].join("||")
    this.category = category
    this.importTime = formateDate(new Date(), true)

  }
}

export function formateDate(date: Date, hasTime: boolean): string {
  let ret = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
  if (hasTime) {
    ret = ret + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
  }

  return ret
}

export class TradeHead {
  title: string
  key: string
  fieldType: string
  constructor(title: string, key: string, fieldType: string) {
    this.title = title
    this.key = key
    this.fieldType = fieldType
  }
}
export const TableHead: readonly TradeHead[] = [
  new TradeHead("日期", "date", "time"),
  new TradeHead("货币", "currency", "string"),
  new TradeHead("交易金额", "transactionAmount", "number"),
  new TradeHead("余额", "balance", "number"),
  new TradeHead("交易摘要", "transactionType", "string"),
  new TradeHead("对手信息", "counterParty", "string"),
  new TradeHead("账户名称", "accountName", "string"),
  new TradeHead("唯一键", "uniqId", "string"),
  new TradeHead("分类", "category", "string"),
  new TradeHead("导入时间", "importTime", "time"),
]


export function parseBankCard(text: string): { details: TradeDetail[], errors: string[] } {
  let details: TradeDetail[] = [] as TradeDetail[]
  let errors: string[] = [] as string[]
  console.log("parseBankCard:", text)
  const transactionPattern = /(\d{4}-\d{2}-\d{2})\s+([A-Z]+)\s+(-?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([^\s]+)\s+([^\s]+)/g
  let match;

  while ((match = transactionPattern.exec(text)) !== null) {

    const transactionAmount = Number(match[3].replace(",", ""))
    const balance = Number(match[4].replace(",", ""))
    const tradeDate = new Date(match[1])

    if (isNaN(transactionAmount)) {
      errors.push("交易金额解析错误，值为" + match[3])
    } else if (isNaN(balance)) {
      errors.push("余额解析错误，值为" + match[4])
    } else if (isNaN(tradeDate.getTime())) {
      errors.push("日期解析错误，值为" + match[1])
    } else {
      details.push(new TradeDetail(
        tradeDate,
        match[2],
        transactionAmount,
        balance,
        match[5].trim(),
        match[6].trim(),
        "", ""
      ));
    }
  }
  return { details: details, errors: errors }
}


/*
export function filterRepeatTrade(details: TradeDetail[] ,tableInfo :TableInfo):Promise<{newDetails: TradeDetail[],msgs:string[],errMsg:string[]}> {
  return new Promise(function(resolve, reject){
    const rawTradeCount = details.length
    //确定唯一键的fieldId
    let uniqKeyFieldId :string =""
    tableInfo.fieldMetaList.forEach(fieldMeta=>{
      if (fieldMeta.name == "唯一键") {
        uniqKeyFieldId = fieldMeta.id
      }
    })
    if (uniqKeyFieldId == "") {
        resolve({errMsg:["没有找到唯一键字段x"]})
    }
    // 组装一个明细的map，方便后面去重
    const tradeMap: { [key: string]: TradeDetail } = {}
    for (key in details) {
      tradeMap[details[key].uniqId] = details[key]
    }

    // 遍历表格所有数据
    const recordList = await tableInfo.selectTable.getRecordList();
    for (const record of recordList) {
      const cell = await record.getCellByField(uniqKeyFieldId);
        
    }
  })
}
*/

