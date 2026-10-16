import type { TableHTMLAttributes } from "react";

export function DataTable({ className = "", ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <div className="table-scroll"><table className={`data-table ${className}`.trim()} {...props} /></div>;
}
