import { TableInfo, getTableInfo } from "./base.js"

import {
    FieldType,
    IOpenSegment,
    IOpenNumber,
    IOpenSegmentType,
    IOpenTextSegment,
    IWidgetTable,
    IWidgetView,
    ViewType,
    bitable,
    IRecordValue,
    IOpenCellValue,
    IGetRecordsResponse,
    IGetRecordsParams,
    IRecord,
} from "@lark-base-open/js-sdk";

const AccountTypeBank = "银行卡"
const AccountTypeStructuring = "结构化存款"
const AccountTypeCredit = "信用卡"


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
        this.uniqId = [accountName, formateDate(date, false), String(transactionAmount), String(balance), counterParty, transactionType].join("||")
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
    const transactionPattern = /(\d{4}-\d{2}-\d{2})\s+([A-Z]+)\s+(-?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([^\s]+)\s+([^\s]+)/g
    let match;

    // 解析pdf
    while ((match = transactionPattern.exec(text)) !== null) {

        const transactionAmount = Number(match[3].replace(/,/g, ""))
        const balance = Number(match[4].replace(/,/g, ""))
        const tradeDate = new Date(match[1])

        if (isNaN(transactionAmount)) {
            errors.push("交易金额解析错误，值为" + match[3])
            continue
        }
        if (isNaN(balance)) {
            errors.push("余额解析错误，值为" + match[4])
            continue
        }
        if (isNaN(tradeDate.getTime())) {
            errors.push("日期解析错误，值为" + match[1])
            continue
        }

        let transactionType: string = match[5].trim()
        let counterParty: string = match[6].trim()
        let accountType = AccountTypeBank
        if (transactionAmount > 0 && transactionType == "存款认购起息") {
            accountType = AccountTypeStructuring
        } else if (transactionAmount < 0 && transactionType == "存款还本") {
            accountType = AccountTypeStructuring
        }

        details.push(new TradeDetail(
            tradeDate,
            match[2],
            transactionAmount,
            balance,
            transactionType,
            counterParty,
            accountType, ""
        ));
    }

    // 校验解析结果
    for (let key in details) {
        if (key == "0") {
            continue
        }
        let iKey = Number(key)
        let detail = details[iKey]
        let preDetail = details[iKey - 1]
        // 处理结构化存款
        if (detail.accountName == AccountTypeStructuring) {
            continue
        }
        if (preDetail.accountName == AccountTypeStructuring) {
            preDetail = details[iKey - 2]
        }
        let expectBalance = Number((preDetail.balance + detail.transactionAmount).toFixed(2))
        if (expectBalance == detail.balance) {
            continue
        }
        let errMsg = `校验错误！明细第${iKey + 1}行，${formateDate(detail.date, false)},${detail.transactionType},${detail.counterParty},交易金额${detail.transactionAmount}，余额${detail.balance}。预期余额是${expectBalance}`
        errors.push(errMsg)
    }


    return { details: details, errors: errors }
}

