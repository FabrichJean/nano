export interface Deployment {
  id: string;
  name: string;
  createdAt: string;
  path: string;
  status: 'active' | 'inactive';
  url: string;
  ownerId?: string;
}