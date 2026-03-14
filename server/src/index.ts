import cors from 'cors';
import express, { Request, Response } from 'express';
import { z } from 'zod';

type AssetStatus = 'ASSIGNED' | 'SPARE' | 'OBSOLETE';
type AssetType = 'ROUTER' | 'POWERBANK' | 'UPS' | 'LAPTOP' | 'DESKTOP' | 'PRINTER' | 'MONITOR' | 'TABLET' | 'SWITCHES';

type Asset = {
  id: number;
  assetTag: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  serialNumber: string | null;
  assignedTo: string | null;
  purchaseDate: string | null;
  value: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const now = () => new Date().toISOString();

const STATUSES = ['ASSIGNED', 'SPARE', 'OBSOLETE'] as const;
const TYPES = ['ROUTER', 'POWERBANK', 'UPS', 'LAPTOP', 'DESKTOP', 'PRINTER', 'MONITOR', 'TABLET', 'SWITCHES'] as const;

const assets: Asset[] = [
  {
    id: 1,
    assetTag: 'LAP-1001',
    name: 'Dell Latitude 5440',
    type: 'LAPTOP',
    status: 'ASSIGNED',
    serialNumber: 'DL5440-ABC123',
    assignedTo: 'Alex Johnson',
    purchaseDate: '2025-03-15',
    value: 68500.0,
    notes: null,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 2,
    assetTag: 'MON-2001',
    name: 'LG 27" 4K Monitor',
    type: 'MONITOR',
    status: 'SPARE',
    serialNumber: 'LG27-XYZ789',
    assignedTo: null,
    purchaseDate: '2025-06-01',
    value: 18900.0,
    notes: 'Warehouse shelf B3',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 3,
    assetTag: 'DSK-3001',
    name: 'HP ProDesk 400 G9',
    type: 'DESKTOP',
    status: 'OBSOLETE',
    serialNumber: 'HP400G9-DEF456',
    assignedTo: null,
    purchaseDate: '2024-11-20',
    value: 48500.0,
    notes: 'Scheduled for disposal',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 4,
    assetTag: 'RTR-4001',
    name: 'Cisco RV340 Router',
    type: 'ROUTER',
    status: 'ASSIGNED',
    serialNumber: 'CSCO-RV340-GHI012',
    assignedTo: 'Server Room A',
    purchaseDate: '2025-01-10',
    value: 15200.0,
    notes: null,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 5,
    assetTag: 'UPS-5001',
    name: 'APC Smart-UPS 1500VA',
    type: 'UPS',
    status: 'SPARE',
    serialNumber: 'APC1500-JKL345',
    assignedTo: null,
    purchaseDate: '2025-02-18',
    value: 32000.0,
    notes: 'Backup unit',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 6,
    assetTag: 'PRN-6001',
    name: 'HP LaserJet Pro M404n',
    type: 'PRINTER',
    status: 'ASSIGNED',
    serialNumber: 'HPLJ-M404-MNO678',
    assignedTo: 'Finance Dept',
    purchaseDate: '2024-08-05',
    value: 22500.0,
    notes: null,
    createdAt: now(),
    updatedAt: now(),
  },
];

let nextId = assets.length + 1;

const app = express();
app.use(cors());
app.use(express.json());

const createAssetSchema = z.object({
  assetTag: z.string().min(2).max(30),
  name: z.string().min(2).max(120),
  type: z.enum(TYPES),
  status: z.enum(STATUSES).default('SPARE'),
  serialNumber: z.string().trim().max(60).optional().nullable(),
  assignedTo: z.string().trim().max(120).optional().nullable(),
  purchaseDate: z.string().max(20).optional().nullable(),
  value: z.number().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const updateAssetSchema = z.object({
  assetTag: z.string().min(2).max(30).optional(),
  name: z.string().min(2).max(120).optional(),
  type: z.enum(TYPES).optional(),
  status: z.enum(STATUSES).optional(),
  serialNumber: z.string().trim().max(60).optional().nullable(),
  assignedTo: z.string().trim().max(120).optional().nullable(),
  purchaseDate: z.string().max(20).optional().nullable(),
  value: z.number().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

function findAsset(id: number) {
  return assets.find((item) => item.id === id);
}

function parseId(raw: string | string[], res: Response): number | null {
  if (Array.isArray(raw)) raw = raw[0];
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ message: 'Invalid asset id' });
    return null;
  }
  return id;
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/assets', (_req: Request, res: Response) => {
  const sorted = [...assets].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json(sorted);
});

app.get('/api/assets/:id', (req: Request, res: Response) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;

  const asset = findAsset(id);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  return res.json(asset);
});

app.post('/api/assets', (req: Request, res: Response) => {
  const parsed = createAssetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid asset payload', errors: parsed.error.flatten() });
  }

  const duplicate = assets.some(
    (a) => a.assetTag.toLowerCase() === parsed.data.assetTag.toLowerCase(),
  );
  if (duplicate) {
    return res.status(409).json({ message: 'Asset tag already exists' });
  }

  const timestamp = now();
  const newAsset: Asset = {
    id: nextId,
    assetTag: parsed.data.assetTag,
    name: parsed.data.name,
    type: parsed.data.type,
    status: parsed.data.status,
    serialNumber: parsed.data.serialNumber ?? null,
    assignedTo: parsed.data.assignedTo ?? null,
    purchaseDate: parsed.data.purchaseDate ?? null,
    value: parsed.data.value ?? null,
    notes: parsed.data.notes ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  assets.unshift(newAsset);
  nextId += 1;
  return res.status(201).json(newAsset);
});

app.put('/api/assets/:id', (req: Request, res: Response) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;

  const parsed = updateAssetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid update payload', errors: parsed.error.flatten() });
  }

  const asset = findAsset(id);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });

  if (parsed.data.assetTag && parsed.data.assetTag.toLowerCase() !== asset.assetTag.toLowerCase()) {
    const duplicate = assets.some(
      (a) => a.id !== id && a.assetTag.toLowerCase() === parsed.data.assetTag!.toLowerCase(),
    );
    if (duplicate) {
      return res.status(409).json({ message: 'Asset tag already exists' });
    }
  }

  Object.assign(asset, {
    ...parsed.data,
    updatedAt: now(),
  });

  return res.json(asset);
});

app.delete('/api/assets/:id', (req: Request, res: Response) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;

  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Asset not found' });

  assets.splice(idx, 1);
  return res.status(204).send();
});

app.get('/api/stats', (_req: Request, res: Response) => {
  const total = assets.length;
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let totalValue = 0;

  for (const a of assets) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    byType[a.type] = (byType[a.type] || 0) + 1;
    totalValue += a.value ?? 0;
  }

  res.json({ total, byStatus, byType, totalValue });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
