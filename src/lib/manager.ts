import { Prisma } from "@prisma/client";

import { db } from "@/lib/prisma";

type DmmfModel = (typeof Prisma.dmmf.datamodel.models)[number];
type DmmfField = DmmfModel["fields"][number];

export type ManagerFieldInfo = {
  name: string;
  type: string;
  kind: DmmfField["kind"];
  isRequired: boolean;
  hasDefaultValue: boolean;
  isList: boolean;
  isId: boolean;
  isReadOnly: boolean;
  isUpdatedAt: boolean;
};

export type ManagerModelInfo = {
  name: string;
  dbName: string;
  primaryKey: string[];
  fields: ManagerFieldInfo[];
};

export type DeleteImpactResult = {
  model: string;
  pk: Record<string, unknown>;
  summary: string;
  counts: Record<string, number>;
};

const models = Prisma.dmmf.datamodel.models;

const modelMap = new Map(models.map((model) => [model.name, model]));

function toFieldInfo(field: DmmfField): ManagerFieldInfo {
  return {
    name: field.name,
    type: String(field.type),
    kind: field.kind,
    isRequired: field.isRequired,
    hasDefaultValue: field.hasDefaultValue,
    isList: field.isList,
    isId: field.isId,
    isReadOnly: field.isReadOnly,
    isUpdatedAt: "isUpdatedAt" in field ? Boolean(field.isUpdatedAt) : false,
  };
}

function sanitizeSqlIdentifier(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Identificador SQL inválido: ${value}`);
  }
  return value;
}

function serializeValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item));
  }

  if (value && typeof value === "object") {
    const serialized: Record<string, unknown> = {};
    for (const [key, objectValue] of Object.entries(value)) {
      serialized[key] = serializeValue(objectValue);
    }
    return serialized;
  }

  return value;
}

function getModelOrThrow(modelName: string): DmmfModel {
  const model = modelMap.get(modelName);
  if (!model) {
    throw new Error(`Modelo inválido: ${modelName}`);
  }
  return model;
}

function getPrimaryKeyFields(model: DmmfModel): DmmfField[] {
  if (model.primaryKey?.fields?.length) {
    return model.primaryKey.fields.map((fieldName) => {
      const field = model.fields.find((item) => item.name === fieldName);
      if (!field) {
        throw new Error(`Campo da PK não encontrado: ${fieldName}`);
      }
      return field;
    });
  }

  const idFields = model.fields.filter((field) => field.isId);
  if (!idFields.length) {
    throw new Error(`Modelo ${model.name} sem chave primária`);
  }

  return idFields;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "sim", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "nao", "não", "no"].includes(normalized)) {
      return false;
    }
  }

  throw new Error(`Valor booleano inválido: ${String(value)}`);
}

function coerceByFieldType(field: DmmfField, value: unknown): unknown {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  if (field.kind === "enum") {
    return String(value);
  }

  switch (String(field.type)) {
    case "Int": {
      const coerced = typeof value === "number" ? value : Number.parseInt(String(value), 10);
      if (Number.isNaN(coerced)) {
        throw new Error(`Campo ${field.name} espera inteiro`);
      }
      return coerced;
    }
    case "BigInt": {
      try {
        return typeof value === "bigint" ? value : BigInt(String(value));
      } catch {
        throw new Error(`Campo ${field.name} espera BigInt`);
      }
    }
    case "Float":
    case "Decimal": {
      const coerced = typeof value === "number" ? value : Number.parseFloat(String(value));
      if (Number.isNaN(coerced)) {
        throw new Error(`Campo ${field.name} espera número`);
      }
      return coerced;
    }
    case "Boolean":
      return parseBoolean(value);
    case "DateTime": {
      if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
          throw new Error(`Campo ${field.name} espera data válida`);
        }
        return value;
      }

      const parsed = new Date(String(value));
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Campo ${field.name} espera data válida`);
      }
      return parsed;
    }
    case "Json": {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
          return null;
        }
        try {
          return JSON.parse(trimmed);
        } catch {
          throw new Error(`Campo ${field.name} espera JSON válido`);
        }
      }
      return value;
    }
    default:
      return value;
  }
}

