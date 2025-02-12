import React, { useEffect, useState, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { Alert, AlertProps } from 'antd';
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
  IOpenCellValue,

} from "@lark-base-open/js-sdk";

import { TradeDetail, TradeHead, TableHead, parseBankCard, formateDate } from "./trade.js"
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
}

function LoadApp() {

  const [tableInfo, setTableInfo] = useState<TableInfo>({} as TableInfo)
  const [state, setState] = useState<LoadStat>(LoadStat.Init);
  const [msgs, setmsgs] = useState<string[]>([] as string[]);
  let detailsRef = useRef<TradeDetail[]>([] as TradeDetail[])
  let errors: string[] = [] as string[]


  const selectFile = useCallback((files: File[]) => {
    setState(LoadStat.Loading)

    pdfToText(files[0]).then((textContent) => {
      ({ details: detailsRef.current, errors } = parseBankCard(textContent))
      console.log(detailsRef.current)
      setState(LoadStat.Preview)
    })

  }, []);

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
    detailsRef.current.forEach((detail) => {

      let v: { [fieldId: string]: IOpenCellValue; } = {}
      Object.entries(detail).map(([key, value]) => {
        if (typeof value == "number") {
          v[fieldMapId[key]] = value
        } else if (typeof value === "string") {
          v[fieldMapId[key]] = [
            { type: IOpenSegmentType.Text, text: value },
          ];
        } else if (value instanceof Date) {
          v[fieldMapId[key]] = value.getTime()
        }

      })
      records.push({
        fields: v
      })
    })
    records = [records[0],records[1],records[2]]
    console.log("records", records)
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


  switch (state) {
    case LoadStat.Loading:
      return <Alert message="导入中"></Alert>

    case LoadStat.Preview:
      return (<div>
        <Alert message={"预览导入 " + tableInfo.tableName + " 的数据"}></Alert>
        <button onClick={importFile}>导入</button>
        <PreviewTable details={detailsRef.current}></PreviewTable>
      </div>)

    case LoadStat.Done:
      return (<div>
        <div >导入完成</div>
        <button onClick={()=>{setState(LoadStat.Init)}}>继续导入</button>
      </div>)
  }


  return <div>
    <Alert message={"向表格: " + tableInfo.tableName + " 导入数据"}></Alert>
    <div className="selectFile">
      <Upload
        draggable={true}
        accept=".pdf"
        dragMainText={"点击上传文件或拖拽文件到这里"}
        dragSubText="支持 pdf 类型文件"
        onFileChange={selectFile}
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