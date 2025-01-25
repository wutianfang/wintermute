
import pdfplumber,re
from  utils import log_notice,log_warning
from trade_detail import TradeDetail,AccountTypeBank,AccountTypeStructuring

def load_bank_card_trade_details(file_path):
    """
    加载银行卡交易明细数据
    """
    details = []
    hasError = False
    with pdfplumber.open(file_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if not text:
                log_warning(f"第 {page_num} 页没有提取到文本，可能是图片型PDF")
                continue
# 常规的数据结构
# '2024-02-12 CNY -193.00 748,313.48 快捷支付 美团平台商户'
# 一旦有换行，数据结构就会变成这种奇葩的格式
# '北京康乐缘盲人保健按摩有限公'
#'2024-02-14 CNY -188.00 747,934.77 银联快捷支付'
# '司'

            lines = text.split("\n")
            for lIndex in range(0, len(lines)):
                line = lines[lIndex]
                match = re.match(r"(\d{4}-\d{2}-\d{2})\s+([A-Z]+)\s+(-?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(.+)", line)
                if match:
                    date, currency, transaction_amount, balance, desc = match.groups()
                    transaction_amount = float(transaction_amount.replace(",", ""))
                    balance = float(balance.replace(",", ""))
                    desc_parts = desc.split(maxsplit=1)
                    transaction_type = desc_parts[0]
                    if len(desc_parts) > 1:
                        counter_party = desc_parts[1]
                    else:
                        detailMatch = r"(\d{4}-\d{2}-\d{2})\s+([A-Z]+)\s+(-?[\d,]+\.\d{2})"
                        beforeMatch = re.match(detailMatch, lines[lIndex - 1])
                        afterMatch = re.match(detailMatch, lines[lIndex + 1])
                        if not beforeMatch and not afterMatch:
                            counter_party =  lines[lIndex - 1] + lines[lIndex + 1]
                        else:
                            counter_party = ""

                    detail = TradeDetail(date, currency, transaction_amount, balance, transaction_type, counter_party)
                    detail.accountType = AccountTypeBank
                    if detail.transactionAmount > 0 and detail.counterParty == "存款认购起息":
                        detail.accountType = AccountTypeStructuring
                    if detail.transactionAmount < 0 and detail.counterParty == "存款还本":
                        detail.accountType = AccountTypeStructuring

                    # 校验。看上一行余额 加 这一行交易金额，是否等于 当前行余额
                    if len(details)>0 and  detail.accountType != AccountTypeStructuring:
                        lastDetail = details[len(details)-1]
                        if lastDetail.accountType == AccountTypeStructuring :
                            lastDetail = details[len(details) - 2]
                        if round(lastDetail.balance + detail.transactionAmount,2)  != round(detail.balance,2):
                            log_warning(f"第 {page_num} 页第 {lIndex} 行数据校验失败，上一行余额:{lastDetail.balance}, 当前行交易金额:{detail.transactionAmount}, 理论上月：{lastDetail.balance + detail.transactionAmount}, 当前行余额:{detail.balance}")
                            hasError = True
                    details.append(detail)
    if not hasError :
        log_notice("无校验失败数据")
    log_notice(f"导入数据量：{len(details)}")
    return details