function getScalarAndEnumFields(model: DmmfModel): DmmfField[] {
  return model.fields.filter((field) => field.kind === "scalar" || field.kind === "enum");
}

function getEditableFields(model: DmmfModel): DmmfField[] {
  return getScalarAndEnumFields(model).filter(
    (field) =>
      !field.isId &&
      !field.isReadOnly &&
      !("isUpdatedAt" in field && field.isUpdatedAt) &&
      !(field.type === "DateTime" && /^createdAt$/i.test(field.name))
  );
}

function getCreatableFields(model: DmmfModel): DmmfField[] {
  return getScalarAndEnumFields(model).filter(
    (field) => !field.isReadOnly && !("isUpdatedAt" in field && field.isUpdatedAt)
  );
}

function buildWhereClause(
  pkFields: DmmfField[],
  pk: Record<string, unknown>,
  startIndex: number
): { whereClause: string; values: unknown[] } {
  const values: unknown[] = [];

  const whereClause = pkFields
    .map((field, index) => {
      if (!(field.name in pk)) {
        throw new Error(`Valor da chave primária ausente: ${field.name}`);
      }
      values.push(coerceByFieldType(field, pk[field.name]));
      return `"${sanitizeSqlIdentifier(field.name)}" = $${startIndex + index}`;
    })
    .join(" AND ");

  return { whereClause, values };
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[key] = serializeValue(value);
  }

  return normalized;
}

function getTableName(model: DmmfModel): string {
  return sanitizeSqlIdentifier(model.dbName ?? model.name);
}

export function getManagerModels(): ManagerModelInfo[] {
  return models.map((model) => ({
    name: model.name,
    dbName: model.dbName ?? model.name,
    primaryKey: getPrimaryKeyFields(model).map((field) => field.name),
    fields: model.fields.map((field) => toFieldInfo(field)),
  }));
}

export async function listModelRecords(
  modelName: string,
  limit = 50,
  offset = 0
): Promise<{ records: Record<string, unknown>[]; total: number }> {
  const model = getModelOrThrow(modelName);
  const tableName = getTableName(model);
  const fields = getScalarAndEnumFields(model);

  if (!fields.length) {
    return { records: [], total: 0 };
  }

  const safeLimit = Math.max(1, Math.min(500, limit));
  const safeOffset = Math.max(0, offset);

  const columns = fields
    .map((field) => `"${sanitizeSqlIdentifier(field.name)}"`)
    .join(", ");

  const orderByField = sanitizeSqlIdentifier(getPrimaryKeyFields(model)[0].name);

  const recordsQuery = `
    SELECT ${columns}
    FROM "${tableName}"
    ORDER BY "${orderByField}" DESC
    LIMIT $1
    OFFSET $2;
  `;

  const countQuery = `SELECT COUNT(*)::int AS total FROM "${tableName}";`;

  const [recordsResult, countResult] = await Promise.all([
    db.$queryRawUnsafe<Record<string, unknown>[]>(recordsQuery, safeLimit, safeOffset),
    db.$queryRawUnsafe<Array<{ total: number }>>(countQuery),
  ]);

  return {
    records: recordsResult.map((row) => normalizeRow(row)),
    total: countResult[0]?.total ?? 0,
  };
}

export async function updateModelRecord(
  modelName: string,
  pk: Record<string, unknown>,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const model = getModelOrThrow(modelName);
  const tableName = getTableName(model);
  const pkFields = getPrimaryKeyFields(model);
  const editableFields = getEditableFields(model);

  const editableMap = new Map(editableFields.map((field) => [field.name, field]));

  const updates = Object.entries(data).filter(([fieldName]) => editableMap.has(fieldName));

  if (!updates.length) {
    throw new Error("Nenhum campo editável foi enviado");
  }

  const setFragments: string[] = [];
  const setValues: unknown[] = [];

  updates.forEach(([fieldName, value], index) => {
    const field = editableMap.get(fieldName);
    if (!field) {
      return;
    }

    const placeholder = `$${index + 1}`;
    setFragments.push(`"${sanitizeSqlIdentifier(fieldName)}" = ${placeholder}`);
    setValues.push(coerceByFieldType(field, value));
  });

  const { whereClause, values: pkValues } = buildWhereClause(pkFields, pk, setValues.length + 1);

  const query = `
    UPDATE "${tableName}"
    SET ${setFragments.join(", ")}
    WHERE ${whereClause}
    RETURNING *;
  `;

  const result = await db.$queryRawUnsafe<Record<string, unknown>[]>(
    query,
    ...setValues,
    ...pkValues
  );

  if (!result.length) {
    throw new Error("Registro não encontrado para atualização");
  }

  return normalizeRow(result[0]);
}

