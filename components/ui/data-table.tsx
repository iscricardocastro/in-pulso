"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DataTableMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyState: ReactNode;
  globalFilter?: string;
  header?: ReactNode;
  noResultsText?: string;
  pageSizeOptions?: number[];
};

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyState,
  globalFilter,
  header,
  noResultsText = "Sin resultados para esta busqueda.",
  pageSizeOptions = [10, 25, 100],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageSizeOption, setPageSizeOption] = useState(String(pageSizeOptions[0] ?? 10));

  const initialPageSize = pageSizeOptions[0] ?? 10;
  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    initialState: { pagination: { pageIndex: 0, pageSize: initialPageSize } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    if (pageSizeOption === "all") {
      table.setPageSize(Math.max(data.length, 1));
    }
  }, [data.length, pageSizeOption, table]);

  const filteredRows = table.getFilteredRowModel().rows.length;
  const pageRows = table.getRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const firstRow = filteredRows === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = filteredRows === 0 ? 0 : firstRow + pageRows - 1;

  return (
    <Card>
      {header ? <CardHeader>{header}</CardHeader> : null}
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="p-5">{emptyState}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta as DataTableMeta | undefined;

                      return (
                        <TableHead
                          key={header.id}
                          className={cn(header.column.getCanSort() && "select-none", meta?.headerClassName)}
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              className="motion-press inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: <ArrowUp className="h-3.5 w-3.5" />,
                                desc: <ArrowDown className="h-3.5 w-3.5" />,
                              }[header.column.getIsSorted() as string] ?? <ArrowUpDown className="h-3.5 w-3.5 opacity-45" />}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {pageRows === 0 ? (
                  <TableRow>
                    <TableCell className="h-24 text-center text-muted-foreground" colSpan={table.getAllLeafColumns().length}>
                      {noResultsText}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as DataTableMeta | undefined;

                        return (
                          <TableCell key={cell.id} className={meta?.cellClassName}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {data.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {firstRow}-{lastRow} de {filteredRows}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filas</span>
              <Select
                className="w-28"
                value={pageSizeOption}
                onChange={(event) => {
                  const value = event.target.value;
                  setPageSizeOption(value);
                  table.setPageSize(value === "all" ? Math.max(data.length, 1) : Number(value));
                }}
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value="all">Todos</option>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-1">
              <Button disabled={!table.getCanPreviousPage()} size="icon" type="button" variant="ghost" onClick={() => table.setPageIndex(0)}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button disabled={!table.getCanPreviousPage()} size="icon" type="button" variant="ghost" onClick={() => table.previousPage()}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-24 text-center text-sm text-muted-foreground">
                {table.getPageCount() === 0 ? 0 : pageIndex + 1} / {table.getPageCount()}
              </span>
              <Button disabled={!table.getCanNextPage()} size="icon" type="button" variant="ghost" onClick={() => table.nextPage()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                disabled={!table.getCanNextPage()}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
