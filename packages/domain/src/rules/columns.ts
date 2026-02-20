import type { WorkflowColumn } from "../entities/workflow-column.js";

export function sortColumns(cols: WorkflowColumn[]): WorkflowColumn[] {
  return [...cols].sort((a, b) => a.position - b.position);
}

export function findColumn(
  cols: WorkflowColumn[],
  id: string,
): WorkflowColumn | undefined {
  return cols.find((c) => c.id === id);
}

export function getInitialColumn(cols: WorkflowColumn[]): WorkflowColumn {
  const sorted = sortColumns(cols);
  return sorted[0];
}