export function parseCreditCard(text: string): { details: TradeDetail[], errors: string[] } {
    let details: TradeDetail[] = []
    let errors: string[] = []

    console.log("parseCreditCard", text)

    // 还款金额
    let repayAmountMatch = /本期还款总额   ¥ ([\d,]+\.\d{2})/.exec(text)
    if (repayAmountMatch == null) {
        return { details: details, errors: ["未找到还款金额！"] }
    }
    let repayAmount = Number(repayAmountMatch[1].replace(/,/g, ""))
    if (isNaN(repayAmount)) {
        return { details: details, errors: [`还款接口解析失败！match:${repayAmountMatch[0]}`] }
    }

    // 账单日
    let yearMatch = /账单日\s+(\d+)年\d+月\d+日/.exec(text)
    if (yearMatch === null) {
        return { details: details, errors: ["未找到账单日！"] }
    }
    let year = Number(yearMatch[1])
    let totalAmount = 0

    console.log("year", year)
    let match;
    const transactionPattern = /(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+(.*?)\s+(-?[\d,]+\.\d{2})\s+\d{4}/g
    while ((match = transactionPattern.exec(text)) !== null) {
        console.log("match", match)

        // 日期
        let days = match[1].split("/")
        let dateStr = year + "/" + match[1]
        if (days[0] == "12") {
            dateStr = (year - 1) + "/" + match[1]
        }
        let date = new Date(dateStr)
        if (isNaN(date.getTime())) {
            errors.push(`日期解析错误，date：${dateStr}, match:${match[0]}`)
            continue;
        }
        // 金额
        let amount = Number(match[4].replace(/,/g, ""))
        if (isNaN(amount)) {
            errors.push(`金额解析错误，match：${match[0]}`)
        }

        // 摘要
        let counterParty = match[3]
        if (amount < 0) {
            counterParty = "退款：" + counterParty
        }
        totalAmount = Number((totalAmount + amount).toFixed(2))

        details.push(new TradeDetail(
            date,
            "CNY",
            -amount,
            -totalAmount,
            AccountTypeCredit,
            counterParty,
            AccountTypeCredit, ""
        ));
    }
    if (totalAmount != repayAmount) {
        return { details: details, errors: [`信用卡校验失败，累计金额：${totalAmount},本期还款总额:${repayAmount}`] }
    }
    console.log("totalAmount", totalAmount)
    console.log("repayAmount", repayAmount)
    console.log("details", details)

    return { details, errors }
}


export async function filterRepeatTrade(details: TradeDetail[], tableInfo: TableInfo): Promise<{ newDetails: TradeDetail[], msgs: string[], errMsg: string[] }> {

    const oldTradeCount = details.length
    //确定唯一键的fieldId
    let uniqKeyFieldId: string = ""
    tableInfo.fieldMetaList.forEach(fieldMeta => {
        if (fieldMeta.name == "唯一键") {
            uniqKeyFieldId = fieldMeta.id
        }
    })
    if (uniqKeyFieldId == "") {
        return { newDetails: [], msgs: [], errMsg: ["没有找到唯一键字段x"] }
    }
    // 组装一个明细的map，方便后面去重
    const tradeMap: { [key: string]: TradeDetail } = {}
    for (let key in details) {
        tradeMap[details[key].uniqId] = details[key]
    }

    // 遍历表格所有数据
    const allRecordList: IRecord[] = []
    let bHasMore: boolean = true
    let sPageToken: string | undefined = ""
    while (bHasMore) {
        const param: IGetRecordsParams = {
            pageSize: 500,
        }
        if (sPageToken != "") {
            param.pageToken = sPageToken
        }
        const { records, hasMore, pageToken } = await tableInfo.selectTable.getRecords(param)
        sPageToken = pageToken
        bHasMore = hasMore
        for (let key in records) {
            const uniqIdField = records[key].fields[uniqKeyFieldId] as IOpenTextSegment[]
            const uniqId = uniqIdField[0].text
            delete tradeMap[uniqId]
        }
    }

    let ret: TradeDetail[] = []
    for (let key in tradeMap) {
        const detail = analyseCategory(tradeMap[key])
        ret.push(detail)
    }
    let msg: string = "解析出数据共" + oldTradeCount + "条，过滤去重后待导入数据共" + ret.length + "条。"

    return { newDetails: ret, msgs: [msg], errMsg: [] }

}

function analyseCategory(detail: TradeDetail): TradeDetail {

    if (detail.counterParty.includes("滴滴出行") || detail.counterParty.includes("广州骑安")) {
        detail.category = "出行"
    } else if (detail.counterParty.includes("融通地产")) {
        detail.category = "租房"
    } else if (detail.counterParty == "北京联通") {
        detail.category = "话费"
    } else if (detail.transactionType == "信用卡自动还款" && detail.transactionAmount < 0) {
        detail.category = "信用卡还款"
    } else if ((detail.transactionType == "存款认购起息" || detail.transactionType == "基金申购") && detail.transactionAmount < 0) {
        detail.category = "理财"
    }

    return detail
}

