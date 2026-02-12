-- Extend handover_items for AN/AB checkbox system
-- AN = Abgegeben (handed over)
-- AB = Zurück (returned)

ALTER TABLE public.handover_items
ADD COLUMN IF NOT EXISTS checked_an BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS checked_ab BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS item_name TEXT;

-- Migrate existing is_checked to checked_an for backward compatibility
UPDATE public.handover_items
SET checked_an = is_checked
WHERE is_checked = true AND checked_an = false;

COMMENT ON COLUMN public.handover_items.checked_an IS 'Item wurde abgegeben (handed over)';
COMMENT ON COLUMN public.handover_items.checked_ab IS 'Item wurde zurückgegeben (returned)';
COMMENT ON COLUMN public.handover_items.is_custom IS 'Custom user-created item (vs default checklist item)';
COMMENT ON COLUMN public.handover_items.item_name IS 'Name for custom items (e.g., "Teddybär", "Schulranzen")';
