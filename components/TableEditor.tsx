/**
 * 复杂表格编辑器组件
 * 提供可视化表格编辑功能，支持合并单元格
 */

import React, { useState, useCallback } from 'react';
import { Plus, Trash2, X, Merge, Grid, Check } from 'lucide-react';

interface Cell {
    content: string;
    colspan: number;
    rowspan: number;
    isHeader: boolean;
}

interface TableEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (adocTable: string) => void;
    initialData?: Cell[][];
    darkMode?: boolean;
}

export const TableEditor: React.FC<TableEditorProps> = ({
    isOpen,
    onClose,
    onInsert,
    initialData,
    darkMode = false,
}) => {
    // 初始化表格数据
    const [cells, setCells] = useState<Cell[][]>(
        initialData || [
            [{ content: 'Header 1', colspan: 1, rowspan: 1, isHeader: true }, { content: 'Header 2', colspan: 1, rowspan: 1, isHeader: true }],
            [{ content: 'Cell 1', colspan: 1, rowspan: 1, isHeader: false }, { content: 'Cell 2', colspan: 1, rowspan: 1, isHeader: false }],
        ]
    );
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const [hasHeaderRow, setHasHeaderRow] = useState(true);

    // 添加行
    const addRow = useCallback(() => {
        const newRow = cells[0].map(() => ({
            content: '',
            colspan: 1,
            rowspan: 1,
            isHeader: false,
        }));
        setCells([...cells, newRow]);
    }, [cells]);

    // 添加列
    const addColumn = useCallback(() => {
        setCells(cells.map((row, rowIndex) => [
            ...row,
            { content: '', colspan: 1, rowspan: 1, isHeader: rowIndex === 0 && hasHeaderRow }
        ]));
    }, [cells, hasHeaderRow]);

    // 删除行
    const deleteRow = useCallback((rowIndex: number) => {
        if (cells.length <= 1) return;
        setCells(cells.filter((_, i) => i !== rowIndex));
    }, [cells]);

    // 删除列
    const deleteColumn = useCallback((colIndex: number) => {
        if (cells[0].length <= 1) return;
        setCells(cells.map(row => row.filter((_, i) => i !== colIndex)));
    }, [cells]);

    // 更新单元格内容
    const updateCell = useCallback((rowIndex: number, colIndex: number, content: string) => {
        const newCells = [...cells];
        newCells[rowIndex] = [...newCells[rowIndex]];
        newCells[rowIndex][colIndex] = { ...newCells[rowIndex][colIndex], content };
        setCells(newCells);
    }, [cells]);

    // 切换单元格选择
    const toggleCellSelection = useCallback((rowIndex: number, colIndex: number) => {
        const key = `${rowIndex}-${colIndex}`;
        const newSelected = new Set(selectedCells);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedCells(newSelected);
    }, [selectedCells]);

    // 合并选中的单元格
    const mergeCells = useCallback(() => {
        if (selectedCells.size < 2) return;

        const selected = Array.from(selectedCells).map(key => {
            const [row, col] = key.split('-').map(Number);
            return { row, col };
        });

        // 计算边界
        const minRow = Math.min(...selected.map(s => s.row));
        const maxRow = Math.max(...selected.map(s => s.row));
        const minCol = Math.min(...selected.map(s => s.col));
        const maxCol = Math.max(...selected.map(s => s.col));

        const colspan = maxCol - minCol + 1;
        const rowspan = maxRow - minRow + 1;

        // 简化实现：合并后内容取第一个单元格
        const newCells = cells.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
                if (rowIndex === minRow && colIndex === minCol) {
                    return { ...cell, colspan, rowspan };
                }
                if (rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol) {
                    return { ...cell, colspan: 0, rowspan: 0 }; // 标记为被合并
                }
                return cell;
            })
        );

        setCells(newCells);
        setSelectedCells(new Set());
    }, [cells, selectedCells]);

    // 生成 AsciiDoc 表格
    const generateAdocTable = useCallback((): string => {
        const colCount = cells[0].length;
        let adoc = `[cols="${Array(colCount).fill('1').join(',')}"${hasHeaderRow ? ', options="header"' : ''}]\n`;
        adoc += '|===\n';

        cells.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell.colspan === 0 && cell.rowspan === 0) return; // 跳过被合并的单元格

                let prefix = '';
                if (cell.colspan > 1) prefix += `${cell.colspan}+`;
                if (cell.rowspan > 1) prefix += `.${cell.rowspan}+`;

                adoc += `${prefix}| ${cell.content}\n`;
            });
            adoc += '\n';
        });

        adoc += '|===';
        return adoc;
    }, [cells, hasHeaderRow]);

    // 插入表格
    const handleInsert = useCallback(() => {
        const adocTable = generateAdocTable();
        onInsert(adocTable);
        onClose();
    }, [generateAdocTable, onInsert, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden flex flex-col ${darkMode ? 'bg-slate-800' : 'bg-white'
                }`}>
                {/* 标题栏 */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        <Grid size={20} className="text-blue-500" />
                        <h2 className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                            Table Editor
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                    >
                        <X size={20} className={darkMode ? 'text-slate-400' : 'text-gray-500'} />
                    </button>
                </div>

                {/* 工具栏 */}
                <div className={`flex items-center gap-2 px-4 py-2 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'
                    }`}>
                    <button
                        onClick={addRow}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Plus size={14} /> Row
                    </button>
                    <button
                        onClick={addColumn}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Plus size={14} /> Column
                    </button>
                    <div className={`w-px h-6 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <button
                        onClick={mergeCells}
                        disabled={selectedCells.size < 2}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${selectedCells.size >= 2
                                ? darkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-600'
                                : darkMode ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400'
                            }`}
                    >
                        <Merge size={14} /> Merge
                    </button>
                    <div className="flex-1" />
                    <label className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'
                        }`}>
                        <input
                            type="checkbox"
                            checked={hasHeaderRow}
                            onChange={(e) => setHasHeaderRow(e.target.checked)}
                            className="rounded"
                        />
                        Header row
                    </label>
                </div>

                {/* 表格编辑区 */}
                <div className="flex-1 overflow-auto p-4">
                    <table className={`border-collapse w-full ${darkMode ? 'border-slate-600' : 'border-gray-300'
                        }`}>
                        <tbody>
                            {cells.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {/* 行删除按钮 */}
                                    <td className="w-8 p-0">
                                        <button
                                            onClick={() => deleteRow(rowIndex)}
                                            className={`p-1 opacity-30 hover:opacity-100 ${darkMode ? 'text-red-400' : 'text-red-500'
                                                }`}
                                            title="Delete row"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                    {row.map((cell, colIndex) => {
                                        if (cell.colspan === 0 && cell.rowspan === 0) return null;

                                        const isSelected = selectedCells.has(`${rowIndex}-${colIndex}`);

                                        return (
                                            <td
                                                key={colIndex}
                                                colSpan={cell.colspan}
                                                rowSpan={cell.rowspan}
                                                className={`border p-0 relative ${darkMode ? 'border-slate-600' : 'border-gray-300'
                                                    } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                                                onClick={(e) => {
                                                    if (e.ctrlKey || e.metaKey) {
                                                        toggleCellSelection(rowIndex, colIndex);
                                                    }
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    value={cell.content}
                                                    onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                                    className={`w-full px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-white text-gray-800'
                                                        } ${cell.isHeader ? 'font-semibold' : ''}`}
                                                    placeholder={cell.isHeader ? 'Header' : 'Cell'}
                                                />
                                                {cell.colspan > 1 || cell.rowspan > 1 ? (
                                                    <span className={`absolute top-0.5 right-0.5 text-[10px] px-1 rounded ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        {cell.colspan > 1 && `${cell.colspan}←`}
                                                        {cell.rowspan > 1 && `${cell.rowspan}↓`}
                                                    </span>
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {/* 列删除按钮行 */}
                            <tr>
                                <td className="w-8" />
                                {cells[0].map((_, colIndex) => (
                                    <td key={colIndex} className="p-1 text-center">
                                        <button
                                            onClick={() => deleteColumn(colIndex)}
                                            className={`p-1 opacity-30 hover:opacity-100 ${darkMode ? 'text-red-400' : 'text-red-500'
                                                }`}
                                            title="Delete column"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 底部操作 */}
                <div className={`flex items-center justify-between px-4 py-3 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'
                    }`}>
                    <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        Ctrl+Click to select cells for merging
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded text-sm ${darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleInsert}
                            className="px-4 py-2 rounded text-sm bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1"
                        >
                            <Check size={14} /> Insert Table
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
