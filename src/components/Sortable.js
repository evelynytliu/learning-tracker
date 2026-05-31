'use client';

import { useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

// 通用「拖曳排序」清單，支援觸控與滑鼠。
// 被拖的項目會浮起（陰影 + 放大），其他項目滑動讓位。
//
// props:
//   items: [{id, ...}]
//   onReorder(newItems): 放開時呼叫，傳入新順序
//   renderItem(item): 回傳該列「內容」(不含拖曳把手與外框)
//   disabled?: 關閉拖曳
export default function Sortable({ items, onReorder, renderItem, disabled }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [offset, setOffset] = useState(0);
  const listRef = useRef(null);
  const meta = useRef({ startY: 0, rects: [], rowH: 0 });

  function targetIndex() {
    const { rects } = meta.current;
    if (!rects.length || dragIndex === null) return dragIndex;
    const r = rects[dragIndex];
    const center = r.top + r.height / 2 + offset;
    let idx = 0;
    for (let i = 0; i < rects.length; i++) {
      const c = rects[i].top + rects[i].height / 2;
      if (center > c) idx = i;
    }
    return idx;
  }

  function onPointerDown(e, index) {
    if (disabled) return;
    e.preventDefault();
    const children = Array.from(listRef.current.children);
    const rects = children.map((el) => el.getBoundingClientRect());
    meta.current = {
      startY: e.clientY,
      rects,
      rowH: rects[index]?.height || 0,
    };
    setDragIndex(index);
    setOffset(0);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  }

  function onPointerMove(e) {
    if (dragIndex === null) return;
    setOffset(e.clientY - meta.current.startY);
  }

  function onPointerUp() {
    if (dragIndex === null) return;
    const to = targetIndex();
    if (to !== dragIndex) {
      const next = [...items];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    }
    setDragIndex(null);
    setOffset(0);
  }

  const to = dragIndex === null ? null : targetIndex();
  const rowH = meta.current.rowH;

  return (
    <ul ref={listRef} className="flex flex-col gap-2">
      {items.map((item, i) => {
        const isDragging = i === dragIndex;
        let translateY = 0;
        if (dragIndex !== null && !isDragging) {
          if (dragIndex < to && i > dragIndex && i <= to) translateY = -rowH - 8;
          else if (dragIndex > to && i >= to && i < dragIndex) translateY = rowH + 8;
        }
        return (
          <li
            key={item.id}
            style={{
              transform: isDragging
                ? `translateY(${offset}px) scale(1.02)`
                : `translateY(${translateY}px)`,
              transition: isDragging ? 'none' : 'transform 160ms ease',
              zIndex: isDragging ? 20 : 1,
              position: 'relative',
              boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.18)' : 'none',
              touchAction: 'pan-y',
            }}
            className={`flex items-center gap-1 rounded-lg ${
              isDragging ? 'bg-white' : 'bg-slate-50'
            }`}
          >
            {!disabled && (
              <button
                type="button"
                onPointerDown={(e) => onPointerDown(e, i)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="flex h-10 w-8 flex-shrink-0 cursor-grab touch-none items-center justify-center text-slate-300 active:cursor-grabbing"
                aria-label="拖曳排序"
                style={{ touchAction: 'none' }}
              >
                <GripVertical size={18} />
              </button>
            )}
            <div className="min-w-0 flex-1">{renderItem(item)}</div>
          </li>
        );
      })}
    </ul>
  );
}
