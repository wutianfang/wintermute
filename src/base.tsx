import {
  FieldType,
  IOpenSegment,
  IOpenSegmentType,
  IOpenTextSegment,
  IWidgetTable,
  IWidgetView,
  ViewType,
  IFieldMeta,
  bitable,
} from "@lark-base-open/js-sdk";

export interface TableInfo {
  tableName: string;
  selectTable: IWidgetTable;
  fieldMetaList: IFieldMeta[];
}


export async function getTableInfo() {
  const selection = await bitable.base.getSelection();
  if (!selection.tableId) {
    return null;
  }
  const table: IWidgetTable = await bitable.base.getTableById(
    selection.tableId
  );
  const tableName: string = await table.getName()

  const fieldMetaList: IFieldMeta[] = await table.getFieldMetaList()
  const ret: TableInfo = {} as TableInfo
  ret.tableName = tableName
  ret.selectTable = table
  ret.fieldMetaList = fieldMetaList
  console.log("getTableInfo", ret)

  return ret;
}