export async function createModelRecord(
  modelName: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const model = getModelOrThrow(modelName);
  const tableName = getTableName(model);
  const creatableFields = getCreatableFields(model);
  const creatableMap = new Map(creatableFields.map((field) => [field.name, field]));

  const entries = Object.entries(data).filter(([fieldName]) => creatableMap.has(fieldName));

  if (!entries.length) {
    throw new Error("Nenhum campo válido foi enviado para criação");
  }

  const requiredMissing = creatableFields
    .filter((field) => field.isRequired && !field.hasDefaultValue)
    .filter((field) => {
      const incoming = data[field.name];
      if (incoming === undefined || incoming === null) {
        return true;
      }

      if (typeof incoming === "string" && incoming.trim() === "") {
        return true;
      }

      return false;
    });

  if (requiredMissing.length) {
    throw new Error(
      `Campos obrigatórios ausentes: ${requiredMissing.map((field) => field.name).join(", ")}`
    );
  }

  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];

  entries.forEach(([fieldName, value], index) => {
    const field = creatableMap.get(fieldName);
    if (!field || value === undefined) {
      return;
    }

    columns.push(`"${sanitizeSqlIdentifier(fieldName)}"`);
    placeholders.push(`$${index + 1}`);
    values.push(coerceByFieldType(field, value));
  });

  if (!columns.length) {
    throw new Error("Nenhum campo válido foi enviado para criação");
  }

  const query = `
    INSERT INTO "${tableName}" (${columns.join(", ")})
    VALUES (${placeholders.join(", ")})
    RETURNING *;
  `;

  const result = await db.$queryRawUnsafe<Record<string, unknown>[]>(query, ...values);

  if (!result.length) {
    throw new Error("Falha ao criar registro");
  }

  return normalizeRow(result[0]);
}

export async function deleteModelRecord(
  modelName: string,
  pk: Record<string, unknown>
): Promise<void> {
  const model = getModelOrThrow(modelName);
  const tableName = getTableName(model);
  const pkFields = getPrimaryKeyFields(model);

  const { whereClause, values: pkValues } = buildWhereClause(pkFields, pk, 1);

  const query = `
    DELETE FROM "${tableName}"
    WHERE ${whereClause}
    RETURNING *;
  `;

  const result = await db.$queryRawUnsafe<Record<string, unknown>[]>(query, ...pkValues);

  if (!result.length) {
    throw new Error("Registro não encontrado para exclusão");
  }
}

