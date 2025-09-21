// packages/data-access/src/actions/export.js
import { verifyAdmin } from '../../../auth/src/index.js'
import {
  Opportunity,
  Subscriber,
  SynthesizedEvent,
  Article,
} from '../../../models/src/index.js'
import { buildQuery } from '../queryBuilder.js'
import dbConnect from '../dbConnect.js'

// --- Helper Functions ---

function escapeXml(str) {
  if (str === null || str === undefined) return ''
  return String(str).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
    }
  })
}

function convertToCSV(data, columns) {
  if (!data || data.length === 0) return ''
  const headers = columns.map((c) => c.header)
  const csvRows = [headers.join(',')]
  for (const row of data) {
    const values = headers.map((header) => {
      const column = columns.find((c) => c.header === header)
      let value = column ? row[column.key] : ''
      if (column && column.key.includes('.')) {
        value = column.key.split('.').reduce((o, i) => (o ? o[i] : ''), row)
      }
      if (value === null || value === undefined) value = ''
      if (Array.isArray(value)) value = value.join('; ')
      const stringValue = String(value)
      const escaped = stringValue.replace(/"/g, '""')
      if (escaped.includes(',')) return `"${escaped}"`
      return escaped
    })
    csvRows.push(values.join(','))
  }
  return csvRows.join('\n')
}

function convertToExcelXML(data, columns) {
  let xml = `<?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
     xmlns:o="urn:schemas-microsoft-com:office:office"
     xmlns:x="urn:schemas-microsoft-com:office:excel"
     xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
     xmlns:html="http://www.w3.org/TR/REC-html40">
     <Worksheet ss:Name="Export">
      <Table>`

  xml += '<Row>'
  columns.forEach((col) => {
    xml += `<Cell ss:StyleID="s1"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>`
  })
  xml += '</Row>'

  data.forEach((row) => {
    xml += '<Row>'
    columns.forEach((col) => {
      let value = col.key.split('.').reduce((o, i) => (o ? o[i] : ''), row)
      if (value === null || value === undefined) value = ''
      if (Array.isArray(value)) value = value.join('; ')

      let type = typeof value === 'number' ? 'Number' : 'String'
      if (value instanceof Date) {
        type = 'DateTime'
        value = value.toISOString()
      }

      xml += `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`
    })
    xml += '</Row>'
  })

  xml += `</Table><Styles><Style ss:ID="s1"><Font ss:Bold="1"/></Style></Styles></Worksheet></Workbook>`
  return xml
}

// --- Generic Exporter ---
async function genericExporter({ model, columns, filters, sort, fileType }) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }
  try {
    await dbConnect()
    const { queryFilter, sortOptions } = await buildQuery(model, {
      filters,
      sort,
      baseQuery: {},
    })
    const dataToExport = await model.find(queryFilter).sort(sortOptions).lean()

    if (fileType === 'csv') {
      const csv = convertToCSV(dataToExport, columns)
      return { success: true, data: csv, contentType: 'text/csv' }
    } else if (fileType === 'xlsx') {
      const xml = convertToExcelXML(dataToExport, columns)
      return { success: true, data: xml, contentType: 'application/vnd.ms-excel' }
    }
    return { success: false, error: 'Invalid file type.' }
  } catch (e) {
    return { success: false, error: `Failed to generate export: ${e.message}` }
  }
}

// --- Specific Implementations ---

export const exportOpportunitiesToCSV = async (params) =>
  genericExporter({
    ...params,
    model: Opportunity,
    columns: [
      { header: 'Country', key: 'basedIn' },
      { header: 'City', key: 'city' },
      { header: 'Contact', key: 'reachOutTo' },
      { header: 'Wealth ($M)', key: 'likelyMMDollarWealth' },
      { header: 'Email', key: 'contactDetails.email' },
      { header: 'Reason', key: 'whyContact' },
      { header: 'Created', key: 'createdAt' },
    ],
    fileType: 'csv',
  })

