import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface UserPermission {
  featureName: string;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
}

export interface PermissionSetting {
  userId: string;
  userName: string;
  userRole: string;
  permissions: UserPermission[];
}

export const usePermissions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  // Get current user's permissions
  const { data: myPermissions, isLoading: isLoadingMyPermissions } = useQuery<UserPermission[]>({
    queryKey: ['permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: user.id
      });
      
      if (error) throw new Error(error.message);
      
      return (data || []).map((item: any) => ({
        featureName: item.feature_name,
        canAdd: item.can_add,
        canEdit: item.can_edit,
        canDelete: item.can_delete,
        canView: item.can_view,
      }));
    },
    enabled: !!user?.id,
  });

  // Get all users permissions (only for owner)
  const { data: allUsersPermissions, isLoading: isLoadingAllPermissions } = useQuery<PermissionSetting[]>({
    queryKey: ['all_permissions'],
    queryFn: async () => {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('employees_view')
        .select('id, full_name, role');
      
      if (usersError) throw new Error(usersError.message);

      // Get all permissions
      const { data: permissions, error: permissionsError } = await supabase
        .from('feature_permissions')
        .select('user_id, feature_name, can_add, can_edit, can_delete, can_view');
      
      if (permissionsError) throw new Error(permissionsError.message);

      // Group permissions by user
      const userPermissions: PermissionSetting[] = users.map(user => {
        const userPerms = permissions.filter(p => p.user_id === user.id);
        return {
          userId: user.id,
          userName: user.full_name,
          userRole: user.role,
          permissions: userPerms.map(p => ({
            featureName: p.feature_name,
            canAdd: p.can_add,
            canEdit: p.can_edit,
            canDelete: p.can_delete,
            canView: p.can_view,
          }))
        };
      });

      return userPermissions;
    },
    enabled: user?.role === 'owner',
  });

  // Set permission mutation
  const setPermission = useMutation({
    mutationFn: async ({
      userId,
      featureName,
      canAdd,
      canEdit,
      canDelete,
      canView
    }: {
      userId: string;
      featureName: string;
      canAdd: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canView: boolean;
    }) => {
      const { error } = await supabase.rpc('set_user_permission', {
        p_user_id: userId,
        p_feature_name: featureName,
        p_can_add: canAdd,
        p_can_edit: canEdit,
        p_can_delete: canDelete,
        p_can_view: canView
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  // Helper function to check permission
  const hasPermission = (featureName: string, action: 'add' | 'edit' | 'delete' | 'view'): boolean => {
    // Fallback to true if permissions are not loaded yet or user is owner
    if (!user?.id) return false;
    if (user.role === 'owner') return true;
    if (!myPermissions || myPermissions.length === 0) return true; // Fallback for now
    
    const permission = myPermissions.find(p => p.featureName === featureName);
    if (!permission) return true; // Fallback for missing permission entries
    
    switch (action) {
      case 'add': return permission.canAdd;
      case 'edit': return permission.canEdit;
      case 'delete': return permission.canDelete;
      case 'view': return permission.canView;
      default: return false;
    }
  };

  return {
    myPermissions,
    allUsersPermissions,
    isLoadingMyPermissions,
    isLoadingAllPermissions,
    setPermission,
    hasPermission,
  };
};