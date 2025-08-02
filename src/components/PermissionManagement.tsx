import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Settings, Users, Shield } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const FEATURE_LABELS: Record<string, string> = {
  transactions: 'Transaksi',
  products: 'Produk',
  customers: 'Pelanggan', 
  materials: 'Bahan',
  employees: 'Karyawan',
  accounts: 'Akun Keuangan',
  expenses: 'Pengeluaran',
  advances: 'Panjar Karyawan',
  quotations: 'Penawaran',
  purchase_orders: 'Purchase Order'
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  supervisor: 'bg-green-100 text-green-800',
  cashier: 'bg-yellow-100 text-yellow-800',
  designer: 'bg-pink-100 text-pink-800',
  operator: 'bg-orange-100 text-orange-800'
};

export function PermissionManagement() {
  const { user } = useAuth();
  const { allUsersPermissions, isLoadingAllPermissions, setPermission } = usePermissions();
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  if (user?.role !== 'owner') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manajemen Permission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Fitur ini hanya dapat diakses oleh Owner.</p>
        </CardContent>
      </Card>
    );
  }

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const handlePermissionChange = async (
    userId: string,
    featureName: string,
    action: 'add' | 'edit' | 'delete' | 'view',
    value: boolean
  ) => {
    try {
      const userSetting = allUsersPermissions?.find(u => u.userId === userId);
      const currentPermission = userSetting?.permissions.find(p => p.featureName === featureName);
      
      if (!currentPermission) return;

      const updatedPermission = { ...currentPermission };
      switch (action) {
        case 'add': updatedPermission.canAdd = value; break;
        case 'edit': updatedPermission.canEdit = value; break;
        case 'delete': updatedPermission.canDelete = value; break;
        case 'view': updatedPermission.canView = value; break;
      }

      await setPermission.mutateAsync({
        userId,
        featureName,
        canAdd: updatedPermission.canAdd,
        canEdit: updatedPermission.canEdit,
        canDelete: updatedPermission.canDelete,
        canView: updatedPermission.canView,
      });

      toast.success('Permission berhasil diupdate');
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengupdate permission');
    }
  };

  if (isLoadingAllPermissions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manajemen Permission</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Memuat data permission...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Manajemen Permission Fitur
        </CardTitle>
        <CardDescription>
          Atur akses fitur (tambah, edit, hapus) untuk setiap karyawan. Hanya Owner yang dapat mengatur permission ini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allUsersPermissions?.map((userSetting) => (
            <Collapsible
              key={userSetting.userId}
              open={expandedUsers.has(userSetting.userId)}
              onOpenChange={() => toggleUserExpansion(userSetting.userId)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {expandedUsers.has(userSetting.userId) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Users className="h-4 w-4" />
                    <div>
                      <h3 className="font-semibold">{userSetting.userName}</h3>
                      <Badge className={ROLE_COLORS[userSetting.userRole] || 'bg-gray-100 text-gray-800'}>
                        {userSetting.userRole}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {userSetting.permissions.length} fitur
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fitur</TableHead>
                        <TableHead className="text-center">Lihat</TableHead>
                        <TableHead className="text-center">Tambah</TableHead>
                        <TableHead className="text-center">Edit</TableHead>
                        <TableHead className="text-center">Hapus</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userSetting.permissions.map((permission) => (
                        <TableRow key={permission.featureName}>
                          <TableCell className="font-medium">
                            {FEATURE_LABELS[permission.featureName] || permission.featureName}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canView}
                              onCheckedChange={(value) => 
                                handlePermissionChange(userSetting.userId, permission.featureName, 'view', value)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canAdd}
                              onCheckedChange={(value) => 
                                handlePermissionChange(userSetting.userId, permission.featureName, 'add', value)
                              }
                              disabled={!permission.canView}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canEdit}
                              onCheckedChange={(value) => 
                                handlePermissionChange(userSetting.userId, permission.featureName, 'edit', value)
                              }
                              disabled={!permission.canView}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canDelete}
                              onCheckedChange={(value) => 
                                handlePermissionChange(userSetting.userId, permission.featureName, 'delete', value)
                              }
                              disabled={!permission.canView}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}