export const exportOpportunitiesToXLSX = async (params) =>
  genericExporter({
    ...params,
    model: Opportunity,
    columns: [
      { header: 'Country', key: 'basedIn' },
      { header: 'City', key: 'city' },
      { header: 'Contact', key: 'reachOutTo' },
      { header: 'Wealth ($M)', key: 'likelyMMDollarWealth' },
      { header: 'Email', key: 'contactDetails.email' },
      { header: 'Reason', key: 'whyContact' },
      { header: 'Created', key: 'createdAt' },
    ],
    fileType: 'xlsx',
  })

export const exportUsersToCSV = async (params) =>
  genericExporter({
    ...params,
    model: Subscriber,
    columns: [
      { header: 'Email', key: 'email' },
      { header: 'FirstName', key: 'firstName' },
      { header: 'LastName', key: 'lastName' },
      { header: 'IsActive', key: 'isActive' },
      { header: 'Role', key: 'role' },
      { header: 'Tier', key: 'subscriptionTier' },
      { header: 'Created', key: 'createdAt' },
    ],
    fileType: 'csv',
  })

export const exportUsersToXLSX = async (params) =>
  genericExporter({
    ...params,
    model: Subscriber,
    columns: [
      { header: 'Email', key: 'email' },
      { header: 'FirstName', key: 'firstName' },
      { header: 'LastName', key: 'lastName' },
      { header: 'IsActive', key: 'isActive' },
      { header: 'Role', key: 'role' },
      { header: 'Tier', key: 'subscriptionTier' },
      { header: 'Created', key: 'createdAt' },
    ],
    fileType: 'xlsx',
  })

export const exportEventsToCSV = async (params) =>
  genericExporter({
    ...params,
    model: SynthesizedEvent,
    columns: [
      { header: 'Headline', key: 'synthesized_headline' },
      { header: 'Summary', key: 'synthesized_summary' },
      { header: 'Score', key: 'highest_relevance_score' },
      { header: 'Country', key: 'country' },
      { header: 'Created', key: 'createdAt' },
    ],
    fileType: 'csv',
  })

export const exportEventsToXLSX = async (params) =>
  genericExporter({
    ...params,
    model: SynthesizedEvent,
    columns: [
      { header: 'Headline', key: 'synthesized_headline' },
      { header: 'Summary', key: 'synthesized_summary' },
      { header: 'Score', key: 'highest_relevance_score' },
      { header: 'Country', key: 'country' },
      { header: 'Created', key: 'createdAt' },
    ],
    fileType: 'xlsx',
  })

export const exportArticlesToCSV = async (params) =>
  genericExporter({
    ...params,
    model: Article,
    columns: [
      { header: 'Headline', key: 'headline' },
      { header: 'Newspaper', key: 'newspaper' },
      { header: 'Country', key: 'country' },
      { header: 'Headline Score', key: 'relevance_headline' },
      { header: 'Article Score', key: 'relevance_article' },
      { header: 'Link', key: 'link' },
      { header: 'Created', key: 'createdAt' },
    ],
    fileType: 'csv',
  })

export const exportArticlesToXLSX = async (params) =>
  genericExporter({
    ...params,
    model: Article,
    columns: [
      { header: 'Headline', key: 'headline' },
      { header: 'Newspaper', key: 'newspaper' },
      { header: 'Country', key: 'country' },
      { header: 'Headline Score', key: 'relevance_headline' },
      { header: 'Article Score', key: 'relevance_article' },
      { header: 'Link', key: 'link' },
      { header: 'Created', key: 'createdAt' },
    ],
    fileType: 'xlsx',
  })


// --- Generic Exporter ---
export async function generateExport({ model, columns, filters, sort, fileType }) {
    await dbConnect();
    const { queryFilter, sortOptions } = await buildQuery(model, { filters, sort, baseQuery: {} });
    const dataToExport = await model.find(queryFilter).sort(sortOptions).lean();

    if (fileType === 'csv') {
        const csv = convertToCSV(dataToExport, columns);
        return { success: true, data: csv, contentType: 'text/csv', extension: 'csv' };
    } else if (fileType === 'xlsx') {
        const xml = convertToExcelXML(dataToExport, columns);
        return { success: true, data: xml, contentType: 'application/vnd.ms-excel', extension: 'xls' };
    }
    throw new Error('Invalid file type specified for export.');
}