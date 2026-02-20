import React, { useRef } from "react";
import { useEntities } from "../hooks/useEntities.js";
import { useEntityDetail } from "../hooks/useEntityDetail.js";
import { EntityFilters } from "./EntityFilters.js";
import { EntityTable } from "./EntityTable.js";
import { EntityDetail } from "./EntityDetail.js";
import { BulkActions } from "./BulkActions.js";
import type { EntityCategory } from "@0x0-gen/sdk";

export interface EntityBrowserProps {
  initialCategory?: string;
  onAddToMapper?: (entityId: string) => void;
  addToast?: (message: string, type: "info" | "success" | "error") => void;
}

export function EntityBrowser({ initialCategory, onAddToMapper, addToast }: EntityBrowserProps) {
  const searchRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;
  const {
    entities,
    total,
    loading,
    filters,
    selectedIds,
    updateFilters,
    clearFilters,
    loadMore,
    refresh,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useEntities();

  const {
    entity: detailEntity,
    loading: detailLoading,
    loadEntity,
    updateTags,
    updateNotes,
    deleteEntity,
    close: closeDetail,
  } = useEntityDetail();

  // Apply initial category filter on first render
  React.useEffect(() => {
    if (initialCategory) {
      updateFilters({ categories: [initialCategory as EntityCategory] });
    }
  }, []);

  const handleEntityClick = (id: string) => {
    loadEntity(id);
  };

  const handleDeleteEntity = async () => {
    await deleteEntity();
    refresh();
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Filters sidebar */}
      <EntityFilters
        filters={filters}
        total={total}
        onUpdate={updateFilters}
        onClear={clearFilters}
        searchRef={searchRef}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <BulkActions
            selectedCount={selectedIds.size}
            selectedIds={selectedIds}
            onClearSelection={clearSelection}
            onRefresh={refresh}
            addToast={addToast}
          />
        )}

        {/* Entity table */}
        <EntityTable
          entities={entities}
          total={total}
          selectedIds={selectedIds}
          loading={loading}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onEntityClick={handleEntityClick}
          onLoadMore={loadMore}
        />
      </div>

      {/* Detail panel */}
      {detailEntity && (
        <EntityDetail
          entity={detailEntity}
          loading={detailLoading}
          onClose={closeDetail}
          onUpdateTags={updateTags}
          onUpdateNotes={updateNotes}
          onDelete={handleDeleteEntity}
          onNavigateEntity={loadEntity}
          onAddToMapper={onAddToMapper}
        />
      )}
    </div>
  );
}
