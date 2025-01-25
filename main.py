import argparse
import bank_card
from  utils import log_notice,log_warning


def main():
    parser = argparse.ArgumentParser(description="解析PDF数据并导入飞书")
    parser.add_argument("--bank_card_file", help="银行卡pdf文件路径")
    parser.add_argument("--credit_card_file", help="信用卡pdf文件路径")
    args = parser.parse_args()

    if args.bank_card_file != "" :
        log_notice("导入储蓄账户明细，文件:{file}".format(file=args.bank_card_file))
        bank_card.load_bank_card_trade_details(args.bank_card_file)
    elif args.credit_card_file!= "" :
        log_notice("credit_card_file:%s".format(args.credit_card_file))
    else:
        log_warning("bank_card_file and credit_card_file is empty")


if __name__ == '__main__':
    main()