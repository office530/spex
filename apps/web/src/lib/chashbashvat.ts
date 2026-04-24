// Chashbashvat integration — frontend stubs.
//
// The actual HTTP calls to Chashbashvat happen in a future backend worker
// (per BLUEPRINT §6.4). From the frontend we only ENQUEUE sync jobs;
// the worker will dequeue them and call the real API once that integration
// is configured.
//
// We still model the request payloads here so the contract is explicit
// and a future worker can be type-safe against this shape.

import { supabase } from './supabase';

export type SyncEntity =
  | 'client'
  | 'supplier'
  | 'customer_invoice'
  | 'customer_receipt'
  | 'supplier_invoice'
  | 'purchase_order';

export type SyncOperation = 'create' | 'update' | 'cancel';

export type SyncStatus = 'pending' | 'processing' | 'synced' | 'failed';

// Payload shapes the future worker will translate into Chashbashvat
// REST calls. Kept optional / loose because the exact field names depend
// on the Chashbashvat integration call (see BLUEPRINT §6.4).
export interface CustomerInvoicePayload {
  amount: number;
  kind: 'tax_invoice' | 'deal_invoice';
  due_date: string | null;
  issued_at: string | null;
  client_chashbashvat_id?: string | null;
  milestone_name?: string | null;
  notes?: string | null;
}

export interface CustomerReceiptPayload {
  amount: number;
  received_at: string;
  invoice_chashbashvat_id?: string | null;
}

export interface SupplierInvoicePayload {
  amount: number;
  invoice_number: string | null;
  invoice_date: string | null;
  supplier_chashbashvat_id?: string | null;
  file_url?: string | null;
  notes?: string | null;
}

export interface PurchaseOrderPayload {
  total_amount: number;
  supplier_chashbashvat_id?: string | null;
  issued_at: string | null;
  line_items?: Array<{ description: string; quantity: number | null; unit_price: number | null }>;
  notes?: string | null;
}

export interface ClientPayload {
  company_name: string;
  primary_contact_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface SupplierPayload {
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
}

export type SyncPayload =
  | CustomerInvoicePayload
  | CustomerReceiptPayload
  | SupplierInvoicePayload
  | PurchaseOrderPayload
  | ClientPayload
  | SupplierPayload
  | Record<string, unknown>;

export interface EnqueueArgs {
  entityType: SyncEntity;
  entityId: string;
  operation: SyncOperation;
  payload: SyncPayload;
}

/**
 * Enqueue a Chashbashvat sync job.
 *
 * Inserts a row into `chashbashvat_sync_jobs`. A DB trigger flips the
 * mirrored entity's `chashbashvat_sync_status` to 'pending'.
 *
 * Returns the new job id, or throws if RLS / DB rejects.
 */
export async function enqueueChashbashvatSync(args: EnqueueArgs): Promise<string> {
  const { data, error } = await supabase
    .from('chashbashvat_sync_jobs')
    .insert({
      entity_type: args.entityType,
      entity_id: args.entityId,
      operation: args.operation,
      payload: args.payload,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}