export async function getDeleteImpact(
  modelName: string,
  pk: Record<string, unknown>
): Promise<DeleteImpactResult> {
  getModelOrThrow(modelName);

  if (modelName !== "Comercio") {
    return {
      model: modelName,
      pk,
      summary: "Sem análise detalhada para este modelo. A exclusão seguirá as regras de FK do banco.",
      counts: {},
    };
  }

  const comercioId = typeof pk.id === "string" ? pk.id : "";
  if (!comercioId) {
    throw new Error("Chave primária inválida para Comercio (id obrigatório)");
  }

  const [
    menuCategory,
    product,
    profissional,
    order,
    user,
    businessHours,
    agendaProfissional,
    profissionalProduct,
    bloqueoProfissional,
    orderProduct,
    blockedTimeSlot,
  ] = await Promise.all([
    db.menuCategory.count({ where: { comercioId } }),
    db.product.count({ where: { comercioId } }),
    db.profissional.count({ where: { comercioId } }),
    db.order.count({ where: { comercioId } }),
    db.user.count({ where: { comercioId } }),
    db.businessHours.count({ where: { comercioId } }),
    db.agendaProfissional.count({ where: { profissional: { comercioId } } }),
    db.profissionalProduct.count({ where: { profissional: { comercioId } } }),
    db.bloqueoProfissional.count({ where: { agenda: { profissional: { comercioId } } } }),
    db.orderProduct.count({ where: { order: { comercioId } } }),
    db.blockedTimeSlot.count({ where: { businessHours: { comercioId } } }),
  ]);

  const counts: Record<string, number> = {
    Comercio: 1,
    MenuCategory: menuCategory,
    Product: product,
    Profissional: profissional,
    Order: order,
    User: user,
    BusinessHours: businessHours,
    AgendaProfissional: agendaProfissional,
    ProfissionalProduct: profissionalProduct,
    BloqueoProfissional: bloqueoProfissional,
    OrderProduct: orderProduct,
    BlockedTimeSlot: blockedTimeSlot,
  };

  const details = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([table, value]) => `${table}: ${value}`)
    .join(" | ");

  return {
    model: modelName,
    pk,
    summary: `Exclusão em cascata estimada -> ${details}`,
    counts,
  };
}

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const primitive = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${primitive.replaceAll("\"", '""')}"`;
}

function recordsToCsv(modelName: string, records: Record<string, unknown>[]): string {
  if (!records.length) {
    return `# ${modelName}\nSem registros\n`;
  }

  const headers = Object.keys(records[0]);
  const lines = [headers.join(",")];

  records.forEach((record) => {
    lines.push(headers.map((header) => toCsvValue(record[header])).join(","));
  });

  return `# ${modelName}\n${lines.join("\n")}\n`;
}

function recordsToHtmlTable(modelName: string, records: Record<string, unknown>[]): string {
  if (!records.length) {
    return `<h2>${modelName}</h2><p>Sem registros</p>`;
  }

  const headers = Object.keys(records[0]);

  const headerHtml = headers
    .map((header) => `<th style="border:1px solid #ddd;padding:8px;text-align:left;">${header}</th>`)
    .join("");

  const rowsHtml = records
    .map((record) => {
      const columns = headers
        .map((header) => {
          const value = record[header];
          const printable = value === null || value === undefined ? "" : String(value);
          return `<td style="border:1px solid #ddd;padding:8px;">${printable}</td>`;
        })
        .join("");

      return `<tr>${columns}</tr>`;
    })
    .join("");

  return `<h2>${modelName}</h2><table style="border-collapse:collapse;width:100%;margin-bottom:24px;"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

export async function generateBackup(
  format: "json" | "csv" | "xls",
  modelName?: string
): Promise<{ content: string; filename: string; contentType: string }> {
  const availableModels = getManagerModels();
  const targetModels = modelName
    ? availableModels.filter((model) => model.name === modelName)
    : availableModels;

  if (!targetModels.length) {
    throw new Error("Modelo de backup não encontrado");
  }

  const exportPayload: Record<string, Record<string, unknown>[]> = {};

  for (const model of targetModels) {
    const { records } = await listModelRecords(model.name, 10000, 0);
    exportPayload[model.name] = records;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (format === "json") {
    return {
      content: JSON.stringify(exportPayload, null, 2),
      filename: `backup-${timestamp}.json`,
      contentType: "application/json; charset=utf-8",
    };
  }

  if (format === "csv") {
    const sections = Object.entries(exportPayload).map(([name, records]) =>
      recordsToCsv(name, records)
    );

    return {
      content: sections.join("\n"),
      filename: `backup-${timestamp}.csv`,
      contentType: "text/csv; charset=utf-8",
    };
  }

  const htmlSections = Object.entries(exportPayload).map(([name, records]) =>
    recordsToHtmlTable(name, records)
  );

  return {
    content: `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Backup</title></head><body>${htmlSections.join(
      ""
    )}</body></html>`,
    filename: `backup-${timestamp}.xls`,
    contentType: "application/vnd.ms-excel; charset=utf-8",
  };
}
