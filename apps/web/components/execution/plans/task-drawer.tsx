"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DetailDrawer,
  DrawerButton,
  DrawerField,
  DrawerInput,
  DrawerSelect,
  DrawerTextarea
} from "@/components/ui/detail-drawer";
import { Task } from "./plan-view";

interface TaskDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onToggleComplete: (taskId: string) => Promise<void>;
}

export function TaskDrawer({ task, isOpen, onClose, onSave, onToggleComplete }: TaskDrawerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<number>(3);
  const [dayNumber, setDayNumber] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority || 3);
      setDayNumber(task.day_number || 1);
    }
  }, [task]);

  const handleSave = useCallback(async () => {
    if (!task) return;

    setSaving(true);
    try {
      await onSave(task.id, {
        title,
        description: description || undefined,
        priority,
        day_number: dayNumber
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [task, title, description, priority, dayNumber, onSave, onClose]);

  const handleToggle = useCallback(async () => {
    if (!task) return;
    setSaving(true);
    try {
      await onToggleComplete(task.id);
    } finally {
      setSaving(false);
    }
  }, [task, onToggleComplete]);

  const isCompleted = task?.status === "completed" || task?.status === "succeeded";

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Task"
      subtitle={task ? `Day ${task.day_number || 1}` : undefined}
      footer={
        <div className="flex items-center justify-between">
          <DrawerButton
            variant={isCompleted ? "secondary" : "primary"}
            onClick={handleToggle}
            loading={saving}
          >
            {isCompleted ? "Mark Incomplete" : "Mark Complete"}
          </DrawerButton>
          <div className="flex items-center gap-2">
            <DrawerButton variant="secondary" onClick={onClose}>
              Cancel
            </DrawerButton>
            <DrawerButton variant="primary" onClick={handleSave} loading={saving}>
              Save Changes
            </DrawerButton>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Status indicator */}
        <div
          className={`flex items-center gap-3 rounded-lg p-3 ${
            isCompleted
              ? "bg-emerald-500/10 border border-emerald-500/30"
              : "bg-surface-muted border border-edge-subtle"
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              isCompleted ? "bg-emerald-500/20" : "bg-surface-elevated"
            }`}
          >
            {isCompleted ? (
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="h-3 w-3 rounded-full border-2 border-edge-muted" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-fg-primary">
              {isCompleted ? "Task Completed" : "Task Pending"}
            </p>
            <p className="text-xs text-fg-muted">
              {isCompleted
                ? "This task has been marked as done"
                : "Click the button below to complete this task"}
            </p>
          </div>
        </div>

        {/* Title */}
        <DrawerField label="Task Title">
          <DrawerInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title..."
          />
        </DrawerField>

        {/* Description */}
        <DrawerField label="Description">
          <DrawerTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details about this task..."
            rows={4}
          />
        </DrawerField>

        {/* Day & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <DrawerField label="Day">
            <DrawerSelect
              value={dayNumber}
              onChange={(e) => setDayNumber(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <option key={day} value={day}>
                  Day {day}
                </option>
              ))}
            </DrawerSelect>
          </DrawerField>

          <DrawerField label="Priority">
            <DrawerSelect
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              <option value={1}>High</option>
              <option value={2}>Medium</option>
              <option value={3}>Normal</option>
              <option value={4}>Low</option>
            </DrawerSelect>
          </DrawerField>
        </div>
      </div>
    </DetailDrawer>
  );
}
