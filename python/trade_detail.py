

AccountTypeBank = "银行卡"
AccountTypeStructuring = "结构化存款"
AccountTypeCredit = "信用卡"


class TradeDetail:
    accountType = ""
    def __init__(self, date, currency, transaction_amount, balance, counter_party, customer_type):
        self.date = date
        self.currency = currency
        self.transactionAmount = transaction_amount
        self.balance = balance
        self.counterParty = counter_party
        self.customerType = customer_type

