import React, { useEffect, useState, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { Alert, AlertProps, Space, Typography } from 'antd';
const { Text, Link } = Typography;
import { Button, Popconfirm, Select, Upload, Spin, Toast, Table } from "@douyinfe/semi-ui";
import Column from "@douyinfe/semi-ui/lib/es/table/Column";
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
    IOpenSingleSelect,
    IOpenCellValue,

} from "@lark-base-open/js-sdk";

import { TradeDetail, TradeHead, TableHead, parseBankCard, parseCreditCard, formateDate, filterRepeatTrade } from "./trade.js"
import { TableInfo, getTableInfo } from "./base.js"

import pdfToText from 'react-pdftotext'


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <LoadApp />
    </React.StrictMode>
)

enum LoadStat {
    Init,
    Loading,
    Preview,
    Done,
    Error,
}

function LoadApp() {

    const [tableInfo, setTableInfo] = useState<TableInfo>({} as TableInfo)
    const [state, setState] = useState<LoadStat>(LoadStat.Init);
    const [msgs, setMsgs] = useState<string[]>([] as string[]);
    const [errors, setErrors] = useState<string[]>([] as string[]);
    let detailsRef = useRef<TradeDetail[]>([] as TradeDetail[])


    const selectFile = (files: File[]) => {
        setState(LoadStat.Loading)

        pdfToText(files[0]).then((textContent) => {
            let { details, errors } = parseBankCard(textContent)
            if (errors.length > 0) {
                setErrors(errors)
                console.log("parseBankCard.error", errors)
                setState(LoadStat.Error)

                return
            }
            filterRepeatTrade(details, tableInfo).then(({ newDetails, msgs, errMsg }) => {
                if (errMsg.length > 0) {
                    setState(LoadStat.Error)
                    setErrors(errMsg)
                    return
                }
                detailsRef.current = newDetails
                setState(LoadStat.Preview)
                setMsgs(msgs)
            })
        })
    }

    const selectCreditCardFile = (files: File[]) => {
        setState(LoadStat.Loading)

        pdfToText(files[0]).then((textContent) => {
            let { details, errors } = parseCreditCard(textContent)
            if (errors.length > 0) {
                setErrors(errors)
                console.log("selectCreditCardFile.error", errors)
                setState(LoadStat.Error)

                return
            }
            filterRepeatTrade(details, tableInfo).then(({ newDetails, msgs, errMsg }) => {
                if (errMsg.length > 0) {
                    setState(LoadStat.Error)
                    setErrors(errMsg)
                    return
                }
                detailsRef.current = newDetails
                setState(LoadStat.Preview)
                setMsgs(msgs)
            })
        })
    }

    const importFile = () => {
        const fieldMetaList = tableInfo.fieldMetaList;

        // 初始化字段名导 fieldId的映射
        const nameMapId: { [key: string]: string } = {};
        const fieldMapId: { [key: string]: string } = {};
        fieldMetaList.forEach((fieldMeta) => {
            nameMapId[fieldMeta.name] = fieldMeta.id
        })
        TableHead.forEach((fieldHead) => {
            fieldMapId[fieldHead.key] = nameMapId[fieldHead.title]
        })

        console.log("nameMapId", nameMapId)
        console.log("fieldMapId", fieldMapId)

        let records: IRecordValue[] = []
        let importErrMsgs: string[] = []
        for (let cKey in detailsRef.current) {
            let detail = detailsRef.current[cKey]
            let v: { [fieldId: string]: IOpenCellValue; } = {}
            Object.entries(detail).map(([key, value]) => {
                // let value = detail[key] as any
                if (typeof value == "number") {
                    v[fieldMapId[key]] = value
                } else if (value instanceof Date) {
                    v[fieldMapId[key]] = value.getTime()
                } else if (typeof value === "string") {
                    let cellValue: IOpenCellValue
                    if (value == "") {
                        cellValue = null
                    } else if (key == "category") {
                        if (!(value in tableInfo.fieldOptionMapCategory)) {
                            importErrMsgs.push(`"分类"无法找到对应下拉选手。类型：${value}`)
                            return
                        }
                        cellValue = {
                            id: tableInfo.fieldOptionMapCategory[value],
                            text: value,
                        }
                    } else if (key == "accountName") {
                        if (!(value in tableInfo.fieldOptionMapAccount)) {
                            importErrMsgs.push(`"账户"无法找到对应下拉选手。账户：${value}`)
                            return
                        }
                        cellValue = {
                            id: tableInfo.fieldOptionMapAccount[value],
                            text: value,
                        }
                    } else {
                        cellValue = [{ type: IOpenSegmentType.Text, text: value }]
                    }
                    v[fieldMapId[key]] = cellValue;
                }

            })
            records.push({
                fields: v
            })
        }
        console.log("records", records)
        if (importErrMsgs.length > 0) {
            setErrors(importErrMsgs)
            setState(LoadStat.Error)
            return
        }
        //records = [records[0], records[1], records[2], records[3], records[4]]
        tableInfo.selectTable.addRecords(records).then(
            () => {
                setState(LoadStat.Done)
            }
        )
    }

    useEffect(() => {
        getTableInfo().then((tableInfo) => {
            setTableInfo(tableInfo as TableInfo)
        })
    }, [])

    const msgItems = msgs.map((msgItem) => {
        return <Alert key={msgItem} message={msgItem}></Alert>
    });
    const errorMsgs = errors.map((error) => {
        return <Alert key={error} message={error} type="error"></Alert>
    });
    switch (state) {
        case LoadStat.Loading:
            return <Alert message="导入中"></Alert>

        case LoadStat.Preview:
            return (<div>
                <Alert message={"预览导入 " + tableInfo.tableName + " 的数据"}></Alert>
                <div>{msgItems}</div>
                <button onClick={importFile}>导入</button>
                <PreviewTable details={detailsRef.current}></PreviewTable>
            </div>)

        case LoadStat.Done:
            return (<div>
                <div >导入完成</div>
                <button onClick={() => { setState(LoadStat.Init) }}>继续导入</button>
            </div>)

        case LoadStat.Error:
            return (<div>
                <Alert message="错误！"></Alert>
                <div>{errorMsgs}</div>
            </div>)
    }


    return <div>
        <Alert message={"向表格: " + tableInfo.tableName + " 导入数据"}></Alert>
        <div className="selectFile">
            <Upload
                draggable={true}
                accept=".pdf"
                dragMainText={"上传银行卡明细"}
                dragSubText="点击上传文件或拖拽文件到这里,支持 pdf 类型文件"
                onFileChange={selectFile}
            ></Upload>
        </div>
        <br />
        <div className="selectFile">
            <Upload
                draggable={true}
                accept=".pdf"
                dragMainText={"上传信用卡明细"}
                dragSubText="点击上传文件或拖拽文件到这里,支持 pdf 类型文件"
                onFileChange={selectCreditCardFile}
            ></Upload>
        </div>
    </div>
}

interface PreviewTradeDetail {
    date: string
    currency: string
    transactionAmount: number
    balance: number // 余额
    transactionType: string // 交易摘要
    counterParty: string //对手信息
    accountName: string //账户名称。银行卡，结构化存款，信用卡
    uniqId: string // 唯d一键，主键。
    category: string // 分类
    importTime: string // 导入时间
}

function PreviewTable(props: { details: TradeDetail[] }) {
    const { details } = props;
    console.log("PreviewTable", details)
    const previewDetails: PreviewTradeDetail[] = []
    details.forEach(detail => {
        previewDetails.push({
            date: formateDate(detail.date, false),
            currency: detail.currency,
            transactionAmount: detail.transactionAmount,
            balance: detail.balance,
            transactionType: detail.transactionType,
            counterParty: detail.counterParty,
            accountName: detail.accountName,
            uniqId: detail.uniqId,
            category: detail.category,
            importTime: detail.importTime,
        })
    })


    return (
        <div className="tableViewContainer">
            <Table dataSource={previewDetails} pagination={false}>
                {TableHead.map((field) => {
                    return (
                        <Column
                            title={field.title}
                            dataIndex={field.key}
                            key={field.key}
                        />
                    );
                })}
            </Table>
        </div>
    );
}