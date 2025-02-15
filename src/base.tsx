import {
    FieldType,
    IOpenSegment,
    IOpenSegmentType,
    IOpenTextSegment,
    IWidgetTable,
    IWidgetView,
    ViewType,
    IFieldMeta,
    ISingleSelectFieldMeta,
    bitable,
} from "@lark-base-open/js-sdk";

export interface TableInfo {
    tableName: string;
    selectTable: IWidgetTable;
    fieldMetaList: IFieldMeta[];
    fieldOptionMapCategory: { [key: string]: string }
    fieldOptionMapAccount: { [key: string]: string }

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
    const fieldOptionMapCategory: { [key: string]: string } = {}
    const fieldOptionMapAccount: { [key: string]: string } = {}

    for (let key in fieldMetaList) {
        if (fieldMetaList[key].name == "分类") {
            let fieldMeta = fieldMetaList[key] as ISingleSelectFieldMeta
            for (let cKey in fieldMeta.property.options) {
                let option = fieldMeta.property.options[cKey]
                fieldOptionMapCategory[option.name] = option.id
            }
        }
        if (fieldMetaList[key].name == "账户名称") {
            let fieldMeta = fieldMetaList[key] as ISingleSelectFieldMeta
            for (let cKey in fieldMeta.property.options) {
                let option = fieldMeta.property.options[cKey]
                fieldOptionMapAccount[option.name] = option.id
            }
        }
    }


    const ret: TableInfo = {
        tableName: await table.getName(),
        selectTable: table,
        fieldMetaList: fieldMetaList,
        fieldOptionMapCategory: fieldOptionMapCategory,
        fieldOptionMapAccount: fieldOptionMapAccount,
    }

    console.log("getTableInfo", ret)

    return ret;
}